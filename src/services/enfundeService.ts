import api from './api';

export interface RegistroEnfundePayload {
  fecha: string
  finca_id: number
  usuario_id: number
  calendario_id: number
  cantidad_fundas: number
  observaciones?: string
}

export interface RegistroEnfundeResponse {
  success?: boolean
  message?: string
  [key: string]: unknown
}

export const enfundeService = {
	async registrarVuelta(payload: RegistroEnfundePayload) {
		const response = await api.post<RegistroEnfundeResponse>('/enfunde', payload);
		return response.data;
	},
};
