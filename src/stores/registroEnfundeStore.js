import { defineStore } from 'pinia';
import { useEnfundeStore } from './enfundeStore.js';
import { useReportesStore } from './reportesStore.js'; // 👈 Importado para seguridad
import { useFincaStore } from './fincaStore';

export const useRegistroEnfundeStore = defineStore('registroEnfunde', {
	state: () => ({
		globalLoading: false,
		loadingGuardar: false,
		isValid: false,
		tablaKey: 0,
		formData: {
			finca_id: null,
			usuario_id: null,
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
			this.formData.hora_registro = new Date().toTimeString().slice(0, 5);
			this.formData.fecha = new Date().toISOString().split('T')[0];
		},

		resetFormulario() {
			this.formData.cantidad_fundas = null;
			this.formData.calidad = null;
			this.formData.color = null;
			this.formData.observaciones = '';
			this.initForm();
		},

		mostrarMensaje(message, type = 'success') {
			const config = {
				success: { color: 'success', icon: 'mdi-check-circle' },
				error: { color: 'error', icon: 'mdi-alert-circle' },
				warning: { color: 'warning', icon: 'mdi-alert' },
			};
			const cfg = config[type] || config.success;
			this.snackbar = { show: true, message, color: cfg.color, icon: cfg.icon };
		},

		async guardarRegistro() {
			// 🛡️ VALIDACIÓN DE SEGURIDAD: Bloqueo por año
			const reportesStore = useReportesStore();
			const anioFormulario = new Date(
				this.formData.fecha + 'T00:00:00',
			).getFullYear();
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

				// 1. Enviamos el registro
				await enfundeStore.crearRegistro({ ...this.formData });

				// 2. 🔥 LA SOLUCIÓN: Recargar registros desde el servidor
				// Esto asegura que los nombres de finca, usuario y cinta se vean de inmediato
				const fincaStore = useFincaStore();
				const fincaId = Number(
					this.formData.finca_id ?? fincaStore.fincaSeleccionadaId ?? 0,
				);
				await enfundeStore.cargarRegistros(fincaId || null);

				this.mostrarMensaje('Registro guardado correctamente');
				this.resetFormulario();

				// 3. Forzamos la actualización visual de la tabla
				this.tablaKey++;

				return true;
			} catch (err) {
				this.mostrarMensaje(
					err.response?.data?.error || 'Error al guardar',
					'error',
				);
				return false;
			} finally {
				this.loadingGuardar = false;
			}
		},
	},
});
