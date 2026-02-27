import { defineStore } from 'pinia';
import { reporteService } from '../services/reporteService.js';
import { useUIStore } from './uiStore.js';

interface TarjetaReporte {
	title: string;
	value: number | string;
	icon: string;
}

interface SerieChart {
	name: string;
	data: number[];
}

interface SideStat {
	label: string;
	value: number | string;
	change?: number;
}

interface CintaStat {
	nombre: string;
	total: number;
}

interface DashboardSnapshot {
	tarjetas: TarjetaReporte[];
	chartSeries: SerieChart[];
	chartCategories: string[];
	chartSeriesSemanal: SerieChart[];
	chartCategoriesSemanal: string[];
	sideStats: SideStat[];
	cintasStats: CintaStat[];
}

interface DashboardCacheEntry {
	timestamp: number;
	data: DashboardSnapshot;
}

interface MensualRow {
	mes?: string;
	total_mes?: number | string;
}

interface SemanalRow {
	semana?: number | string;
	total_semana?: number | string;
}

interface ReportesState extends DashboardSnapshot {
	loading: boolean;
	loadingKpis: boolean;
	loadingMensual: boolean;
	loadingSemanal: boolean;
	loadingCintas: boolean;
	error: string | null;
	anioSeleccionado: number;
	modoComparativo: 'actual' | 'comparativo' | 'ytd';
	requestSeq: number;
}

const MESES_MAESTROS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const toNumber = (value, fallback = 0) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
};

const CACHE_TTL_MS = 60 * 1000;
const dashboardCache = new Map<string, DashboardCacheEntry>();

const getCacheKey = (fincaId, anio, modoComparativo) =>
	`${Number(fincaId)}:${Number(anio)}:${String(modoComparativo || 'actual')}`;

const isCacheFresh = (
	entry: DashboardCacheEntry | undefined,
): entry is DashboardCacheEntry =>
	!!entry &&
	typeof entry.timestamp === 'number' &&
	Date.now() - entry.timestamp <= CACHE_TTL_MS;

const cloneSnapshot = (snapshot: DashboardSnapshot): DashboardSnapshot => ({
	tarjetas: (snapshot.tarjetas || []).map((t) => ({ ...t })),
	chartSeries: (snapshot.chartSeries || []).map((s) => ({
		name: s.name,
		data: [...(s.data || [])],
	})),
	chartCategories: [...(snapshot.chartCategories || [])],
	chartSeriesSemanal: (snapshot.chartSeriesSemanal || []).map((s) => ({
		name: s.name,
		data: [...(s.data || [])],
	})),
	chartCategoriesSemanal: [...(snapshot.chartCategoriesSemanal || [])],
	sideStats: (snapshot.sideStats || []).map((s) => ({ ...s })),
	cintasStats: (snapshot.cintasStats || []).map((c) => ({ ...c })),
});

export const useReportesStore = defineStore('reportes', {
	state: (): ReportesState => ({
		loading: false,
		loadingKpis: false,
		loadingMensual: false,
		loadingSemanal: false,
		loadingCintas: false,
		error: null,
		tarjetas: [],
		chartSeries: [],
		chartCategories: [],
		chartSeriesSemanal: [],
		chartCategoriesSemanal: [],
		sideStats: [],
		cintasStats: [],
		anioSeleccionado: new Date().getFullYear(),
		modoComparativo: 'actual',
		requestSeq: 0,
	}),

	actions: {
		actualizarLoadingGlobal() {
			this.loading =
				this.loadingKpis ||
				this.loadingMensual ||
				this.loadingSemanal ||
				this.loadingCintas;
		},

		resetDashboardData() {
			this.tarjetas = [];
			this.chartSeries = [];
			this.chartCategories = [];
			this.chartSeriesSemanal = [];
			this.chartCategoriesSemanal = [];
			this.sideStats = [];
			this.cintasStats = [];
		},

		resetLoadingFlags() {
			this.loadingKpis = false;
			this.loadingMensual = false;
			this.loadingSemanal = false;
			this.loadingCintas = false;
			this.actualizarLoadingGlobal();
		},

	applySnapshot(snapshot: DashboardSnapshot) {
			const safe = cloneSnapshot(snapshot);
			this.tarjetas = safe.tarjetas;
			this.chartSeries = safe.chartSeries;
			this.chartCategories = safe.chartCategories;
			this.chartSeriesSemanal = safe.chartSeriesSemanal;
			this.chartCategoriesSemanal = safe.chartCategoriesSemanal;
			this.sideStats = safe.sideStats;
			this.cintasStats = safe.cintasStats;
		},

	createSnapshot(): DashboardSnapshot {
			return cloneSnapshot({
				tarjetas: this.tarjetas,
				chartSeries: this.chartSeries,
				chartCategories: this.chartCategories,
				chartSeriesSemanal: this.chartSeriesSemanal,
				chartCategoriesSemanal: this.chartCategoriesSemanal,
				sideStats: this.sideStats,
				cintasStats: this.cintasStats,
			});
		},

		async actualizarPeriodo(nuevoAnio, fincaId = null) {
			this.anioSeleccionado = nuevoAnio;
			await this.cargarReportes(fincaId);
		},

		async cargarReportes(fincaId) {
			if (!fincaId) {
				this.resetDashboardData();
				return;
			}

			const uiStore = useUIStore();
			const anio = this.anioSeleccionado;
			const cacheKey = getCacheKey(fincaId, anio, this.modoComparativo);
			const cacheEntry = dashboardCache.get(cacheKey);

			// Cache caliente: respuesta instantánea sin bloquear UI.
			if (isCacheFresh(cacheEntry)) {
				this.error = null;
				this.applySnapshot(cacheEntry.data);
				this.resetLoadingFlags();
				return;
			}

			const requestId = ++this.requestSeq;

			this.error = null;
			this.loadingKpis = true;
			this.loadingMensual = true;
			this.loadingSemanal = true;
			this.loadingCintas = true;
			this.actualizarLoadingGlobal();

			try {
				const anioAnterior = anio - 1;
				const modoApi = this.modoComparativo === 'ytd' ? 'ytd' : 'full';
				const incluirComparativo = this.modoComparativo !== 'actual';

				const [totalAnualResp, totalMensualKpiResp, mejorSemanaResp, promedioSemanalResp] =
					await reporteService.getKpisData(fincaId, anio, modoApi);

				if (requestId !== this.requestSeq) return;

				const mesesKpi = totalMensualKpiResp.data || [];
				const totalAnualNum = toNumber(totalAnualResp.data?.[0]?.total_fundas);
				const totalMeses = mesesKpi.reduce(
					(acc, m) => acc + toNumber(m.total_mes),
					0,
				);
				const promedioMensual = mesesKpi.length
					? Math.round(totalMeses / mesesKpi.length)
					: 0;
				const promedioSemanal = toNumber(
					promedioSemanalResp.data?.[0]?.promedio_semanal,
				);
				const mejorSemana = mejorSemanaResp.data?.[0]?.semana ?? 'N/A';

				this.tarjetas = [
					{
						title: this.modoComparativo === 'ytd' ? 'Total YTD' : 'Total Anual',
						value: totalAnualNum,
						icon: 'mdi-calendar',
					},
					{
						title: 'Promedio Mensual',
						value: promedioMensual,
						icon: 'mdi-calendar-month',
					},
					{
						title: 'Promedio Semanal',
						value: promedioSemanal,
						icon: 'mdi-calendar-week',
					},
					{
						title: 'Mejor Semana',
						value: mejorSemana,
						icon: 'mdi-calendar-star',
					},
				];

				this.sideStats = [
					{
						label:
							this.modoComparativo === 'ytd'
								? 'Fundas Totales YTD'
								: 'Fundas Totales',
						value: totalAnualNum,
						change: 0,
					},
					{ label: 'Promedio Mensual', value: promedioMensual, change: 0 },
					{ label: 'Promedio Semanal', value: promedioSemanal, change: 0 },
				];

				if (totalAnualNum === 0) {
					uiStore.showWarning(`No hay datos para el año ${anio}`);
				}

				this.loadingKpis = false;
				this.actualizarLoadingGlobal();

				const mensualPromise = (async () => {
					const mensualResp = await reporteService.getMensual(
						fincaId,
						anio,
						modoApi,
					);
					if (requestId !== this.requestSeq) return;
					const mesesActual: MensualRow[] = mensualResp.data || [];

					let mesesAnterior: MensualRow[] = [];
					if (incluirComparativo) {
						const compResp = await reporteService.getComparativo(
							fincaId,
							anioAnterior,
							modoApi,
						);
						mesesAnterior = compResp.data || [];
					}

					this.chartCategories = MESES_MAESTROS;
					const seriesMensual: SerieChart[] = [];
					if (incluirComparativo) {
						seriesMensual.push({
							name:
								this.modoComparativo === 'ytd'
									? `Año ${anioAnterior} (YTD)`
									: `Año ${anioAnterior}`,
							data: MESES_MAESTROS.map((m) =>
								toNumber(
									mesesAnterior.find((x) => x.mes?.trim() === m)?.total_mes,
								),
							),
						});
					}
					seriesMensual.push({
						name:
							this.modoComparativo === 'ytd'
								? `Año ${anio} (YTD)`
								: `Año ${anio}`,
						data: MESES_MAESTROS.map((m) =>
							toNumber(mesesActual.find((x) => x.mes?.trim() === m)?.total_mes),
						),
					});
					this.chartSeries = seriesMensual;
				})()
					.catch((e) => {
						if (requestId !== this.requestSeq) return;
						console.error('❌ Error mensual:', e);
						this.chartSeries = [];
						this.chartCategories = [];
					})
					.finally(() => {
						if (requestId !== this.requestSeq) return;
						this.loadingMensual = false;
						this.actualizarLoadingGlobal();
					});

				const semanalPromise = (async () => {
					const respActual = await reporteService.getSemanal(fincaId, anio, modoApi);
					if (requestId !== this.requestSeq) return;
					const semanasActual: SemanalRow[] = respActual.data || [];

					let semanasAnterior: SemanalRow[] = [];
					if (incluirComparativo) {
						try {
							const respAnterior = await reporteService.getSemanal(
								fincaId,
								anioAnterior,
								modoApi,
							);
							semanasAnterior = respAnterior.data || [];
						} catch (e) {
							// Fallback robusto: si falla comparativo, mantenemos serie del año actual.
							console.warn('⚠️ Semanal comparativo no disponible, se muestra solo año actual.', e);
							semanasAnterior = [];
						}
					}

					const semanasSet = new Set<number>();
					for (const s of semanasActual) semanasSet.add(Number(s.semana) || 0);
					for (const s of semanasAnterior) semanasSet.add(Number(s.semana) || 0);
					const semanasOrdenadas = Array.from(semanasSet)
						.filter((s) => s > 0)
						.sort((a, b) => a - b);

					const mapaActual = new Map<number, number>();
					for (const s of semanasActual) {
						mapaActual.set(Number(s.semana) || 0, toNumber(s.total_semana));
					}

					const mapaAnterior = new Map<number, number>();
					for (const s of semanasAnterior) {
						mapaAnterior.set(Number(s.semana) || 0, toNumber(s.total_semana));
					}

					this.chartCategoriesSemanal = semanasOrdenadas.map((s) => `Sem. ${s}`);
					const seriesSemanal: SerieChart[] = [];

					if (incluirComparativo) {
						seriesSemanal.push({
							name:
								this.modoComparativo === 'ytd'
									? `Producción ${anioAnterior} (YTD)`
									: `Producción ${anioAnterior}`,
							data: semanasOrdenadas.map((s) => toNumber(mapaAnterior.get(s))),
						});
					}

					seriesSemanal.push({
						name:
							this.modoComparativo === 'ytd'
								? `Producción ${anio} (YTD)`
								: `Producción ${anio}`,
						data: semanasOrdenadas.map((s) => toNumber(mapaActual.get(s))),
					});

					this.chartSeriesSemanal = seriesSemanal;
				})()
					.catch((e) => {
						if (requestId !== this.requestSeq) return;
						console.error('❌ Error semanal:', e);
						this.chartSeriesSemanal = [];
						this.chartCategoriesSemanal = [];
					})
					.finally(() => {
						if (requestId !== this.requestSeq) return;
						this.loadingSemanal = false;
						this.actualizarLoadingGlobal();
					});

				const cintasPromise = reporteService
					.getRendimientoCintas(fincaId, anio, modoApi)
					.then((resp) => {
						if (requestId !== this.requestSeq) return;
						const cintas = resp.data || [];
						this.cintasStats = cintas.map((c) => ({
							nombre: c.color,
							total: toNumber(c.total_fundas),
						}));
					})
					.catch((e) => {
						if (requestId !== this.requestSeq) return;
						console.error('❌ Error cintas:', e);
						this.cintasStats = [];
					})
					.finally(() => {
						if (requestId !== this.requestSeq) return;
						this.loadingCintas = false;
						this.actualizarLoadingGlobal();
					});

				await Promise.allSettled([mensualPromise, semanalPromise, cintasPromise]);

				if (requestId === this.requestSeq) {
					dashboardCache.set(cacheKey, {
						timestamp: Date.now(),
						data: this.createSnapshot(),
					});
				}
			} catch (err) {
				const e = err as {
					response?: { data?: { error?: string } };
					message?: string;
				};
				console.error('❌ Error en cargarReportes:', err);
				this.error =
					e?.response?.data?.error ||
					e?.message ||
					'Error cargando reportes';
				this.resetDashboardData();
				uiStore.showError('Error al conectar con el servidor de reportes');
			} finally {
				if (requestId === this.requestSeq) {
					this.resetLoadingFlags();
				}
			}
		},
	},
});
