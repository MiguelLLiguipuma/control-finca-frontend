import { defineStore } from 'pinia';
// @ts-ignore
import api from '@/services/api';
// @ts-ignore
import { useEmpresaStore } from './empresaStore';

// --- 1. INTERFACES ACTUALIZADAS ---

export interface Finca {
	id: number;
	nombre: string;
	empresa_id: number;
	ubicacion?: string;
	// Campos críticos para el sistema de clima
	latitud: number | null;
	longitud: number | null;
	empresa_nombre?: string;
}

// Datos necesarios para crear una finca (Payload de Producción)
export interface FincaPayload {
	nombre: string;
	empresa_id: number;
	ubicacion: string;
	latitud: number | null;
	longitud: number | null;
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
		 * Obtiene fincas e incluye la data geográfica para el mapa/clima
		 */
		async obtenerFincas() {
			this.loading = true;
			this.error = null;
			const empresaStore = useEmpresaStore();

			try {
				const { data } = await api.get('/fincas');

				this.fincas = data.map((finca: any): Finca => {
					const empresaInfo = empresaStore.empresas.find(
						(e: any) => e.id === finca.empresa_id,
					);

					return {
						id: finca.id,
						nombre: finca.nombre,
						empresa_id: finca.empresa_id,
						ubicacion: finca.ubicacion,
						// Aseguramos que las coordenadas se traten como números
						latitud: finca.latitud ? Number(finca.latitud) : null,
						longitud: finca.longitud ? Number(finca.longitud) : null,
						empresa_nombre: empresaInfo ? empresaInfo.nombre : 'No asignada',
					};
				});

				// Lógica de persistencia de selección
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
				this.error = e.message || 'Error al cargar fincas';
				throw e;
			} finally {
				this.loading = false;
			}
		},

		/**
		 * Crear nueva finca enviando coordenadas al backend
		 */
		async crearFinca(datosFinca: FincaPayload) {
			this.loading = true;
			this.error = null;
			try {
				// Enviamos el payload completo incluyendo lat/long
				const { data } = await api.post('/fincas', datosFinca);
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
		 * Selección y persistencia
		 */
		seleccionarFinca(id: number | string) {
			if (!id) return;
			const numericId = Number(id);

			if (this.fincaSeleccionadaId !== numericId) {
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
