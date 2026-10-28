import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { propietarioCosecha } from '@/utils/cosechaLocal';
import { isAuthenticationRequest, readSessionToken, shouldExpireSession } from '@/utils/sessionPolicy';

type ApiRequestConfig = AxiosRequestConfig & { skipGlobalError?: boolean; propietarioCosecha?: string; sessionToken?: string | null };
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
		const propietario = (config as ApiRequestConfig).propietarioCosecha;
		if (propietario && propietario !== propietarioCosecha()) {
			throw new axios.CanceledError('La sesion cambio. El reporte permanece con su propietario.');
		}
		const token = readSessionToken();
		const authentication = isAuthenticationRequest(config.url);
		if (!authentication && useAuthStore().token !== token) {
			throw new axios.CanceledError('La sesion cambio en otra pestana. Reabre la aplicacion para continuar.');
		}
		(config as ApiRequestConfig).sessionToken = token;
		const requestId = buildRequestId();
		if (token && !authentication) {
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
	(response) => {
		if (isPreviousSession(response.config)) throw new axios.CanceledError('Respuesta de una sesion anterior descartada.');
		return response;
	},
	(error: AxiosError) => {
		if (axios.isCancel(error)) return Promise.reject(error);
		if (error.config && isPreviousSession(error.config)) {
			return Promise.reject(new axios.CanceledError('Respuesta de una sesion anterior descartada.'));
		}
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
			if (!isAuthenticationRequest(error.config?.url) &&
				shouldExpireSession(status, backendMessage, Boolean((error.config as ApiRequestConfig)?.sessionToken))) {
				authStore.logout('expired');
				return Promise.reject(error);
			}

			switch (status) {
				case 401:
					mensaje = data.message || 'Su sesión ha expirado. Ingrese nuevamente.';
					break;
				case 403: {
					mensaje = data.message || 'No tiene permisos para esta operación.';
					break;
				}

				case 404:
					mensaje = 'El recurso solicitado no existe.';
					break;

				case 500:
					mensaje = 'Error interno en el servidor. Inténtelo más tarde.';
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

function isPreviousSession(config: ApiRequestConfig): boolean {
	return !isAuthenticationRequest(config.url) && config.sessionToken !== undefined &&
		config.sessionToken !== readSessionToken();
}

export default api;
