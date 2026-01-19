import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
	state: () => ({
		snackbar: {
			show: false,
			text: '',
			color: 'info', // success, error, warning, info
			timeout: 5000,
		},
		loadingGlobal: false,
	}),
	actions: {
		// Método genérico para notificar
		notify(text, color = 'info') {
			this.snackbar.text = text;
			this.snackbar.color = color;
			this.snackbar.show = true;
		},
		// Métodos directos por tipo
		showError(text) {
			this.notify(text, 'error');
		},
		showSuccess(text) {
			this.notify(text, 'success');
		},
		showWarning(text) {
			this.notify(text, 'warning');
		},
	},
});
