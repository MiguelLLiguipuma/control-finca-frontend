// src/services/empresaService.js
import api from './api';

function normalizeError(error) {
	let message = 'Error inesperado';

	if (error.response) {
		const data = error.response.data;
		message =
			data?.message || data?.error || error.response.statusText || message;
	} else if (error.request) {
		message = 'No se pudo conectar con el servidor';
	} else if (error.message) {
		message = error.message;
	}

	return new Error(message);
}

export const empresaService = {
	async cargarEmpresas() {
		const response = await api.get('/empresas');
		return response.data;
	},

	async obtenerEmpresaPorId(id) {
		try {
			const response = await api.get(`/empresas/${id}`);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async agregarEmpresa(empresa) {
		try {
			const response = await api.post('/empresas', empresa);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async actualizarEmpresa(id, empresa) {
		try {
			const response = await api.put(`/empresas/${id}`, empresa);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async eliminarEmpresa(id) {
		try {
			await api.delete(`/empresas/${id}`);
			return { ok: true };
		} catch (error) {
			throw normalizeError(error);
		}
	},
};
