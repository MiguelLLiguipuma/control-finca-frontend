import { defineStore } from 'pinia';
import api from '@/services/api';

export const useEnfundeStore = defineStore('enfunde', {
	state: () => ({
		registros: [],
		loading: false,
		error: null,
		anioSeleccionado: new Date().getFullYear(),
	}),

	getters: {
		registrosFiltrados: (state) => state.registros,

		totalFundasFiltradas: (state) => {
			return state.registros.reduce(
				(s, r) => s + (Number(r.cantidad_fundas) || 0),
				0,
			);
		},
	},

	actions: {
		async cargarRegistros(fincaId) {
			if (!fincaId) return;

			this.loading = true;
			this.registros = [];

			try {
				const res = await api.get(
					`/registros/finca/${fincaId}/${this.anioSeleccionado}`,
				);

				// ✅ NORMALIZACIÓN DE DATOS:
				// Si el backend envía 'cinta', lo pasamos a 'color' para que la tabla lo vea.
				this.registros = res.data.map((reg) => ({
					...reg,
					// Buscamos el color en todas las posibles ubicaciones que envíe el backend
					color:
						reg.color ||
						reg.cinta ||
						(reg.calendario ? reg.calendario.color : null),
				}));

				this.error = null;
			} catch (err) {
				this.error = err.response?.data?.error || 'Error al cargar registros';
				console.error('Error en cargarRegistros:', err);
			} finally {
				this.loading = false;
			}
		},

		async crearRegistro(payload) {
			this.loading = true;
			try {
				const res = await api.post('/registros', payload);
				// Al crear, también normalizamos el nuevo registro para que tenga 'color'
				const nuevoRegistro = {
					...res.data,
					color: res.data.color || res.data.cinta || null,
				};

				if (res.data) this.registros.unshift(nuevoRegistro);
				return res.data;
			} catch (err) {
				throw err;
			} finally {
				this.loading = false;
			}
		},

		async setAnio(nuevoAnio, fincaId) {
			this.anioSeleccionado = nuevoAnio;
			if (fincaId) {
				await this.cargarRegistros(fincaId);
			}
		},
	},
});
