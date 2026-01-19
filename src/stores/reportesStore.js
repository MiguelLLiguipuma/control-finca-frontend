import { defineStore } from 'pinia';
import { reporteService } from '../services/reporteService.js';
import { useEnfundeStore } from './enfundeStore.js';
import { useUIStore } from './uiStore.js';

export const useReportesStore = defineStore('reportes', {
	state: () => ({
		loading: false,
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
	}),

	actions: {
		async actualizarPeriodo(nuevoAnio, fincaId = null) {
			this.anioSeleccionado = nuevoAnio;
			const enfundeStore = useEnfundeStore();
			enfundeStore.anioSeleccionado = nuevoAnio;
			await this.cargarReportes(fincaId);
		},

		async cargarReportes(fincaId) {
			if (!fincaId) return;

			const uiStore = useUIStore();
			const enfundeStore = useEnfundeStore();

			this.loading = true;
			this.error = null;

			try {
				const anio = this.anioSeleccionado;
				const anioAnterior = anio - 1;
				enfundeStore.anioSeleccionado = anio;

				// 1. LLAMADA AL SERVICIO (Separamos la obtención de datos)
				const [
					totalAnualResp,
					totalMensualActualResp,
					rendimientoCintasResp,
					mejorSemanaResp,
					promedioSemanalResp,
					totalSemanalResp,
				] = await reporteService.getDashboardData(fincaId, anio);

				let mesesAnterior = [];
				if (this.mostrarComparativo) {
					const resp = await reporteService.getComparativo(
						fincaId,
						anioAnterior,
					);
					mesesAnterior = resp.data || [];
				}

				// 2. EXTRACCIÓN DE DATOS
				const mesesActual = totalMensualActualResp.data || [];
				const cintas = rendimientoCintasResp.data || [];
				const semanasActual = totalSemanalResp.data || [];

				/* =============================
           PROCESAMIENTO DE LÓGICA
        ============================= */

				// Totales y Promedios
				const totalAnualNum = Number(totalAnualResp.data[0]?.total_fundas || 0);
				const totalMeses = mesesActual.reduce(
					(acc, m) => acc + Number(m.total_mes || 0),
					0,
				);
				const promedioMensual = mesesActual.length
					? Math.round(totalMeses / mesesActual.length)
					: 0;
				const promedioSemanal = Number(
					promedioSemanalResp.data[0]?.promedio_semanal || 0,
				);
				const mejorSemana = mejorSemanaResp.data[0]?.semana || 'N/A';

				// Configuración de Tarjetas
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

				// Lógica de Gráfico Mensual
				const mesesMaestros = [
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
				this.chartCategories = mesesMaestros;

				const seriesMensual = [];
				if (this.mostrarComparativo) {
					seriesMensual.push({
						name: `Año ${anioAnterior}`,
						data: mesesMaestros.map((m) =>
							Number(
								mesesAnterior.find((x) => x.mes?.trim() === m)?.total_mes || 0,
							),
						),
					});
				}
				seriesMensual.push({
					name: `Año ${anio}`,
					data: mesesMaestros.map((m) =>
						Number(
							mesesActual.find((x) => x.mes?.trim() === m)?.total_mes || 0,
						),
					),
				});
				this.chartSeries = seriesMensual;

				// Lógica de Gráfico Semanal
				this.chartCategoriesSemanal = semanasActual.map(
					(s) => `Sem. ${s.semana}`,
				);
				this.chartSeriesSemanal = [
					{
						name: `Producción ${anio}`,
						data: semanasActual.map((s) => Number(s.total_semana || 0)),
					},
				];

				// Estadísticas laterales
				this.sideStats = [
					{ label: 'Fundas Totales', value: totalAnualNum, change: 0 },
					{ label: 'Promedio Mensual', value: promedioMensual, change: 0 },
					{ label: 'Promedio Semanal', value: promedioSemanal, change: 0 },
				];

				this.cintasStats = cintas.map((c) => ({
					nombre: c.color,
					total: Number(c.total_fundas || 0),
				}));

				if (totalAnualNum === 0)
					uiStore.showWarning(`No hay datos para el año ${anio}`);

				await enfundeStore.cargarRegistros(fincaId);
			} catch (err) {
				console.error('❌ Error en cargarReportes:', err);
				this.error = err.message;
				uiStore.showError('Error al conectar con el servidor de reportes');
			} finally {
				this.loading = false;
			}
		},
	},
});
