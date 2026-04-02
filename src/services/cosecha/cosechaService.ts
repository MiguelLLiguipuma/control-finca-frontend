import api from '../api';

// --- 1. DEFINICIÓN DE DATOS QUE RECIBIMOS (Lectura) ---
// Esta interfaz representa una fila exacta de tu vista SQL.
// Ponemos 'string | number' en algunos campos porque a veces las APIs
// devuelven números como texto ("2025") y TypeScript es estricto con eso.
export interface BackendCinta {
	calendario_id: number;
	semana_enfunde: number | string;
	saldo_en_campo: number | string;
	color_cinta: string;
	color_hex: string;
	// El backend podría mandar 'anio', 'year' o 'año'. Los marcamos opcionales (?)
	anio?: number | string;
	year?: number | string;
	año?: number | string;
}

// --- 2. DEFINICIÓN DE DATOS QUE ENVIAMOS (Escritura) ---

// El detalle de cada cinta cosechada
export interface DetalleEnvio {
	calendario_id: number;
	cantidad_racimos: number;
	cantidad_rechazo: number;
}

// El paquete completo que mandamos al servidor
export interface PayloadCosecha {
	id_local: string; // UUID para control offline
	finca_id: number;
	fecha: string; // "YYYY-MM-DD"
	timestamp: number;
	detalles: DetalleEnvio[];
}

export interface PrediccionCosechaItem {
	calendario_id: number;
	semana_enfunde: number;
	anio: number;
	color_cinta: string;
	color_hex: string;
	saldo_en_campo: number;
	progreso_madurez: number;
	dias_faltantes: number;
	fecha_estimada: string;
	cajas_esperadas: number;
	mensaje_clima: string;
	tendencia_climatica: string;
}

export interface PrediccionProximoEmbarque {
	anio_objetivo: number;
	semana_objetivo: number;
	racimos_estimados: number;
	rango_minimo: number;
	rango_maximo: number;
	racimos_rango_ideal: number;
	racimos_en_riesgo: number;
	rechazo_estimado_pct: number;
	edad_promedio_corte: number;
	tendencia: string;
	confianza: string;
	sigma: number;
	factor_estacional: number;
	metodo: string;
}

export interface PrediccionModeloInfo {
	version: string;
	semanas_analizadas: number;
	baseline_ponderado?: number;
	tendencia_slope?: number;
	proyeccion_lineal?: number;
	coef_variacion?: number;
	considera_estacionalidad?: boolean;
	considera_rechazo?: boolean;
	considera_edad_corte?: boolean;
	mensaje?: string;
}

export interface PrediccionCacheInfo {
	hit: boolean;
	algoritmo_version: string;
	ventana_historial: number;
}

export interface PrediccionCosechaResponse {
	finca_id: string | number;
	meta_aplicada: number;
	promedio_climatico_semanal: string;
	promedio_uc_diario?: string;
	ratio_aplicado?: number;
	semana_inicio?: number;
	semana_fin?: number;
	proyecciones: PrediccionCosechaItem[];
	prediccion_proximo_embarque?: PrediccionProximoEmbarque;
	modelo?: PrediccionModeloInfo;
	cache?: PrediccionCacheInfo;
}

export interface PrediccionMultiResumenItem {
	racimos: number;
	rangoMin: number;
	rangoMax: number;
	ideal: number;
	riesgo: number;
	rechazoPct: number;
	confianza: string;
}

export interface PrediccionMultiItem {
	finca_id: number;
	finca_nombre?: string | null;
	empresa_nombre?: string | null;
	ok: boolean;
	error?: string;
	resumen?: PrediccionMultiResumenItem;
	data?: PrediccionCosechaResponse;
}

export interface PrediccionMultiConsolidado {
	racimos_estimados_total: number;
	rango_minimo_total: number;
	rango_maximo_total: number;
	racimos_ideal_total: number;
	racimos_riesgo_total: number;
	rechazo_ponderado_pct: number;
	confianza_global: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface PrediccionMultiResponse {
	finca_ids: number[];
	total_solicitadas: number;
	total_exitosas: number;
	total_fallidas: number;
	consolidado: PrediccionMultiConsolidado;
	items: PrediccionMultiItem[];
}

export interface FechasOcupadasQuery {
	finca_id?: number;
	finca_ids?: string;
	fecha_desde?: string;
	fecha_hasta?: string;
}

export interface FechaOcupadaItem {
	fecha: string;
	cosecha: boolean;
	voucher: boolean;
}

export interface FechasOcupadasResponse {
	finca_ids: number[];
	fecha_desde: string;
	fecha_hasta: string;
	fechas: FechaOcupadaItem[];
}

export const cosechaService = {
	// Obtiene el balance. Le decimos a TS que la promesa devuelve un array de BackendCinta
	async getBalance(fincaId: number): Promise<BackendCinta[]> {
		const response = await api.get<BackendCinta[]>(
			`/cosecha/balance/${fincaId}`,
		);
		return response.data;
	},

	// Envía la liquidación.
	// Omitimos 'id_local' si tu backend no lo espera, o lo enviamos completo si lo necesita para logs.
	// Aquí asumo que envías todo el payload.
	async registrarLiquidacion(payload: PayloadCosecha): Promise<any> {
		const response = await api.post('/cosecha/registrar-liquidacion', payload, {
			skipGlobalError: true,
		} as any);
		return response.data;
	},

	async getPrediccion(fincaId: number): Promise<PrediccionCosechaResponse> {
		const response = await api.get<PrediccionCosechaResponse>(
			`/cosecha/prediccion/${fincaId}`,
		);
		return response.data;
	},

	async getPrediccionMulti(
		fincaIds: number[],
	): Promise<PrediccionMultiResponse> {
		const ids = Array.from(new Set((fincaIds || []).map(Number))).filter(
			(n) => Number.isInteger(n) && n > 0,
		);
		const response = await api.get<PrediccionMultiResponse>(
			'/cosecha/prediccion-multi',
			{
				params: {
					finca_ids: ids.join(','),
				},
			},
		);
		return response.data;
	},

	async getFechasOcupadas(
		params: FechasOcupadasQuery,
	): Promise<FechasOcupadasResponse> {
		const response = await api.get<
			| FechasOcupadasResponse
			| { success?: boolean; data?: FechasOcupadasResponse }
		>('/cosecha/fechas-ocupadas', {
			params,
		});
		const payload = response.data as
			| FechasOcupadasResponse
			| { success?: boolean; data?: FechasOcupadasResponse };
		return (payload as any).data || (payload as FechasOcupadasResponse);
	},
};
