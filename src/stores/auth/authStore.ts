import { defineStore } from 'pinia';
import api from '@/services/api';
import { readSessionToken } from '@/utils/sessionPolicy';
import {
	canAccess,
	normalizeRole,
	permissionsForRole,
	type AppPermission,
} from '@/utils/rbac';

interface AuthUser {
	id?: number;
	id_usuario?: number;
	nombre: string;
	rol?: string;
	empresa_id?: number | null;
}

interface LoginCredentials {
	email: string;
	password: string;
}

interface LoginResponse {
	token: string;
	user: AuthUser;
}

function parseStoredUser(): AuthUser | null {
	try {
		const raw = localStorage.getItem('user');
		if (!raw) return null;
		const user = JSON.parse(raw);
		const id = Number(user?.id ?? user?.id_usuario);
		return Number.isSafeInteger(id) && id > 0 && typeof user?.nombre === 'string' ? user as AuthUser : null;
	} catch {
		return null;
	}
}

export const useAuthStore = defineStore('auth', {
	state: () => ({
		// Cargamos datos de localStorage solo si existen
		user: parseStoredUser(),
		token: readSessionToken(),
		loading: false,
	}),

	getters: {
		userName: (state) => state.user?.nombre || 'Usuario',
		userRole: (state) => state.user?.rol?.toUpperCase() || 'SIN ROL',
		userEmpresaId: (state) =>
			Number(state.user?.empresa_id || 0) > 0
				? Number(state.user?.empresa_id)
				: null,
		normalizedRole: (state) => normalizeRole(state.user?.rol),
		permissions: (state) => permissionsForRole(state.user?.rol),
		can:
			(state) =>
			(permission: AppPermission): boolean =>
				canAccess(permission, state.user?.rol),
		userInitials: (state) =>
			state.user?.nombre ? state.user.nombre.charAt(0).toUpperCase() : 'U',
		isAuthenticated: (state) => !!state.token && !!state.user,
	},

	actions: {
		establishSession(payload: LoginResponse) {
			const { user, token } = payload;
			if (!token || !Number.isSafeInteger(Number(user?.id ?? user?.id_usuario)) ||
				Number(user?.id ?? user?.id_usuario) <= 0 || typeof user?.nombre !== 'string') {
				throw new Error('Respuesta de autenticacion invalida');
			}
			const previousUser = localStorage.getItem('user');
			try {
				localStorage.setItem('user', JSON.stringify(user));
				localStorage.setItem('token', token);
			} catch (error) {
				if (previousUser === null) localStorage.removeItem('user');
				else localStorage.setItem('user', previousUser);
				throw error;
			}
			this.user = user;
			this.token = token;
		},

		async login(credentials: LoginCredentials) {
			this.loading = true;
			try {
				const response = await api.post<LoginResponse>(
					'/auth/login',
					credentials,
					{ skipGlobalError: true } as import('axios').AxiosRequestConfig,
				);
				this.establishSession(response.data);

				return { success: true };
			} catch (error) {
				const e = error as { response?: { data?: { message?: string } } };
				return {
					success: false,
					message: e.response?.data?.message || 'Error de conexión',
				};
			} finally {
				this.loading = false;
			}
		},

		async loginWithGoogle(idToken: string) {
			this.loading = true;
			try {
				const response = await api.post<LoginResponse>('/auth/google', {
					id_token: idToken,
				}, { skipGlobalError: true } as import('axios').AxiosRequestConfig);
				this.establishSession(response.data);
				return { success: true };
			} catch (error) {
				const e = error as { response?: { data?: { message?: string } } };
				return {
					success: false,
					message:
						e.response?.data?.message || 'No se pudo autenticar con Google',
				};
			} finally {
				this.loading = false;
			}
		},

		// ✅ Centralizamos el cierre de sesión aquí
		logout(reason?: 'expired') {
			this.user = null;
			this.token = null;
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			// Usamos replace para que no puedan volver atrás con el botón del navegador
			window.location.replace(reason === 'expired' ? '/login?sesion=expirada' : '/login');
		},
	},
});
