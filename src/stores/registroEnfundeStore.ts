import { defineStore } from 'pinia';
import { useEnfundeStore } from '@/stores/enfundeStore';
import { useReportesStore } from '@/stores/reportesStore';
import { useFincaStore } from '@/stores/fincaStore';
import { useAuthStore } from '@/stores/auth/authStore';

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

interface SnackbarState {
	show: boolean;
	message: string;
	color: 'success' | 'error' | 'warning';
	icon: string;
}

interface RegistroEnfundeState {
	globalLoading: boolean;
	loadingGuardar: boolean;
	isValid: boolean;
	tablaKey: number;
	formData: RegistroFormData;
	snackbar: SnackbarState;
}

type SnackbarType = 'success' | 'error' | 'warning';

interface ApiErrorLike {
	response?: {
		data?: {
			error?: string;
		};
	};
}

function hoyIso(): string {
	return new Date().toISOString().split('T')[0];
}

function horaActual(): string {
	return new Date().toTimeString().slice(0, 5);
}

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
		snackbar: {
			show: false,
			message: '',
			color: 'success',
			icon: 'mdi-check-circle',
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
			this.formData.color = null;
			this.formData.operario_id = null;
			this.formData.observaciones = '';
			this.initForm();
		},

		mostrarMensaje(message: string, type: SnackbarType = 'success') {
			const config: Record<SnackbarType, Omit<SnackbarState, 'show' | 'message'>> = {
				success: { color: 'success', icon: 'mdi-check-circle' },
				error: { color: 'error', icon: 'mdi-alert-circle' },
				warning: { color: 'warning', icon: 'mdi-alert' },
			};
			const cfg = config[type] || config.success;
			this.snackbar = { show: true, message, color: cfg.color, icon: cfg.icon };
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
			if (!Number(this.formData.operario_id)) {
				this.mostrarMensaje('Debe seleccionar un operario responsable.', 'warning');
				return false;
			}

			const reportesStore = useReportesStore();
			const anioFormulario = new Date(`${this.formData.fecha}T00:00:00`).getFullYear();
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
				await enfundeStore.cargarRegistros(fincaId || null);

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
