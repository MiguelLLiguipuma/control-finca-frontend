import { defineStore } from 'pinia';
import api from '@/services/api';

export const useUsuarioStore = defineStore('usuario', {
	state: () => ({ usuarios: [] }),
	actions: {
		async obtenerUsuarios() {
			const { data } = await api.get('/usuarios');
			this.usuarios = data;
			return data;
		},
	},
});
