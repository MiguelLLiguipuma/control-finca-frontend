import { defineStore } from 'pinia';
import api from '@/services/api';

interface RegistroBackend {
	id?: number;
	fecha?: string;
	cantidad_fundas?: number | string;
	color?: string | null;
	cinta?: string | null;
	calendario?: {
		color?: string | null;
	} | null;
	[key: string]: unknown;
}

export interface RegistroEnfundeItem extends RegistroBackend {
	cantidad_fundas: number;
	color: string | null;
}

interface CrearRegistroPayload {
	[key: string]: unknown;
}

interface EnfundeState {
	registros: RegistroEnfundeItem[];
	loading: boolean;
	error: string | null;
	anioSeleccionado: number;
}

interface ApiErrorLike {
	response?: {
		data?: {
			error?: string;
		};
	};
	message?: string;
}

function normalizarRegistro(reg: RegistroBackend): RegistroEnfundeItem {
	return {
		...reg,
		cantidad_fundas: Number(reg.cantidad_fundas) || 0,
		color: reg.color || reg.cinta || reg.calendario?.color || null,
	};
}

function extraerError(err: unknown, fallback: string): string {
	const error = err as ApiErrorLike;
	return error.response?.data?.error || error.message || fallback;
}

export const useEnfundeStore = defineStore('enfunde', {
	state: (): EnfundeState => ({
		registros: [],
		loading: false,
		error: null,
		anioSeleccionado: new Date().getFullYear(),
	}),

	getters: {
		registrosFiltrados: (state): RegistroEnfundeItem[] => state.registros,

		totalFundasFiltradas: (state): number => {
			return state.registros.reduce((s, r) => s + (Number(r.cantidad_fundas) || 0), 0);
		},
	},

	actions: {
		async cargarRegistros(fincaId: number | null): Promise<void> {
			if (!fincaId) return;

			this.loading = true;
			this.registros = [];

			try {
				const res = await api.get<RegistroBackend[]>(`/registros/finca/${fincaId}/${this.anioSeleccionado}`);
				this.registros = Array.isArray(res.data) ? res.data.map(normalizarRegistro) : [];
				this.error = null;
			} catch (err) {
				this.error = extraerError(err, 'Error al cargar registros');
				console.error('Error en cargarRegistros:', err);
			} finally {
				this.loading = false;
			}
		},

		async crearRegistro(payload: CrearRegistroPayload): Promise<RegistroEnfundeItem | null> {
			this.loading = true;
			try {
				const res = await api.post<RegistroBackend>('/registros', payload);
				const nuevoRegistro = normalizarRegistro(res.data || {});
				if (res.data) this.registros.unshift(nuevoRegistro);
				return nuevoRegistro;
			} finally {
				this.loading = false;
			}
		},

		async setAnio(nuevoAnio: number, fincaId: number | null): Promise<void> {
			this.anioSeleccionado = nuevoAnio;
			if (fincaId) {
				await this.cargarRegistros(fincaId);
			}
		},
	},
});
