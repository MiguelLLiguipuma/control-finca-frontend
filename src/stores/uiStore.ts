import { defineStore } from 'pinia';

// 1. Definimos los tipos de colores permitidos (Union Type)
// Esto evita errores de dedo como escribir "sucess" en lugar de "success"
export type SnackbarColor = 'success' | 'error' | 'warning' | 'info';
export type NotificationScope = 'sistema' | 'vista' | 'seguridad' | 'operacion';

// 2. Definimos la estructura del Estado
interface SnackbarState {
	show: boolean;
	text: string;
	color: SnackbarColor;
	timeout: number;
}

export interface AppNotification {
	id: string;
	title: string;
	message: string;
	color: SnackbarColor;
	scope: NotificationScope;
	source?: string;
	createdAt: string;
	read: boolean;
	persist: boolean;
}

interface NotifyOptions {
	title?: string;
	source?: string;
	scope?: NotificationScope;
	timeout?: number;
	persist?: boolean;
}

export interface UIState {
	snackbar: SnackbarState;
	notifications: AppNotification[];
	loadingGlobal: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'control_finca_notifications';
const MAX_NOTIFICATIONS = 40;

function safeReadNotifications(): AppNotification[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(
			localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || '[]',
		);
		return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : [];
	} catch {
		return [];
	}
}

function safePersistNotifications(items: AppNotification[]) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(
			NOTIFICATIONS_STORAGE_KEY,
			JSON.stringify(items.filter((item) => item.persist).slice(0, MAX_NOTIFICATIONS)),
		);
	} catch {
		// No bloqueamos la experiencia si el navegador no permite persistir.
	}
}

function buildNotificationId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultTitle(color: SnackbarColor): string {
	if (color === 'success') return 'Acción completada';
	if (color === 'warning') return 'Atención requerida';
	if (color === 'error') return 'Error detectado';
	return 'Información';
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
		notifications: safeReadNotifications(),
		loadingGlobal: false,
	}),

	getters: {
		unreadNotifications: (state) =>
			state.notifications.filter((item) => !item.read),
		unreadNotificationCount(): number {
			return this.unreadNotifications.length;
		},
	},

	actions: {
		// Tipamos los parámetros explícitamente
		notify(text: string, color: SnackbarColor = 'info', options: NotifyOptions = {}) {
			this.snackbar.text = text;
			this.snackbar.color = color;
			this.snackbar.timeout = options.timeout ?? 5000;
			this.snackbar.show = true;

			const notification: AppNotification = {
				id: buildNotificationId(),
				title: options.title || defaultTitle(color),
				message: text,
				color,
				scope: options.scope || 'vista',
				source: options.source,
				createdAt: new Date().toISOString(),
				read: false,
				persist: options.persist ?? true,
			};
			this.notifications = [notification, ...this.notifications].slice(
				0,
				MAX_NOTIFICATIONS,
			);
			safePersistNotifications(this.notifications);
		},

		// Métodos directos
		showError(text: string, options?: NotifyOptions) {
			this.notify(text, 'error', options);
		},

		showSuccess(text: string, options?: NotifyOptions) {
			this.notify(text, 'success', options);
		},

		showWarning(text: string, options?: NotifyOptions) {
			this.notify(text, 'warning', options);
		},

		showInfo(text: string, options?: NotifyOptions) {
			this.notify(text, 'info', options);
		},

		markNotificationRead(id: string) {
			this.notifications = this.notifications.map((item) =>
				item.id === id ? { ...item, read: true } : item,
			);
			safePersistNotifications(this.notifications);
		},

		markAllNotificationsRead() {
			this.notifications = this.notifications.map((item) => ({
				...item,
				read: true,
			}));
			safePersistNotifications(this.notifications);
		},

		removeNotification(id: string) {
			this.notifications = this.notifications.filter((item) => item.id !== id);
			safePersistNotifications(this.notifications);
		},

		clearNotifications() {
			this.notifications = [];
			safePersistNotifications(this.notifications);
		},
	},
});
