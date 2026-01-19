import api from '../api';

export const cosechaService = {
	// Obtiene el balance de fruta en pie (la vista SQL)
	async getBalance(fincaId) {
		const response = await api.get(`/cosecha/balance/${fincaId}`);
		return response.data;
	},

	// Envía la liquidación de cosecha (el array de colores)
	async registrarLiquidacion(payload) {
		const response = await api.post('/cosecha/registrar-liquidacion', payload);
		return response.data;
	},
};
