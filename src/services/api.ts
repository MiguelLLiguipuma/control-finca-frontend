import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore';

type ApiRequestConfig = AxiosRequestConfig & { skipGlobalError?: boolean };

const api = axios.create({
	baseURL:
		import.meta.env.VITE_API_URL ||
		'https://control-finca-backend-production.up.railway.app/api',
	timeout: 15000, // Añadimos timeout para evitar peticiones colgadas
});

// Interceptor de Peticiones: Adjuntar Token
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers = config.headers || {};
			(config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// Interceptor de Respuestas: Manejo de Errores Global
api.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		const uiStore = useUIStore();
		const authStore = useAuthStore();

		let mensaje = 'Error de conexión con el servidor';

		if (error.response) {
			const status = error.response.status;
			const data = (error.response.data || {}) as {
				error?: string;
				message?: string;
			};

			switch (status) {
				case 401:
				case 403:
					// 401: No autorizado (falta token)
					// 403: Prohibido (token expirado o inválido según tu log de Railway)
					mensaje =
						data.message || 'Su sesión ha expirado. Ingrese nuevamente.';

					// Limpiamos el estado y redirigimos (el logout debería manejar el redireccionamiento)
					authStore.logout();

					// Opcional: Forzar recarga a login si no estás en la página de login
					if (!window.location.pathname.includes('/login')) {
						window.location.href = '/login';
					}
					break;

				case 404:
					mensaje = 'El recurso solicitado no existe.';
					break;

				case 500:
					mensaje =
						data?.error ||
						data?.message ||
						'Error interno en el servidor. Inténtelo más tarde.';
					break;

				default:
					mensaje =
						data.error || data.message || `Error inesperado (${status})`;
			}
		} else if (error.request) {
			// La petición se hizo pero no hubo respuesta (servidor caído o timeout)
			mensaje = 'No se pudo conectar con el servidor. Revise su conexión.';
		}

		// Evitamos mostrar el error si es un error de cancelación de petición
		const config = (error.config || {}) as ApiRequestConfig;
		if (!axios.isCancel(error) && !config.skipGlobalError) {
			uiStore.showError(mensaje);
		}

		return Promise.reject(error);
	},
);

export default api;
