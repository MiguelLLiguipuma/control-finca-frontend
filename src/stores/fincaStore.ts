import { defineStore } from 'pinia';
import type { AxiosError } from 'axios';
import api from '@/services/api';
import {
	useEmpresaStore,
	type Empresa,
} from '@/stores/empresaStore';

export interface Finca {
	id: number;
	nombre: string;
	empresa_id: number;
	ubicacion?: string;
	latitud: number | null;
	longitud: number | null;
	empresa_nombre?: string;
}

export interface FincaPayload {
	nombre: string;
	empresa_id: number;
	ubicacion: string;
	latitud: number | null;
	longitud: number | null;
}

interface FincaApiRow {
	id: number | string;
	nombre: string;
	empresa_id: number | string;
	ubicacion?: string;
	latitud?: number | string | null;
	longitud?: number | string | null;
}

interface FincaResponseEnvelope {
	data?: FincaApiRow[];
}

interface ApiErrorData {
	error?: string;
	message?: string;
}

interface FincaState {
	fincas: Finca[];
	loading: boolean;
	error: string | null;
	fincaSeleccionadaId: number | null;
}

const LAST_FINCA_KEY = 'lastFincaId';

const parseStoredFincaId = (): number | null => {
	const stored = localStorage.getItem(LAST_FINCA_KEY);
	if (!stored) return null;
	const parsed = Number(stored);
	return Number.isFinite(parsed) ? parsed : null;
};

const toNullableNumber = (value: number | string | null | undefined): number | null => {
	if (value === null || value === undefined || value === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const createEmpresaMap = (empresas: Empresa[]): Map<number, string> => {
	const map = new Map<number, string>();
	for (const empresa of empresas) {
		map.set(Number(empresa.id), String(empresa.nombre || ''));
	}
	return map;
};

const normalizeFinca = (
	finca: FincaApiRow,
	empresasMap: Map<number, string>,
): Finca => {
	const empresaId = Number(finca.empresa_id);
	return {
		id: Number(finca.id),
		nombre: String(finca.nombre || ''),
		empresa_id: empresaId,
		ubicacion: finca.ubicacion,
		latitud: toNullableNumber(finca.latitud),
		longitud: toNullableNumber(finca.longitud),
		empresa_nombre: empresasMap.get(empresaId) || 'No asignada',
	};
};

const resolveFincasPayload = (payload: FincaApiRow[] | FincaResponseEnvelope): FincaApiRow[] => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
};

const getErrorMessage = (
	error: unknown,
	fallback: string,
): string => {
	const err = error as AxiosError<ApiErrorData> | undefined;
	return (
		err?.response?.data?.error ||
		err?.response?.data?.message ||
		err?.message ||
		fallback
	);
};

export const useFincaStore = defineStore('finca', {
	state: (): FincaState => ({
		fincas: [],
		loading: false,
		error: null,
		fincaSeleccionadaId: parseStoredFincaId(),
	}),

	getters: {
		fincasConEmpresa(state): Finca[] {
			const empresaStore = useEmpresaStore();
			const empresasMap = createEmpresaMap(empresaStore.empresas || []);

			return (state.fincas || []).map((finca) => ({
				...finca,
				empresa_nombre:
					empresasMap.get(Number(finca.empresa_id)) ||
					finca.empresa_nombre ||
					'No asignada',
			}));
		},

		fincaSeleccionada(state): Finca | null {
			return (
				this.fincasConEmpresa.find((finca) => finca.id === state.fincaSeleccionadaId) ||
				null
			);
		},
	},

	actions: {
		mapearFincasConEmpresa(fincasApi: FincaApiRow[], empresas: Empresa[]): Finca[] {
			const empresasMap = createEmpresaMap(empresas);
			return fincasApi.map((finca) => normalizeFinca(finca, empresasMap));
		},

		async obtenerFincas() {
			this.loading = true;
			this.error = null;
			const empresaStore = useEmpresaStore();

			try {
				if (!empresaStore.empresas?.length) {
					try {
						await empresaStore.fetchEmpresas();
					} catch {
						// Si falla empresas, seguimos cargando fincas y usamos fallback local.
					}
				}

				const response = await api.get<FincaApiRow[] | FincaResponseEnvelope>('/fincas');
				const fincasApi = resolveFincasPayload(response.data);

				this.fincas = this.mapearFincasConEmpresa(
					fincasApi,
					empresaStore.empresas || [],
				);

				const existeFinca = this.fincas.some(
					(finca) => finca.id === this.fincaSeleccionadaId,
				);

				if (this.fincas.length > 0 && (!this.fincaSeleccionadaId || !existeFinca)) {
					this.seleccionarFinca(this.fincas[0].id);
				} else if (this.fincas.length === 0) {
					this.fincaSeleccionadaId = null;
					localStorage.removeItem(LAST_FINCA_KEY);
				}

				return this.fincas;
			} catch (error: unknown) {
				console.error('Error en obtenerFincas:', error);
				this.error = getErrorMessage(error, 'Error al cargar fincas');
				this.fincas = [];
				throw error;
			} finally {
				this.loading = false;
			}
		},

		async crearFinca(datosFinca: FincaPayload) {
			this.loading = true;
			this.error = null;
			try {
				const { data } = await api.post('/fincas', datosFinca);
				await this.obtenerFincas();
				return data;
			} catch (error: unknown) {
				console.error('Error en crearFinca:', error);
				this.error = getErrorMessage(error, 'No se pudo crear la finca');
				throw error;
			} finally {
				this.loading = false;
			}
		},

		async actualizarFinca(id: number, datosFinca: FincaPayload) {
			this.loading = true;
			this.error = null;
			try {
				let data: unknown;
				try {
					const response = await api.put(`/fincas/${id}`, datosFinca);
					data = response.data;
				} catch (error: unknown) {
					const status = (error as AxiosError)?.response?.status;
					if (status === 404 || status === 405) {
						const response = await api.patch(`/fincas/${id}`, datosFinca);
						data = response.data;
					} else {
						throw error;
					}
				}

				await this.obtenerFincas();
				return data;
			} catch (error: unknown) {
				console.error('Error en actualizarFinca:', error);
				this.error = getErrorMessage(error, 'No se pudo actualizar la finca');
				throw error;
			} finally {
				this.loading = false;
			}
		},

		seleccionarFinca(id: number | string) {
			if (!id) return;
			const numericId = Number(id);
			if (!Number.isFinite(numericId)) return;

			if (this.fincaSeleccionadaId !== numericId) {
				this.fincaSeleccionadaId = numericId;
				localStorage.setItem(LAST_FINCA_KEY, String(numericId));
			}
		},
	},
});
