import { defineStore } from 'pinia';
import api from '@/services/api';

export interface CintaCatalogo {
	id: number;
	color: string;
	color_hex?: string;
	descripcion?: string | null;
}

export interface CalendarioListado {
	id: number;
	semana: number;
	anio: number;
	color?: string | null;
	color_hex?: string | null;
	empresa_id?: number | null;
	estado?: string | null;
}

export interface ResumenCalendario {
	empresa_id?: number | null;
	empresa_nombre?: string | null;
	anio: number;
	total_semanas: number;
	secuencia_hex?: string | null;
}

export interface SemanaGenerada {
	numero: number;
	cinta: CintaCatalogo | null;
}

interface SnackbarState {
	show: boolean;
	message: string;
	color: string;
	icon: string;
}

interface GuardarCalendarioPayload {
	empresa_id: number;
	anio: number;
	detalles: Array<{
		semana: number;
		color_id: number;
		estado: string;
	}>;
}

interface CalendarioState {
	catalogoCintas: CintaCatalogo[];
	calendarios: CalendarioListado[];
	resumenCalendarios: ResumenCalendario[];
	anioSeleccionado: number;
	empresaSeleccionada: number | null;
	secuencia: CintaCatalogo[];
	calendarioGenerado: SemanaGenerada[];
	loading: boolean;
	loadingCintas: boolean;
	snackbar: SnackbarState;
}

interface ApiErrorLike {
	response?: {
		data?: {
			error?: string;
			message?: string;
		};
	};
	message?: string;
}

function extraerMensajeError(error: unknown, fallback: string): string {
	const e = error as ApiErrorLike;
	return e.response?.data?.error || e.response?.data?.message || e.message || fallback;
}

function normalizarArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

export const useCalendarioStore = defineStore('calendario', {
	state: (): CalendarioState => ({
		catalogoCintas: [],
		calendarios: [],
		resumenCalendarios: [],
		anioSeleccionado: new Date().getFullYear(),
		empresaSeleccionada: null,
		secuencia: [],
		calendarioGenerado: [],
		loading: false,
		loadingCintas: false,
		snackbar: {
			show: false,
			message: '',
			color: 'success',
			icon: 'mdi-check-circle',
		},
	}),

	getters: {
		totalSemanas: (state): number => state.calendarioGenerado.length,
		esAnioLargo: (state): boolean => state.calendarioGenerado.length === 53,
		estaCompleto: (state): boolean => {
			return (
				state.empresaSeleccionada !== null &&
				state.calendarioGenerado.length > 0 &&
				state.calendarioGenerado.every((s) => s.cinta !== null)
			);
		},
	},

	actions: {
		mostrarNotificacion(mensaje: string, color = 'success', icon = 'mdi-check-circle') {
			this.snackbar.message = mensaje;
			this.snackbar.color = color;
			this.snackbar.icon = icon;
			this.snackbar.show = true;
		},

		async obtenerCalendarios(): Promise<CalendarioListado[]> {
			this.loading = true;
			try {
				const { data } = await api.get<CalendarioListado[]>('/calendarios-enfunde');
				this.calendarios = normalizarArray<CalendarioListado>(data);
				return this.calendarios;
			} catch (error) {
				console.error('Error obteniendo calendarios:', error);
				return [];
			} finally {
				this.loading = false;
			}
		},

		async obtenerResumen(): Promise<void> {
			this.loading = true;
			try {
				const { data } = await api.get<ResumenCalendario[]>('/calendarios-enfunde/resumen');
				this.resumenCalendarios = normalizarArray<ResumenCalendario>(data);
			} catch (error) {
				console.error('Error al obtener resumen:', error);
			} finally {
				this.loading = false;
			}
		},

		async cargarCintas(): Promise<void> {
			this.loadingCintas = true;
			try {
				const { data } = await api.get<CintaCatalogo[]>('/cintas');
				this.catalogoCintas = normalizarArray<CintaCatalogo>(data);
			} catch (error) {
				console.error('Error cargando cintas:', error);
			} finally {
				this.loadingCintas = false;
			}
		},

		calcularSemanasISO(year: number): number {
			const p = (y: number) =>
				(y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
			return p(year) === 4 || p(year - 1) === 3 ? 53 : 52;
		},

		inicializarCalendario() {
			const semanas = this.calcularSemanasISO(this.anioSeleccionado);
			if (this.calendarioGenerado.length !== semanas) {
				this.calendarioGenerado = [];
				for (let i = 1; i <= semanas; i += 1) {
					this.calendarioGenerado.push({ numero: i, cinta: null });
				}
			}
			if (this.secuencia.length > 0) this.generarAutomatico();
		},

		setAnio(nuevoAnio: number) {
			this.anioSeleccionado = nuevoAnio;
			this.inicializarCalendario();
		},

		agregarCintaSecuencia(cinta: CintaCatalogo) {
			this.secuencia.push(cinta);
		},

		removerCintaSecuencia(index: number) {
			this.secuencia.splice(index, 1);
		},

		generarAutomatico() {
			if (this.secuencia.length === 0) return;
			this.calendarioGenerado = this.calendarioGenerado.map((sem, index) => {
				const cintaIndex = index % this.secuencia.length;
				return { ...sem, cinta: this.secuencia[cintaIndex] };
			});
		},

		limpiarTodo() {
			this.calendarioGenerado.forEach((s) => {
				s.cinta = null;
			});
			this.secuencia = [];
		},

		asignarCintaSemana(numeroSemana: number, cinta: CintaCatalogo | null) {
			const index = this.calendarioGenerado.findIndex((s) => s.numero === numeroSemana);
			if (index !== -1) this.calendarioGenerado[index].cinta = cinta;
		},

		async guardarCalendario(): Promise<boolean> {
			if (!this.empresaSeleccionada) {
				this.mostrarNotificacion('Selecciona una empresa primero', 'warning', 'mdi-alert');
				return false;
			}

			if (!this.calendarioGenerado.length || this.calendarioGenerado.some((s) => !s.cinta)) {
				this.mostrarNotificacion(
					'Completa todas las semanas antes de guardar',
					'warning',
					'mdi-alert',
				);
				return false;
			}

			this.loading = true;

			const payload: GuardarCalendarioPayload = {
				empresa_id: this.empresaSeleccionada,
				anio: this.anioSeleccionado,
				detalles: this.calendarioGenerado.map((s) => ({
					semana: s.numero,
					color_id: s.cinta!.id,
					estado: 'A',
				})),
			};

			try {
				await api.post('/calendarios-enfunde', payload);
				this.mostrarNotificacion(`Calendario ${this.anioSeleccionado} guardado exitosamente`);
				this.limpiarTodo();
				await this.obtenerResumen();
				return true;
			} catch (error) {
				console.error('Error guardando:', error);
				this.mostrarNotificacion(
					extraerMensajeError(error, 'Error al conectar con el servidor'),
					'error',
					'mdi-alert-circle',
				);
				return false;
			} finally {
				this.loading = false;
			}
		},
	},
});
