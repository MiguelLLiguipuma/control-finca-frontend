import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
	state: () => ({
		// Cargamos datos de localStorage solo si existen
		user: JSON.parse(localStorage.getItem('user')) || null,
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
		async login(credentials) {
			this.loading = true;
			try {
				const response = await api.post('/auth/login', credentials);
				const { user, token } = response.data;

				this.user = user;
				this.token = token;

				// ✅ Guardamos en localStorage para persistencia durante la jornada
				localStorage.setItem('token', token);
				localStorage.setItem('user', JSON.stringify(user));

				return { success: true };
			} catch (error) {
				return {
					success: false,
					message: error.response?.data?.message || 'Error de conexión',
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
