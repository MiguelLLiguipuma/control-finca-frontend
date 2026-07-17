import { defineStore } from 'pinia';
import { useEnfundeStore } from '@/stores/enfundeStore';
import { useReportesStore } from '@/stores/reportesStore';
import { useFincaStore } from '@/stores/fincaStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { useUIStore, type SnackbarColor } from '@/stores/uiStore';
import { getCurrentIsoWeekInfo, toLocalIsoDate } from '@/utils/dateIso';

interface RegistroFormData {
	finca_id: number | null;
	usuario_id: number | null;
	operario_id: number | null;
	calendario_id: number | null;
	cantidad_fundas: number | null;
	calidad: number | null;
	color: string | null;
	hora_registro: string;
	observaciones: string;
	fecha: string;
}

interface RegistroEnfundeState {
	globalLoading: boolean;
	loadingGuardar: boolean;
	isValid: boolean;
	tablaKey: number;
	formData: RegistroFormData;
}

type SnackbarType = Extract<SnackbarColor, 'success' | 'error' | 'warning'>;

interface ApiErrorLike {
	response?: {
		data?: {
			error?: string;
		};
	};
}

function hoyIso(): string {
	return toLocalIsoDate();
}

function horaActual(): string {
	return new Date().toTimeString().slice(0, 5);
}

const MAX_FUNDAS_POR_REGISTRO = 50000;

export const useRegistroEnfundeStore = defineStore('registroEnfunde', {
	state: (): RegistroEnfundeState => ({
		globalLoading: false,
		loadingGuardar: false,
		isValid: false,
		tablaKey: 0,
		formData: {
			finca_id: null,
			usuario_id: null,
			operario_id: null,
			calendario_id: null,
			cantidad_fundas: null,
			calidad: null,
			color: null,
			hora_registro: '',
			observaciones: '',
			fecha: '',
		},
	}),

	actions: {
		initForm() {
			this.formData.hora_registro = horaActual();
			this.formData.fecha = hoyIso();
		},

		resetFormulario() {
			this.formData.cantidad_fundas = null;
			this.formData.calidad = null;
			this.formData.observaciones = '';
			this.formData.hora_registro = horaActual();
		},

		mostrarMensaje(message: string, type: SnackbarType = 'success') {
			useUIStore().notify(message, type, {
				source: 'Registro de enfunde',
				scope: 'operacion',
			});
		},

		async guardarRegistro(): Promise<boolean> {
			const authStore = useAuthStore();
			const usuarioAutenticadoId = Number(authStore.user?.id_usuario ?? authStore.user?.id ?? 0);
			if (!usuarioAutenticadoId) {
				this.mostrarMensaje(
					'No se identifico el usuario autenticado. Inicie sesion nuevamente.',
					'error',
				);
				return false;
			}

			this.formData.usuario_id = usuarioAutenticadoId;
			if (!Number(this.formData.finca_id)) {
				this.mostrarMensaje('Debe seleccionar una finca destino.', 'warning');
				return false;
			}
			if (!Number(this.formData.operario_id)) {
				this.mostrarMensaje('Debe seleccionar un operario responsable.', 'warning');
				return false;
			}
			if (!Number(this.formData.calendario_id)) {
				this.mostrarMensaje('Debe seleccionar la semana de calendario.', 'warning');
				return false;
			}

			const cantidadFundas = Number(this.formData.cantidad_fundas);
			if (!Number.isInteger(cantidadFundas) || cantidadFundas <= 0) {
				this.mostrarMensaje('La cantidad de fundas debe ser un numero entero mayor a cero.', 'warning');
				return false;
			}
			if (cantidadFundas > MAX_FUNDAS_POR_REGISTRO) {
				this.mostrarMensaje(
					`La cantidad supera el maximo permitido (${MAX_FUNDAS_POR_REGISTRO.toLocaleString()} fundas).`,
					'warning',
				);
				return false;
			}
			this.formData.cantidad_fundas = cantidadFundas;

			const reportesStore = useReportesStore();
			const anioFormulario = getCurrentIsoWeekInfo(this.formData.fecha || new Date()).anio;
			const anioFiltro = reportesStore.anioSeleccionado;

			if (anioFormulario !== anioFiltro) {
				this.mostrarMensaje(
					`Bloqueado: El año del registro (${anioFormulario}) no coincide con el Panel (${anioFiltro})`,
					'warning',
				);
				return false;
			}

			this.loadingGuardar = true;
			try {
				const enfundeStore = useEnfundeStore();
				await enfundeStore.crearRegistro({ ...this.formData });

				const fincaStore = useFincaStore();
				const fincaId = Number(this.formData.finca_id ?? fincaStore.fincaSeleccionadaId ?? 0);
				await enfundeStore.cargarRegistros(fincaId || null, anioFiltro);

				this.mostrarMensaje('Registro guardado correctamente');
				this.resetFormulario();
				this.tablaKey += 1;
				return true;
			} catch (err) {
				const error = err as ApiErrorLike;
				this.mostrarMensaje(error.response?.data?.error || 'Error al guardar', 'error');
				return false;
			} finally {
				this.loadingGuardar = false;
			}
		},
	},
});
