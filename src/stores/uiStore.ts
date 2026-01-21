import { defineStore } from 'pinia';

// 1. Definimos los tipos de colores permitidos (Union Type)
// Esto evita errores de dedo como escribir "sucess" en lugar de "success"
export type SnackbarColor = 'success' | 'error' | 'warning' | 'info';

// 2. Definimos la estructura del Estado
interface SnackbarState {
	show: boolean;
	text: string;
	color: SnackbarColor;
	timeout: number;
}

export interface UIState {
	snackbar: SnackbarState;
	loadingGlobal: boolean;
}

export const useUIStore = defineStore('ui', {
	// Tipamos el retorno del estado
	state: (): UIState => ({
		snackbar: {
			show: false,
			text: '',
			color: 'info',
			timeout: 5000,
		},
		loadingGlobal: false,
	}),

	actions: {
		// Tipamos los parámetros explícitamente
		notify(text: string, color: SnackbarColor = 'info') {
			this.snackbar.text = text;
			this.snackbar.color = color;
			this.snackbar.show = true;
		},

		// Métodos directos
		showError(text: string) {
			this.notify(text, 'error');
		},

		showSuccess(text: string) {
			this.notify(text, 'success');
		},

		showWarning(text: string) {
			this.notify(text, 'warning');
		},
	},
});
