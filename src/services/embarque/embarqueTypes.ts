export type EmbarqueEstado = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

export interface EmbarquePreliquidacionQuery {
	fecha: string; // YYYY-MM-DD
	finca_id?: number;
	finca_ids?: string;
}

export interface EmbarquePreliquidacionLinea {
	finca_id: number;
	finca_nombre: string;
	calendario_id: number | null;
	cinta_color: string;
	semana_enfunde: number | null;
	anio_enfunde: number | null;
	racimos_buenos: number;
	racimos_rechazo: number;
	total_racimos: number;
}

export interface EmbarquePreliquidacionResponse {
	fecha: string;
	lineas: EmbarquePreliquidacionLinea[];
	totales: {
		racimos_buenos: number;
		racimos_rechazo: number;
		total_racimos: number;
	};
}

export interface EmbarqueDetalleInput {
	finca_id: number;
	calendario_id?: number | null;
	cinta_color: string;
	semana_enfunde?: number | null;
	anio_enfunde?: number | null;
	racimos_buenos: number;
	racimos_rechazo: number;
	cajas_embarcadas: number;
}

export interface EmbarqueCreateRequest {
	id_local?: string;
	fecha_embarque: string;
	semana_corte?: number | null;
	observaciones?: string;
	detalles: EmbarqueDetalleInput[];
}

export interface EmbarqueUpdateRequest {
	observaciones?: string;
	detalles?: EmbarqueDetalleInput[];
}

export type EmbarqueAccionResponse = EmbarqueVoucher;

export interface EmbarqueConfirmResponse {
	duplicated: boolean;
	voucher: EmbarqueVoucher;
}

export interface EmbarqueVoucher {
	id: number;
	numero_voucher: string;
	fecha_embarque: string;
	semana_corte: number | null;
	estado: EmbarqueEstado;
	observaciones: string | null;
	motivo_anulacion: string | null;
	totales: {
		racimos_buenos: number;
		racimos_rechazo: number;
		total_racimos: number;
		total_cajas: number;
		ratio_comercial_global: number;
		ratio_operativo_global: number;
	};
	detalles: EmbarqueVoucherDetalle[];
	created_at: string;
	updated_at: string;
	confirmed_at: string | null;
	cancelled_at: string | null;
}

export interface EmbarqueVoucherDetalle {
	id: number;
	embarque_id: number;
	finca_id: number;
	finca_nombre?: string;
	calendario_id: number | null;
	cinta_color: string;
	semana_enfunde: number | null;
	anio_enfunde: number | null;
	racimos_buenos: number;
	racimos_rechazo: number;
	total_racimos: number;
	cajas_embarcadas: number;
	ratio_comercial_linea: number;
	ratio_operativo_linea: number;
}

export interface EmbarqueListQuery {
	fecha_desde?: string;
	fecha_hasta?: string;
	estado?: EmbarqueEstado;
	finca_id?: number;
	finca_ids?: string;
	numero_voucher?: string;
	numero_voucher_exacto?: boolean;
}

export interface EmbarqueListItem {
	id: number;
	numero_voucher: string;
	fecha_embarque: string;
	estado: EmbarqueEstado;
	total_racimos: number;
	total_cajas: number;
	ratio_comercial_global: number;
}

export interface EmbarqueListResponse {
	items: EmbarqueListItem[];
	total: number;
}

export interface EmbarqueConfirmRequest {
	id_local: string;
}

export interface EmbarqueAnularRequest {
	motivo_anulacion: string;
}
