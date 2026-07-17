import { defineStore } from 'pinia';
import {
	alertaService,
	type AlertaOperativa,
	type AlertasQuery,
	type AlertasResumen,
	type GenerarAlertasPayload,
} from '@/services/alertaService';
import { useUIStore } from '@/stores/uiStore';

interface AlertaState {
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
		async cargar(params: { silent?: boolean; query?: AlertasQuery } = {}) {
			this.loading = true;
			if (!params.silent) this.error = '';
			try {
				const [items, resumen] = await Promise.all([
					alertaService.listar({ limit: 40, ...(params.query || {}) }),
					alertaService.resumen(params.query || {}),
				]);
				this.items = items;
				this.resumen = resumen;
				this.ultimoRefresh = new Date().toISOString();
			} catch (error) {
				this.error = errorMessage(error, 'No se pudieron cargar alertas operativas.');
				if (!params.silent) {
					useUIStore().showWarning(this.error, {
						source: 'Centro de alertas',
						scope: 'sistema',
					});
				}
			} finally {
				this.loading = false;
			}
		},

		async generar(payload: GenerarAlertasPayload = {}) {
			this.loading = true;
			this.error = '';
			try {
				const result = await alertaService.generar(payload);
				await this.cargar({ silent: true });
				useUIStore().showSuccess('Diagnóstico de alertas actualizado.', {
					source: 'Centro de alertas',
					scope: 'sistema',
				});
				return result;
			} catch (error) {
				this.error = errorMessage(error, 'No se pudo generar el diagnóstico de alertas.');
				useUIStore().showError(this.error, {
					source: 'Centro de alertas',
					scope: 'sistema',
				});
				throw error;
			} finally {
				this.loading = false;
			}
		},

		async marcarLeida(id: number) {
			const item = this.items.find((alerta) => alerta.id === id);
			if (item && item.estado !== 'resuelta') item.estado = 'leida';
			try {
				await alertaService.marcarLeida(id);
			} catch (error) {
				await this.cargar({ silent: true });
				throw error;
			}
		},

		async resolver(id: number) {
			const item = this.items.find((alerta) => alerta.id === id);
			if (item) item.estado = 'resuelta';
			try {
				await alertaService.resolver(id);
				this.items = this.items.filter((alerta) => alerta.id !== id);
				this.resumen = {
					...this.resumen,
					abiertas: Math.max(0, this.resumen.abiertas - 1),
				};
			} catch (error) {
				await this.cargar({ silent: true });
				throw error;
			}
		},
	},
});
