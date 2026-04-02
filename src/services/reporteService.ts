import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import api from './api';

type ModoReporte = 'full' | 'ytd';
type ScopeReporte = 'finca' | 'propio';
type QueryParams = Record<string, string | number>;

const withParams = (
	modo: ModoReporte,
	scope: ScopeReporte,
): AxiosRequestConfig<QueryParams> | undefined => {
	const params: QueryParams = {};
	if (modo === 'ytd') params.modo = 'ytd';
	if (scope === 'propio' || scope === 'finca') params.scope = scope;
	return Object.keys(params).length ? { params } : undefined;
};

export const reporteService = {
	getKpisData(
		fincaId: number,
		anio: number,
		modo: ModoReporte = 'full',
		scope: ScopeReporte = 'finca',
	): Promise<AxiosResponse[]> {
		const config = withParams(modo, scope);
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`, config),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`, config),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`, config),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`, config),
		]);
	},

	getMensual(
		fincaId: number,
		anio: number,
		modo: ModoReporte = 'full',
		scope: ScopeReporte = 'finca',
	) {
		return api.get(
			`/reportes/total-mensual/${fincaId}/${anio}`,
			withParams(modo, scope),
		);
	},

	getSemanal(
		fincaId: number,
		anio: number,
		modo: ModoReporte = 'full',
		scope: ScopeReporte = 'finca',
	) {
		return api.get(
			`/reportes/total-semanal/${fincaId}/${anio}`,
			withParams(modo, scope),
		);
	},

	getRendimientoCintas(
		fincaId: number,
		anio: number,
		modo: ModoReporte = 'full',
		scope: ScopeReporte = 'finca',
	) {
		return api.get(
			`/reportes/rendimiento-cintas/${fincaId}/${anio}`,
			withParams(modo, scope),
		);
	},

	getDashboardData(fincaId: number, anio: number): Promise<AxiosResponse[]> {
		return Promise.all([
			api.get(`/reportes/total-anual/${fincaId}/${anio}`),
			api.get(`/reportes/total-mensual/${fincaId}/${anio}`),
			api.get(`/reportes/rendimiento-cintas/${fincaId}/${anio}`),
			api.get(`/reportes/mejor-semana/${fincaId}/${anio}`),
			api.get(`/reportes/promedio-semanal-finca/${fincaId}/${anio}`),
			api.get(`/reportes/total-semanal/${fincaId}/${anio}`),
		]);
	},

	getComparativo(
		fincaId: number,
		anioAnterior: number,
		modo: ModoReporte = 'full',
		scope: ScopeReporte = 'finca',
	) {
		return api.get(
			`/reportes/total-mensual/${fincaId}/${anioAnterior}`,
			withParams(modo, scope),
		);
	},

	getScoreSalud(
		fincaId: number,
		anio: number,
		semana: number | null = null,
		refresh = false,
	) {
		const params: QueryParams = {};
		if (Number.isInteger(Number(semana)) && Number(semana) > 0) {
			params.semana = Number(semana);
		}
		if (refresh) params.refresh = 'true';
		return api.get(`/reportes/score-salud/${fincaId}/${anio}`, {
			params,
		});
	},
};
