import api from './api.js';

const withModo = (modo) => (modo === 'ytd' ? { params: { modo: 'ytd' } } : undefined);

export const reporteService = {
	getKpisData(fincaId, anio, modo = 'full') {
		const config = withModo(modo);
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`, config),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`, config),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`, config),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`, config),
		]);
	},

	getMensual(fincaId, anio, modo = 'full') {
		return api.get(`/reportes/total-mensual/${fincaId}/${anio}`, withModo(modo));
	},

	getSemanal(fincaId, anio, modo = 'full') {
		return api.get(`/reportes/total-semanal/${fincaId}/${anio}`, withModo(modo));
	},

	getRendimientoCintas(fincaId, anio, modo = 'full') {
		return api.get(
			`/reportes/rendimiento-cintas/${fincaId}/${anio}`,
			withModo(modo),
		);
	},

	getDashboardData(fincaId, anio) {
		// Agrupamos las peticiones relacionadas
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`),
			api.get(`/reportes/rendimiento-cintas/${fincaId}/${anio}`),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`),
			api.get(`/reportes/total-semanal/${fincaId}/${anio}`),
		]);
	},

	getComparativo(fincaId, anioAnterior, modo = 'full') {
		return api.get(
			`/reportes/total-mensual/${fincaId}/${anioAnterior}`,
			withModo(modo),
		);
	},
};
