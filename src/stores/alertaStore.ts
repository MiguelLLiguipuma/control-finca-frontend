import { defineStore } from 'pinia';
import {
	alertaService,
	type AlertaOperativa,
	type AlertasQuery,
	type AlertasResumen,
	type GenerarAlertasPayload,
} from '@/services/alertaService';
import { useUIStore } from '@/stores/uiStore';
import { readSessionToken } from '@/utils/sessionPolicy';

interface AlertaState {
	sessionToken: string | null;
	requestSeq: number;
	items: AlertaOperativa[];
	resumen: AlertasResumen;
	loading: boolean;
	error: string;
	ultimoRefresh: string | null;
}

const emptyResumen = (): AlertasResumen => ({
	abiertas: 0,
	pendientes: 0,
	criticas: 0,
	altas: 0,
});

function errorMessage(error: unknown, fallback: string): string {
	const err = error as { response?: { data?: { message?: string; error?: string } } };
	return err.response?.data?.message || err.response?.data?.error || fallback;
}

export const useAlertaStore = defineStore('alerta', {
	state: (): AlertaState => ({
		sessionToken: readSessionToken(),
		requestSeq: 0,
		items: [],
		resumen: emptyResumen(),
		loading: false,
		error: '',
		ultimoRefresh: null,
	}),

	getters: {
		unreadCount: (state) =>
			state.items.filter((item) => item.estado !== 'leida' && item.estado !== 'resuelta').length,
		criticalCount: (state) =>
			state.items.filter(
				(item) => item.severidad === 'critica' && item.estado !== 'resuelta',
			).length,
		recentItems: (state) => state.items.slice(0, 12),
	},

	actions: {
		activarSesion() {
			const token = readSessionToken();
			if (this.sessionToken === token) return;
			this.sessionToken = token;
			this.requestSeq++;
			this.items = [];
			this.resumen = emptyResumen();
			this.loading = false;
			this.error = '';
			this.ultimoRefresh = null;
		},
		async cargar(params: { silent?: boolean; query?: AlertasQuery } = {}) {
			this.activarSesion();
			const token = this.sessionToken;
			if (!token) return;
			const seq = ++this.requestSeq;
			const current = () => seq === this.requestSeq && token === readSessionToken();
			this.loading = true;
			if (!params.silent) this.error = '';
			try {
				const [items, resumen] = await Promise.all([
					alertaService.listar({ limit: 40, ...(params.query || {}) }),
					alertaService.resumen(params.query || {}),
				]);
				if (!current()) return;
				this.items = items;
				this.error = '';
				this.resumen = resumen;
				this.ultimoRefresh = new Date().toISOString();
			} catch (error) {
				if (!current()) return;
				this.error = errorMessage(error, 'No se pudieron cargar alertas operativas.');
				if (!params.silent) {
					useUIStore().showWarning(this.error, {
						source: 'Centro de alertas',
						scope: 'sistema',
					});
				}
			} finally {
				if (current()) this.loading = false;
			}
		},

		async generar(payload: GenerarAlertasPayload = {}) {
			this.activarSesion();
			const token = this.sessionToken;
			this.loading = true;
			this.error = '';
			try {
				const result = await alertaService.generar(payload);
				if (token !== readSessionToken()) return;
				await this.cargar({ silent: true });
				if (token !== readSessionToken()) return;
				useUIStore().showSuccess('Diagnóstico de alertas actualizado.', {
					source: 'Centro de alertas',
					scope: 'sistema',
				});
				return result;
			} catch (error) {
				if (token !== readSessionToken()) return;
				this.error = errorMessage(error, 'No se pudo generar el diagnóstico de alertas.');
				useUIStore().showError(this.error, {
					source: 'Centro de alertas',
					scope: 'sistema',
				});
				throw error;
			} finally {
				if (token === readSessionToken()) this.loading = false;
			}
		},

		async marcarLeida(id: number) {
			const token = readSessionToken();
			const item = this.items.find((alerta) => alerta.id === id);
			if (item && item.estado !== 'resuelta') item.estado = 'leida';
			try {
				await alertaService.marcarLeida(id);
			} catch (error) {
				if (token !== readSessionToken()) return;
				await this.cargar({ silent: true });
				throw error;
			}
		},

		async resolver(id: number) {
			const token = readSessionToken();
			const item = this.items.find((alerta) => alerta.id === id);
			if (item) item.estado = 'resuelta';
			try {
				await alertaService.resolver(id);
				if (token !== readSessionToken()) return;
				this.items = this.items.filter((alerta) => alerta.id !== id);
				this.resumen = {
					...this.resumen,
					abiertas: Math.max(0, this.resumen.abiertas - 1),
				};
			} catch (error) {
				if (token !== readSessionToken()) return;
				await this.cargar({ silent: true });
				throw error;
			}
		},
	},
});
