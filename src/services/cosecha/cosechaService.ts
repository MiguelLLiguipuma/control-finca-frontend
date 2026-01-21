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
	usuario_id: number;
	timestamp: number;
	detalles: DetalleEnvio[];
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
		const response = await api.post('/cosecha/registrar-liquidacion', payload);
		return response.data;
	},
};
