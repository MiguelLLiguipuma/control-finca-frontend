// Ejemplo de enfundeService.js
import api from './api';

export const enfundeService = {
	async registrarVuelta(payload) {
		// Ajusta la URL según corresponda a tu backend
		const response = await api.post('/enfunde', payload);
		return response.data;
	},
};
