import { defineStore } from 'pinia';
import api from '@/services/api';

export const useCalendarioStore = defineStore('calendario', {
	state: () => ({
		// --- DATOS MAESTROS ---
		catalogoCintas: [], // Para crear (GET /cintas)
		calendarios: [], // Lista de calendarios ya creados
		resumenCalendarios: [], // Resumen anual (GET /calendarios-enfunde/resumen)

		// --- ESTADO DE CONFIGURACIÓN ---
		anioSeleccionado: new Date().getFullYear(),
		empresaSeleccionada: null,

		secuencia: [],
		calendarioGenerado: [],

		loading: false,
		loadingCintas: false,

		// --- NUEVO: ESTADO DE NOTIFICACIÓN (SNACKBAR) ---
		snackbar: {
			show: false,
			message: '',
			color: 'success',
			icon: 'mdi-check-circle',
		},
	}),

	getters: {
		totalSemanas: (state) => state.calendarioGenerado.length,
		esAnioLargo: (state) => state.calendarioGenerado.length === 53,
		estaCompleto: (state) => {
			return (
				state.empresaSeleccionada !== null &&
				state.calendarioGenerado.length > 0 &&
				state.calendarioGenerado.every((s) => s.cinta !== null)
			);
		},
	},

	actions: {
		// --- ACCIÓN PARA MOSTRAR NOTIFICACIÓN ---
		mostrarNotificacion(mensaje, color = 'success', icon = 'mdi-check-circle') {
			this.snackbar.message = mensaje;
			this.snackbar.color = color;
			this.snackbar.icon = icon;
			this.snackbar.show = true;
		},

		// --- 0. RECUPERADO: OBTENER LISTA ---
		async obtenerCalendarios() {
			this.loading = true;
			try {
				const { data } = await api.get('/calendarios-enfunde');
				this.calendarios = data;
				return data;
			} catch (error) {
				console.error('Error obteniendo calendarios:', error);
			} finally {
				this.loading = false;
			}
		},
		async obtenerResumen() {
			this.loading = true;
			try {
				const { data } = await api.get('/calendarios-enfunde/resumen');
				this.resumenCalendarios = data;
			} catch (error) {
				console.error('Error al obtener resumen:', error);
			} finally {
				this.loading = false;
			}
		},

		// --- 1. CARGA DE CINTAS ---
		async cargarCintas() {
			this.loadingCintas = true;
			try {
				const { data } = await api.get('/cintas');
				this.catalogoCintas = data;
			} catch (error) {
				console.error('Error cargando cintas:', error);
			} finally {
				this.loadingCintas = false;
			}
		},

		// --- 2. LÓGICA DE CALENDARIO ---
		calcularSemanasISO(year) {
			const p = (y) =>
				(y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
			return p(year) === 4 || p(year - 1) === 3 ? 53 : 52;
		},

		inicializarCalendario() {
			const semanas = this.calcularSemanasISO(this.anioSeleccionado);
			if (this.calendarioGenerado.length !== semanas) {
				this.calendarioGenerado = [];
				for (let i = 1; i <= semanas; i++) {
					this.calendarioGenerado.push({ numero: i, cinta: null });
				}
			}
			if (this.secuencia.length > 0) this.generarAutomatico();
		},

		setAnio(nuevoAnio) {
			this.anioSeleccionado = nuevoAnio;
			this.inicializarCalendario();
		},

		// --- 3. GESTIÓN DE SECUENCIA ---
		agregarCintaSecuencia(cinta) {
			this.secuencia.push(cinta);
		},
		removerCintaSecuencia(index) {
			this.secuencia.splice(index, 1);
		},

		generarAutomatico() {
			if (this.secuencia.length === 0) return;
			this.calendarioGenerado = this.calendarioGenerado.map((sem, index) => {
				const cintaIndex = index % this.secuencia.length;
				return { ...sem, cinta: this.secuencia[cintaIndex] };
			});
		},

		// --- LIMPIAR FORMULARIO (Resetea la vista) ---
		limpiarTodo() {
			this.calendarioGenerado.forEach((s) => (s.cinta = null));
			this.secuencia = [];
			// Opcional: si quieres que se deseleccione la empresa también:
			// this.empresaSeleccionada = null;
		},

		asignarCintaSemana(numeroSemana, cinta) {
			const index = this.calendarioGenerado.findIndex(
				(s) => s.numero === numeroSemana,
			);
			if (index !== -1) this.calendarioGenerado[index].cinta = cinta;
		},

		// --- 4. GUARDAR CON NOTIFICACIÓN Y LIMPIEZA ---
		async guardarCalendario() {
			if (!this.empresaSeleccionada) {
				this.mostrarNotificacion(
					'Selecciona una empresa primero',
					'warning',
					'mdi-alert',
				);
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

			const payload = {
				empresa_id: this.empresaSeleccionada,
				anio: this.anioSeleccionado,
				detalles: this.calendarioGenerado.map((s) => ({
					semana: s.numero,
					color_id: s.cinta.id,
					estado: 'A',
				})),
			};

			try {
				await api.post('/calendarios-enfunde', payload);

				// 1. Notificación de Éxito
				this.mostrarNotificacion(
					`Calendario ${this.anioSeleccionado} guardado exitosamente`,
				);

				// 2. Limpiar el formulario visualmente
				this.limpiarTodo();

					// 3. Recargar el resumen que consume la vista
					await this.obtenerResumen();

				return true;
			} catch (error) {
				console.error('Error guardando:', error);

				// Notificación de Error
				const mensajeError =
					error.response?.data?.error || 'Error al conectar con el servidor';
				this.mostrarNotificacion(mensajeError, 'error', 'mdi-alert-circle');

				return false;
			} finally {
				this.loading = false;
			}
		},
	},
});
