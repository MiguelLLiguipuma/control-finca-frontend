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

export interface PrediccionCosechaResponse {
	finca_id: string | number;
	meta_aplicada: number;
	promedio_climatico_semanal: string;
	promedio_uc_diario?: string;
	ratio_aplicado?: number;
	semana_inicio?: number;
	semana_fin?: number;
	proyecciones: PrediccionCosechaItem[];
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
