import api from './api.js';

export const reporteService = {
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
