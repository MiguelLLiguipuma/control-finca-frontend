import api from '@/services/api';
import type {
	EmbarqueAccionResponse,
	EmbarqueAnularRequest,
	EmbarqueConfirmResponse,
	EmbarqueConfirmRequest,
	EmbarqueCreateRequest,
	EmbarqueListQuery,
	EmbarqueListResponse,
	EmbarquePreliquidacionQuery,
	EmbarquePreliquidacionResponse,
	EmbarqueUpdateRequest,
	EmbarqueVoucher,
} from './embarqueTypes';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
	if (
		payload &&
		typeof payload === 'object' &&
		'data' in (payload as Record<string, unknown>)
	) {
		return (payload as ApiEnvelope<T>).data;
	}
	return payload as T;
}

export const embarqueService = {
	async getPreliquidacion(
		params: EmbarquePreliquidacionQuery,
	): Promise<EmbarquePreliquidacionResponse> {
		const response = await api.get<
			ApiEnvelope<EmbarquePreliquidacionResponse> | EmbarquePreliquidacionResponse
		>(
			'/embarque/preliquidacion',
			{ params },
		);
		return unwrapEnvelope(response.data);
	},

	async crearVoucher(payload: EmbarqueCreateRequest): Promise<EmbarqueAccionResponse> {
		const response = await api.post<
			ApiEnvelope<EmbarqueAccionResponse> | EmbarqueAccionResponse
		>(
			'/embarque/vouchers',
			payload,
		);
		return unwrapEnvelope(response.data);
	},

	async actualizarVoucher(
		voucherId: number,
		payload: EmbarqueUpdateRequest,
	): Promise<EmbarqueAccionResponse> {
		const response = await api.put<
			ApiEnvelope<EmbarqueAccionResponse> | EmbarqueAccionResponse
		>(
			`/embarque/vouchers/${voucherId}`,
			payload,
		);
		return unwrapEnvelope(response.data);
	},

	async confirmarVoucher(
		voucherId: number,
		payload: EmbarqueConfirmRequest,
	): Promise<EmbarqueConfirmResponse> {
		const response = await api.post<
			ApiEnvelope<EmbarqueConfirmResponse> | EmbarqueConfirmResponse
		>(
			`/embarque/vouchers/${voucherId}/confirmar`,
			payload,
			{ skipGlobalError: true } as any,
		);
		return unwrapEnvelope(response.data);
	},

	async anularVoucher(
		voucherId: number,
		payload: EmbarqueAnularRequest,
	): Promise<EmbarqueAccionResponse> {
		const response = await api.post<
			ApiEnvelope<EmbarqueAccionResponse> | EmbarqueAccionResponse
		>(
			`/embarque/vouchers/${voucherId}/anular`,
			payload,
		);
		return unwrapEnvelope(response.data);
	},

	async getVoucher(voucherId: number): Promise<EmbarqueVoucher> {
		const response = await api.get<ApiEnvelope<EmbarqueVoucher> | EmbarqueVoucher>(
			`/embarque/vouchers/${voucherId}`,
		);
		return unwrapEnvelope(response.data);
	},

	async listVouchers(params: EmbarqueListQuery): Promise<EmbarqueListResponse> {
		const response = await api.get<
			ApiEnvelope<EmbarqueListResponse> | EmbarqueListResponse
		>('/embarque/vouchers', {
			params,
		});
		return unwrapEnvelope(response.data);
	},
};
