import { defineStore } from 'pinia';
import api from '@/services/api';
// Importamos el store de empresas para poder acceder a sus datos
import { useEmpresaStore } from './empresaStore';

export const useFincaStore = defineStore('finca', {
	state: () => ({
		fincas: [],
		loading: false,
		error: null,
		fincaSeleccionadaId: localStorage.getItem('lastFincaId')
			? Number(localStorage.getItem('lastFincaId'))
			: null,
	}),

	getters: {
		fincaSeleccionada: (state) => {
			return (
				state.fincas.find((f) => f.id === state.fincaSeleccionadaId) || null
			);
		},
	},

	actions: {
		/**
		 * Obtiene fincas y les asigna el nombre de la empresa buscando en empresaStore
		 */
		async obtenerFincas() {
			this.loading = true;
			this.error = null;
			const empresaStore = useEmpresaStore();

			try {
				const { data } = await api.get('/fincas');

				// 🔥 CRUCE DE DATOS: Mapeamos los resultados del backend
				this.fincas = data.map((finca) => {
					// Buscamos la empresa en el store de empresas usando el ID
					const empresaInfo = empresaStore.empresas.find(
						(e) => e.id === finca.empresa_id,
					);

					return {
						...finca,
						// Creamos una propiedad 'empresa_nombre' para la tabla
						empresa_nombre: empresaInfo ? empresaInfo.nombre : 'No asignada',
					};
				});

				const existeFinca = this.fincas.some(
					(f) => f.id === this.fincaSeleccionadaId,
				);

				if (
					this.fincas.length > 0 &&
					(!this.fincaSeleccionadaId || !existeFinca)
				) {
					this.seleccionarFinca(this.fincas[0].id);
				}

				return data;
			} catch (e) {
				console.error('Error en obtenerFincas:', e);
				this.error = e.message;
				throw e;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * @param {Object} datosFinca - { nombre, empresa_id, ubicacion }
		 */
		async crearFinca(datosFinca) {
			this.loading = true;
			this.error = null;
			try {
				const { data } = await api.post('/fincas', datosFinca);
				// Al recargar, obtenerFincas() volverá a mapear los nombres actualizados
				await this.obtenerFincas();
				return data;
			} catch (e) {
				console.error('Error en crearFinca:', e);
				this.error = e.response?.data?.error || 'No se pudo crear la finca';
				throw e;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Selecciona una finca y limpia errores previos para evitar persistencia de datos
		 */
		seleccionarFinca(id) {
			if (!id) return;

			const numericId = Number(id);

			// Solo actualizamos si el ID es diferente para evitar ciclos infinitos
			if (this.fincaSeleccionadaId !== numericId) {
				this.error = null; // Limpiamos errores de la finca anterior
				this.fincaSeleccionadaId = numericId;
				localStorage.setItem('lastFincaId', numericId);

				// Aquí podrías añadir un reset de otros stores si fuera necesario
			}
		},

		resetStore() {
			this.fincas = [];
			this.fincaSeleccionadaId = null;
			this.error = null;
			localStorage.removeItem('lastFincaId');
		},
	},
});
