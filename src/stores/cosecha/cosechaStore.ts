import { defineStore } from 'pinia';
import {
	cosechaService,
	type BackendCinta,
	type PayloadCosecha,
} from '../../services/cosecha/cosechaService';
import { useUIStore } from '../../stores/uiStore';

export interface CintaCosecha {
	calendario_id: number;
	semana_enfunde: number;
	anio: number;
	saldo_en_campo: number;
	color_cinta: string;
	color_hex: string;
	cantidad_a_cosechar: number;
	rechazo: number;
	edad: number;
}

interface CosechaState {
	loading: boolean;
	saldosPendientes: CintaCosecha[];
	fincaActivaId: number | null;
	isOnline: boolean;
	colaSincronizacion: PayloadCosecha[];
	mostrarSoloAnioActual: boolean;
}

export const useCosechaStore = defineStore('cosecha', {
	state: (): CosechaState => ({
		loading: false,
		saldosPendientes: [],
		fincaActivaId: null,
		isOnline: navigator.onLine,
		mostrarSoloAnioActual: false,
		colaSincronizacion: JSON.parse(
			localStorage.getItem('cola_cosecha_pendiente') || '[]',
		),
	}),

	getters: {
		infoSistema(): { semana: number; anio: number } {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() + 4 - (d.getDay() || 7));
			const yearStart = new Date(d.getFullYear(), 0, 1);
			const weekNo = Math.ceil(
				((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
			);
			return { semana: weekNo, anio: d.getFullYear() };
		},

		totalDigitado(state): number {
			return state.saldosPendientes.reduce(
				(acc, item) =>
					acc + (item.cantidad_a_cosechar || 0) + (item.rechazo || 0),
				0,
			);
		},

		totalRestante(state): number {
			return state.saldosPendientes.reduce((acc, item) => {
				const digitado = (item.cantidad_a_cosechar || 0) + (item.rechazo || 0);
				return acc + Math.max(0, item.saldo_en_campo - digitado);
			}, 0);
		},

		saldosAgrupadosPorAnio(state): Record<number, CintaCosecha[]> {
			const { semana: sActual, anio: aActual } = this.infoSistema;
			const grupos: Record<number, CintaCosecha[]> = {};

			let lista = state.saldosPendientes
				.filter((item) => item.saldo_en_campo > 0)
				.map((item) => {
					// Cálculo de edad REAL basado en el año que viene de la BD
					const diffAnios = aActual - item.anio;
					const edad = diffAnios * 52 - item.semana_enfunde + sActual;
					return { ...item, edad };
				});

			if (state.mostrarSoloAnioActual) {
				lista = lista.filter((item) => item.anio === aActual);
			}

			// Ordenar: lo más viejo (2024) aparece primero
			lista.sort((a, b) =>
				a.anio !== b.anio
					? a.anio - b.anio
					: a.semana_enfunde - b.semana_enfunde,
			);

			lista.forEach((item) => {
				if (!grupos[item.anio]) grupos[item.anio] = [];
				grupos[item.anio].push(item);
			});

			return grupos;
		},

		hayExcedidos(state): boolean {
			return state.saldosPendientes.some(
				(item) => item.cantidad_a_cosechar + item.rechazo > item.saldo_en_campo,
			);
		},

		estadoOperacion(): string {
			if (this.hayExcedidos) return 'ERROR EN SALDOS';
			return this.totalDigitado > 0 ? 'LISTO PARA ENVIAR' : 'ESPERANDO DATOS';
		},

		estadoColor(): string {
			if (this.hayExcedidos) return 'error';
			return this.totalDigitado > 0 ? 'success' : 'grey';
		},
	},

	actions: {
		esExcedido(item: CintaCosecha): boolean {
			return item.cantidad_a_cosechar + item.rechazo > item.saldo_en_campo;
		},

		obtenerColorUrgencia(edad: number): string {
			if (edad >= 14) return '#B71C1C'; // Crítico
			if (edad >= 11 && edad <= 13) return '#2E7D32'; // Óptimo
			return '#BDBDBD'; // Joven
		},

		calcularPorcentaje(item: CintaCosecha): number {
			const total = (item.cantidad_a_cosechar || 0) + (item.rechazo || 0);
			if (item.saldo_en_campo === 0) return 0;
			return Math.min((total / item.saldo_en_campo) * 100, 100);
		},

		async cargarSaldos(fincaId: number) {
			this.loading = true;
			this.fincaActivaId = fincaId;
			try {
				const data: any[] = await cosechaService.getBalance(fincaId);

				this.saldosPendientes = data.map((item) => ({
					calendario_id: item.calendario_id,
					semana_enfunde: Number(item.semana_enfunde),
					// AQUÍ LA CLAVE: Usamos 'item.anio' directamente de la vista corregida
					anio: Number(item.anio),
					saldo_en_campo: Number(item.saldo_en_campo),
					color_cinta: item.color_cinta,
					color_hex: item.color_hex,
					cantidad_a_cosechar: 0,
					rechazo: 0,
					edad: 0,
				}));
			} catch (error) {
				useUIStore().showError('Error al cargar inventario del servidor.');
			} finally {
				this.loading = false;
			}
		},

		sugerirCorteAutomatico() {
			this.saldosPendientes.forEach((item) => {
				const { semana: sActual, anio: aActual } = this.infoSistema;
				const diffAnios = aActual - item.anio;
				const edadActual = diffAnios * 52 - item.semana_enfunde + sActual;

				if (edadActual >= 11) {
					item.cantidad_a_cosechar = item.saldo_en_campo;
					item.rechazo = 0;
				}
			});
		},

		async enviarCosecha(fincaId: number, fecha: string, usuarioId: number) {
			const detalles = this.saldosPendientes
				.filter((s) => s.cantidad_a_cosechar > 0 || s.rechazo > 0)
				.map((s) => ({
					calendario_id: s.calendario_id,
					cantidad_racimos: s.cantidad_a_cosechar,
					cantidad_rechazo: s.rechazo,
				}));

			const payload: PayloadCosecha = {
				id_local: crypto.randomUUID(),
				finca_id: fincaId,
				fecha,
				usuario_id: usuarioId,
				timestamp: Date.now(),
				detalles,
			};

			try {
				await cosechaService.registrarLiquidacion(payload);
				await this.cargarSaldos(fincaId);
				return true;
			} catch (error) {
				this.colaSincronizacion.push(payload);
				this.persistirCola();
				return true;
			}
		},

		persistirCola() {
			localStorage.setItem(
				'cola_cosecha_pendiente',
				JSON.stringify(this.colaSincronizacion),
			);
		},

		inicializarMonitoreoRed() {
			window.addEventListener('online', () => {
				this.isOnline = true;
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
		},
	},
});
