import api from '@/services/api';

export type AlertaSeveridad = 'baja' | 'media' | 'alta' | 'critica';
export type AlertaEstado = 'pendiente' | 'enviada' | 'leida' | 'resuelta' | 'silenciada';

export interface AlertaOperativa {
	id: number;
	empresa_id: number | null;
	finca_id: number | null;
	finca_nombre: string | null;
	tipo: string;
	severidad: AlertaSeveridad;
	titulo: string;
	mensaje: string;
	entidad_tipo: string | null;
	entidad_id: string | null;
	metadata: Record<string, unknown>;
	estado: AlertaEstado;
	detectada_en: string;
	enviada_en: string | null;
	leida_en: string | null;
	resuelta_en: string | null;
	estado_destinatario: string | null;
	canal: string | null;
}

export interface AlertasResumen {
	abiertas: number;
	pendientes: number;
	criticas: number;
	altas: number;
}

export interface AlertasQuery {
	estado?: string;
	finca_id?: number;
	finca_ids?: number[];
	limit?: number;
}

export interface GenerarAlertasPayload {
	finca_id?: number;
	finca_ids?: number[];
	fecha?: string;
	edad_critica_cinta?: number;
	edad_historica_cinta?: number;
	dias_fumigacion?: number;
	dias_clima?: number;
}

interface ApiEnvelope<T> {
	success: boolean;
	data: T;
	message?: string;
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
	if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
		return (payload as ApiEnvelope<T>).data;
	}
	return payload as T;
}

export const alertaService = {
	async listar(params: AlertasQuery = {}): Promise<AlertaOperativa[]> {
		const { data } = await api.get<ApiEnvelope<AlertaOperativa[]> | AlertaOperativa[]>(
			'/alertas',
			{ params, skipGlobalError: true } as any,
		);
		return unwrap<AlertaOperativa[]>(data);
	},

	async resumen(params: Pick<AlertasQuery, 'finca_id' | 'finca_ids'> = {}): Promise<AlertasResumen> {
		const { data } = await api.get<ApiEnvelope<AlertasResumen> | AlertasResumen>(
			'/alertas/resumen',
			{ params, skipGlobalError: true } as any,
		);
		return unwrap<AlertasResumen>(data);
	},

	async generar(payload: GenerarAlertasPayload = {}) {
		const { data } = await api.post('/alertas/generar', payload);
		return unwrap(data);
	},

	async marcarLeida(id: number) {
		const { data } = await api.patch(`/alertas/${id}/leida`, undefined, {
			skipGlobalError: true,
		} as any);
		return unwrap(data);
	},

	async resolver(id: number): Promise<AlertaOperativa> {
		const { data } = await api.patch<ApiEnvelope<AlertaOperativa> | AlertaOperativa>(
			`/alertas/${id}/resolver`,
		);
		return unwrap<AlertaOperativa>(data);
	},
};
