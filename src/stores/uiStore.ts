import { defineStore } from 'pinia';
import { propietarioCosecha } from '@/utils/cosechaLocal';

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
	propietario: string | null;
	snackbar: SnackbarState;
	notifications: AppNotification[];
	loadingGlobal: boolean;
}

const notificationKey = (owner: string) => `control_finca_notifications_v2:${owner}`;
const MAX_NOTIFICATIONS = 40;

function safeReadNotifications(owner: string | null): AppNotification[] {
	if (!owner || owner !== propietarioCosecha()) return [];
	try {
		const parsed = JSON.parse(
			localStorage.getItem(notificationKey(owner)) || '[]',
		);
		return Array.isArray(parsed) ? parsed.filter((item) => item &&
			typeof item.id === 'string' && typeof item.title === 'string' &&
			typeof item.message === 'string' && typeof item.createdAt === 'string' &&
			Number.isFinite(Date.parse(item.createdAt)) && typeof item.read === 'boolean' &&
			item.persist === true && ['success', 'error', 'warning', 'info'].includes(item.color) &&
			['sistema', 'vista', 'seguridad', 'operacion'].includes(item.scope)
		).slice(0, MAX_NOTIFICATIONS) : [];
	} catch {
		return [];
	}
}

function safePersistNotifications(owner: string | null, items: AppNotification[]) {
	if (!owner || owner !== propietarioCosecha()) return;
	try {
		localStorage.setItem(
			notificationKey(owner),
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
		propietario: propietarioCosecha(),
		snackbar: {
			show: false,
			text: '',
			color: 'info',
			timeout: 5000,
		},
		notifications: safeReadNotifications(propietarioCosecha()),
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
		activarSesion() {
			const owner = propietarioCosecha();
			if (owner === this.propietario) return;
			this.propietario = owner;
			this.notifications = safeReadNotifications(owner);
			this.snackbar.show = false;
			this.snackbar.text = '';
		},
		// Tipamos los parámetros explícitamente
		notify(text: string, color: SnackbarColor = 'info', options: NotifyOptions = {}) {
			this.activarSesion();
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
			safePersistNotifications(this.propietario, this.notifications);
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
			this.activarSesion();
			this.notifications = this.notifications.map((item) =>
				item.id === id ? { ...item, read: true } : item,
			);
			safePersistNotifications(this.propietario, this.notifications);
		},

		markAllNotificationsRead() {
			this.activarSesion();
			this.notifications = this.notifications.map((item) => ({
				...item,
				read: true,
			}));
			safePersistNotifications(this.propietario, this.notifications);
		},

		removeNotification(id: string) {
			this.activarSesion();
			this.notifications = this.notifications.filter((item) => item.id !== id);
			safePersistNotifications(this.propietario, this.notifications);
		},

		clearNotifications() {
			this.activarSesion();
			this.notifications = [];
			safePersistNotifications(this.propietario, this.notifications);
		},
	},
});
