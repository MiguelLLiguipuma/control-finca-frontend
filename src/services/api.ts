import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore';

type ApiRequestConfig = AxiosRequestConfig & { skipGlobalError?: boolean };
const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
const buildRequestId = () =>
	hasCrypto
		? crypto.randomUUID()
		: `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
		const requestId = buildRequestId();
		if (token) {
			config.headers = config.headers || {};
			(config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
		}
		config.headers = config.headers || {};
		(config.headers as Record<string, string>)['x-request-id'] = requestId;
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
			const backendMessage = String(data.message || data.error || '');

			switch (status) {
				case 401:
					mensaje = data.message || 'Su sesión ha expirado. Ingrese nuevamente.';
					authStore.logout();
					break;
				case 403: {
					mensaje = data.message || 'No tiene permisos para esta operación.';
					const esSesionExpirada =
						/sesion expirada|ingrese nuevamente|token de seguridad no valido|token invalido/i.test(
							backendMessage,
						);
					// Solo cerramos sesión cuando el backend indica token inválido/expirado.
					if (esSesionExpirada) {
						authStore.logout();
					}
					break;
				}

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
