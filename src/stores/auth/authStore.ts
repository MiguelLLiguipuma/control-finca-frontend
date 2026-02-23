import { defineStore } from 'pinia';
import api from '@/services/api';
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
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
}

export const useAuthStore = defineStore('auth', {
	state: () => ({
		// Cargamos datos de localStorage solo si existen
		user: parseStoredUser(),
		token: localStorage.getItem('token') || null,
		loading: false,
	}),

	getters: {
		userName: (state) => state.user?.nombre || 'Usuario',
		userRole: (state) => state.user?.rol?.toUpperCase() || 'TRABAJADOR',
		normalizedRole: (state) => normalizeRole(state.user?.rol),
		permissions: (state) => permissionsForRole(state.user?.rol),
		can:
			(state) =>
			(permission: AppPermission): boolean =>
				canAccess(permission, state.user?.rol),
		userInitials: (state) =>
			state.user?.nombre ? state.user.nombre.charAt(0).toUpperCase() : 'U',
		isAuthenticated: (state) => !!state.token,
	},

	actions: {
		establishSession(payload: LoginResponse) {
			const { user, token } = payload;
			this.user = user;
			this.token = token;
			localStorage.setItem('token', token);
			localStorage.setItem('user', JSON.stringify(user));
		},

		async login(credentials: LoginCredentials) {
			this.loading = true;
			try {
				const response = await api.post<LoginResponse>(
					'/auth/login',
					credentials,
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
				});
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
		logout() {
			this.user = null;
			this.token = null;
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			// Usamos replace para que no puedan volver atrás con el botón del navegador
			window.location.replace('/login');
		},
	},
});
