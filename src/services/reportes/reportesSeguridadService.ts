import api from '@/services/api';

export interface AlertaItem {
	tipo: string;
	severidad: 'alta' | 'media' | 'baja';
	referencia_id: string;
	fecha_evento: string;
	mensaje: string;
}

export interface AuditoriaItem {
	id: number;
	created_at: string;
	accion: string;
	detalle: Record<string, unknown> | null;
	usuario_id: number | null;
	usuario_nombre: string | null;
	embarque_id: number | null;
	numero_voucher: string | null;
}

export interface AlertasQuery {
	finca_id?: number;
	dias?: number;
	rechazo_min_pct?: number;
}

export interface AuditoriaQuery {
	fecha_desde?: string;
	fecha_hasta?: string;
	accion?: string;
	usuario_id?: number;
	finca_id?: number;
	limit?: number;
}

export interface FumigacionPayload {
	finca_id: number;
	fecha_fumigacion: string;
	observacion?: string;
}

export interface FumigacionItem {
	id: number;
	finca_id: number;
	finca_nombre: string;
	fecha_fumigacion: string;
	observacion: string | null;
	usuario_id: number | null;
	usuario_nombre: string | null;
	created_at: string;
}

export const reportesSeguridadService = {
	async getAlertas(params: AlertasQuery): Promise<AlertaItem[]> {
		const { data } = await api.get<AlertaItem[]>('/reportes/alertas', { params });
		return data;
	},

	async getAuditoria(params: AuditoriaQuery): Promise<AuditoriaItem[]> {
		const { data } = await api.get<AuditoriaItem[]>('/reportes/auditoria', { params });
		return data;
	},

	async registrarFumigacion(payload: FumigacionPayload): Promise<FumigacionItem> {
		const { data } = await api.post<FumigacionItem>('/reportes/fumigaciones', payload);
		return data;
	},

	async getFumigaciones(params: { finca_id?: number; limit?: number }): Promise<FumigacionItem[]> {
		const { data } = await api.get<FumigacionItem[]>('/reportes/fumigaciones', { params });
		return data;
	},
};
