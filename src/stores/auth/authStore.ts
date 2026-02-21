import { defineStore } from 'pinia';
import api from '@/services/api';

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
		userInitials: (state) =>
			state.user?.nombre ? state.user.nombre.charAt(0).toUpperCase() : 'U',
		isAuthenticated: (state) => !!state.token,
	},

	actions: {
		async login(credentials: LoginCredentials) {
			this.loading = true;
			try {
				const response = await api.post<LoginResponse>(
					'/auth/login',
					credentials,
				);
				const { user, token } = response.data;

				this.user = user;
				this.token = token;

				// ✅ Guardamos en localStorage para persistencia durante la jornada
				localStorage.setItem('token', token);
				localStorage.setItem('user', JSON.stringify(user));

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

		// ✅ Centralizamos el cierre de sesión aquí
		logout() {
			this.user = null;
			this.token = null;
			localStorage.clear();
			// Usamos replace para que no puedan volver atrás con el botón del navegador
			window.location.replace('/login');
		},
	},
});
