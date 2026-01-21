import { defineStore } from 'pinia';
// @ts-ignore (Ignoramos si api no está tipada todavía)
import api from '@/services/api';
// @ts-ignore (Ignoramos empresaStore hasta que lo pasemos a TS en el siguiente paso)
import { useEmpresaStore } from './empresaStore';

// --- 1. INTERFACES ---

// Estructura de una Finca tal como la usamos en el Frontend
export interface Finca {
	id: number;
	nombre: string;
	empresa_id: number;
	ubicacion?: string;
	// Esta propiedad la agregamos nosotros en el frontend (Join)
	empresa_nombre?: string;
}

// Datos necesarios para crear una finca
export interface FincaPayload {
	nombre: string;
	empresa_id: number;
	ubicacion: string;
}

interface FincaState {
	fincas: Finca[];
	loading: boolean;
	error: string | null;
	fincaSeleccionadaId: number | null;
}

// --- 2. STORE ---

export const useFincaStore = defineStore('finca', {
	state: (): FincaState => ({
		fincas: [],
		loading: false,
		error: null,
		// Leemos del localStorage y convertimos a número seguro
		fincaSeleccionadaId: localStorage.getItem('lastFincaId')
			? Number(localStorage.getItem('lastFincaId'))
			: null,
	}),

	getters: {
		fincaSeleccionada: (state): Finca | null => {
			return (
				state.fincas.find((f) => f.id === state.fincaSeleccionadaId) || null
			);
		},
	},

	actions: {
		/**
		 * Obtiene fincas y les asigna el nombre de la empresa
		 */
		async obtenerFincas() {
			this.loading = true;
			this.error = null;
			const empresaStore = useEmpresaStore();

			try {
				// Tipamos la respuesta de la API
				const { data } = await api.get('/fincas');

				// 🔥 CRUCE DE DATOS: Mapeamos los resultados del backend
				// Definimos 'finca' como 'any' temporalmente en el map porque viene crudo del backend
				// y le agregamos la propiedad visual.
				this.fincas = data.map((finca: any): Finca => {
					// Buscamos la empresa en el store de empresas
					// Nota: Asumimos que empresaStore.empresas tiene objetos con .id y .nombre
					const empresaInfo = empresaStore.empresas.find(
						(e: any) => e.id === finca.empresa_id,
					);

					return {
						id: finca.id,
						nombre: finca.nombre,
						empresa_id: finca.empresa_id,
						ubicacion: finca.ubicacion,
						// Agregamos el nombre visual
						empresa_nombre: empresaInfo ? empresaInfo.nombre : 'No asignada',
					};
				});

				// Lógica de selección automática
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
			} catch (e: any) {
				console.error('Error en obtenerFincas:', e);
				this.error = e.message || 'Error desconocido';
				throw e;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Crear nueva finca
		 */
		async crearFinca(datosFinca: FincaPayload) {
			this.loading = true;
			this.error = null;
			try {
				const { data } = await api.post('/fincas', datosFinca);
				// Recargamos para actualizar la lista y los nombres de empresa
				await this.obtenerFincas();
				return data;
			} catch (e: any) {
				console.error('Error en crearFinca:', e);
				this.error = e.response?.data?.error || 'No se pudo crear la finca';
				throw e;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Selección de finca
		 */
		seleccionarFinca(id: number | string) {
			if (!id) return;

			const numericId = Number(id);

			if (this.fincaSeleccionadaId !== numericId) {
				this.error = null;
				this.fincaSeleccionadaId = numericId;
				localStorage.setItem('lastFincaId', String(numericId));
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
