import api from './api.js';

const withParams = (modo, scope) => {
	const params = {};
	if (modo === 'ytd') params.modo = 'ytd';
	if (scope === 'propio' || scope === 'finca') params.scope = scope;
	return Object.keys(params).length ? { params } : undefined;
};

export const reporteService = {
	getKpisData(fincaId, anio, modo = 'full', scope = 'finca') {
		const config = withParams(modo, scope);
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`, config),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`, config),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`, config),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`, config),
		]);
	},

	getMensual(fincaId, anio, modo = 'full', scope = 'finca') {
		return api.get(
			`/reportes/total-mensual/${fincaId}/${anio}`,
			withParams(modo, scope),
		);
	},

	getSemanal(fincaId, anio, modo = 'full', scope = 'finca') {
		return api.get(
			`/reportes/total-semanal/${fincaId}/${anio}`,
			withParams(modo, scope),
		);
	},

	getRendimientoCintas(fincaId, anio, modo = 'full', scope = 'finca') {
		return api.get(
			`/reportes/rendimiento-cintas/${fincaId}/${anio}`,
			withParams(modo, scope),
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

	getComparativo(fincaId, anioAnterior, modo = 'full', scope = 'finca') {
		return api.get(
			`/reportes/total-mensual/${fincaId}/${anioAnterior}`,
			withParams(modo, scope),
		);
	},
};
