import api from './api.js';

export const reporteService = {
	getKpisData(fincaId, anio) {
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`),
		]);
	},

	getMensual(fincaId, anio) {
		return api.get(`/reportes/total-mensual/${fincaId}/${anio}`);
	},

	getSemanal(fincaId, anio) {
		return api.get(`/reportes/total-semanal/${fincaId}/${anio}`);
	},

	getRendimientoCintas(fincaId, anio) {
		return api.get(`/reportes/rendimiento-cintas/${fincaId}/${anio}`);
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

	getComparativo(fincaId, anioAnterior) {
		return api.get(`/reportes/total-mensual/${fincaId}/${anioAnterior}`);
	},
};
