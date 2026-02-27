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
		fincasConEmpresa(state): Finca[] {
			const empresaStore = useEmpresaStore();
			const empresasMap = new Map<number, string>();
			for (const e of empresaStore.empresas || []) {
				empresasMap.set(Number((e as any).id), String((e as any).nombre || ''));
			}

			return (state.fincas || []).map((f) => ({
				...f,
				empresa_nombre:
					empresasMap.get(Number(f.empresa_id)) || f.empresa_nombre || 'No asignada',
			}));
		},

		fincaSeleccionada(state): Finca | null {
			return (
				this.fincasConEmpresa.find((f) => f.id === state.fincaSeleccionadaId) ||
				null
			);
		},
	},

	actions: {
		mapearFincasConEmpresa(fincasApi: any[], empresas: any[]): Finca[] {
			const empresasMap = new Map<number, string>();
			for (const e of empresas || []) {
				empresasMap.set(Number(e.id), String(e.nombre || ''));
			}

			return fincasApi.map((finca: any): Finca => {
				const empresaId = Number(finca.empresa_id);
				const nombreEmpresa = empresasMap.get(empresaId);

				return {
					id: finca.id,
					nombre: finca.nombre,
					empresa_id: empresaId,
					ubicacion: finca.ubicacion,
					latitud: finca.latitud ? Number(finca.latitud) : null,
					longitud: finca.longitud ? Number(finca.longitud) : null,
					empresa_nombre: nombreEmpresa || 'No asignada',
				};
			});
		},

		/**
		 * Obtiene fincas e incluye la data geográfica para el mapa/clima
		 */
		async obtenerFincas() {
			this.loading = true;
			this.error = null;
			const empresaStore = useEmpresaStore();

			try {
				// Evita condición de carrera: primero aseguramos catálogo de empresas.
				if (!empresaStore.empresas?.length) {
					try {
						await empresaStore.fetchEmpresas();
					} catch {
						// Si falla empresas, seguimos cargando fincas y mostramos fallback.
					}
				}

				const response = await api.get('/fincas');
				const rawData = response?.data;
				const fincasApi = Array.isArray(rawData)
					? rawData
					: Array.isArray(rawData?.data)
						? rawData.data
						: [];

				this.fincas = this.mapearFincasConEmpresa(
					fincasApi,
					empresaStore.empresas || [],
				);

				// Lógica de persistencia de selección
				const existeFinca = this.fincas.some(
					(f) => f.id === this.fincaSeleccionadaId,
				);

				if (
					this.fincas.length > 0 &&
					(!this.fincaSeleccionadaId || !existeFinca)
				) {
					this.seleccionarFinca(this.fincas[0].id);
				} else if (this.fincas.length === 0) {
					// Evita reutilizar finca de una sesión anterior de otro usuario.
					this.fincaSeleccionadaId = null;
					localStorage.removeItem('lastFincaId');
				}

				return this.fincas;
			} catch (e: any) {
				console.error('Error en obtenerFincas:', e);
				this.error =
					e?.response?.data?.error ||
					e?.message ||
					'Error al cargar fincas';
				this.fincas = [];
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
		 * Actualiza una finca existente
		 */
		async actualizarFinca(id: number, datosFinca: FincaPayload) {
			this.loading = true;
			this.error = null;
			try {
				let data: unknown;
				try {
					const response = await api.put(`/fincas/${id}`, datosFinca);
					data = response.data;
				} catch (putError: any) {
					const status = putError?.response?.status;
					if (status === 404 || status === 405) {
						const response = await api.patch(`/fincas/${id}`, datosFinca);
						data = response.data;
					} else {
						throw putError;
					}
				}

				await this.obtenerFincas();
				return data;
			} catch (e: any) {
				console.error('Error en actualizarFinca:', e);
				this.error =
					e?.response?.data?.error || 'No se pudo actualizar la finca';
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
