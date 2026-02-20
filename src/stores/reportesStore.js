import { defineStore } from 'pinia';
import { reporteService } from '../services/reporteService.js';
import { useUIStore } from './uiStore.js';

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
const dashboardCache = new Map();

const getCacheKey = (fincaId, anio, comparativo) =>
	`${Number(fincaId)}:${Number(anio)}:${comparativo ? 1 : 0}`;

const isCacheFresh = (entry) =>
	entry &&
	typeof entry.timestamp === 'number' &&
	Date.now() - entry.timestamp <= CACHE_TTL_MS;

export const useReportesStore = defineStore('reportes', {
	state: () => ({
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
		mostrarComparativo: false,
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

		applySnapshot(snapshot) {
			this.tarjetas = snapshot.tarjetas || [];
			this.chartSeries = snapshot.chartSeries || [];
			this.chartCategories = snapshot.chartCategories || [];
			this.chartSeriesSemanal = snapshot.chartSeriesSemanal || [];
			this.chartCategoriesSemanal = snapshot.chartCategoriesSemanal || [];
			this.sideStats = snapshot.sideStats || [];
			this.cintasStats = snapshot.cintasStats || [];
		},

		createSnapshot() {
			return {
				tarjetas: this.tarjetas,
				chartSeries: this.chartSeries,
				chartCategories: this.chartCategories,
				chartSeriesSemanal: this.chartSeriesSemanal,
				chartCategoriesSemanal: this.chartCategoriesSemanal,
				sideStats: this.sideStats,
				cintasStats: this.cintasStats,
			};
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
			const cacheKey = getCacheKey(fincaId, anio, this.mostrarComparativo);
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

				const [totalAnualResp, totalMensualKpiResp, mejorSemanaResp, promedioSemanalResp] =
					await reporteService.getKpisData(fincaId, anio);

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
					{ title: 'Total Anual', value: totalAnualNum, icon: 'mdi-calendar' },
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
					{ label: 'Fundas Totales', value: totalAnualNum, change: 0 },
					{ label: 'Promedio Mensual', value: promedioMensual, change: 0 },
					{ label: 'Promedio Semanal', value: promedioSemanal, change: 0 },
				];

				if (totalAnualNum === 0) {
					uiStore.showWarning(`No hay datos para el año ${anio}`);
				}

				this.loadingKpis = false;
				this.actualizarLoadingGlobal();

				const mensualPromise = (async () => {
					const mensualResp = await reporteService.getMensual(fincaId, anio);
					if (requestId !== this.requestSeq) return;
					const mesesActual = mensualResp.data || [];

					let mesesAnterior = [];
					if (this.mostrarComparativo) {
						const compResp = await reporteService.getComparativo(
							fincaId,
							anioAnterior,
						);
						mesesAnterior = compResp.data || [];
					}

					this.chartCategories = MESES_MAESTROS;
					const seriesMensual = [];
					if (this.mostrarComparativo) {
						seriesMensual.push({
							name: `Año ${anioAnterior}`,
							data: MESES_MAESTROS.map((m) =>
								toNumber(
									mesesAnterior.find((x) => x.mes?.trim() === m)?.total_mes,
								),
							),
						});
					}
					seriesMensual.push({
						name: `Año ${anio}`,
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

				const semanalPromise = reporteService
					.getSemanal(fincaId, anio)
					.then((resp) => {
						if (requestId !== this.requestSeq) return;
						const semanasActual = resp.data || [];
						this.chartCategoriesSemanal = semanasActual.map(
							(s) => `Sem. ${s.semana}`,
						);
						this.chartSeriesSemanal = [
							{
								name: `Producción ${anio}`,
								data: semanasActual.map((s) => toNumber(s.total_semana)),
							},
						];
					})
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
					.getRendimientoCintas(fincaId, anio)
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
				console.error('❌ Error en cargarReportes:', err);
				this.error =
					err?.response?.data?.error || err.message || 'Error cargando reportes';
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
