import axios from 'axios';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore'; // 1. Importamos authStore

const api = axios.create({
	// CORRECCIÓN: Agregamos https:// y eliminamos el puerto :3000
	baseURL:
		import.meta.env.VITE_API_URL ||
		'https://control-finca-backend-production.up.railway.app/api',
});

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		const uiStore = useUIStore();
		const authStore = useAuthStore(); // 2. Accedemos al store de autenticación
		let mensaje = 'Error de conexión con el servidor';

		if (error.response) {
			const status = error.response.status;
			const data = error.response.data;

			switch (status) {
				case 401:
					mensaje = 'Sesión expirada o inválida. Ingrese nuevamente.';
					// ✅ ACCIÓN PROFESIONAL: Si el token no sirve, limpiamos y fuera.
					authStore.logout();
					break;
				case 403:
					mensaje = 'No tienes permisos para esta acción.';
					break;
				case 404:
					mensaje = 'Recurso no encontrado.';
					break;
				case 500:
					mensaje = 'Error interno en el servidor.';
					break;
				default:
					mensaje = data.error || data.message || 'Error inesperado.';
			}
		} else if (error.request) {
			mensaje = 'No hay respuesta del servidor (Backend apagado).';
		}

		uiStore.showError(mensaje);
		return Promise.reject(error);
	},
);

export default api;
