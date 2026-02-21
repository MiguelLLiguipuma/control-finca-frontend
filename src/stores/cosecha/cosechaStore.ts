import { defineStore } from 'pinia';
import {
	cosechaService,
	type BackendCinta,
	type PayloadCosecha,
} from '../../services/cosecha/cosechaService';
import { useUIStore } from '../../stores/uiStore';
import {
	calculateIsoWeekAge,
	getCurrentIsoWeekInfo,
} from '../../utils/dateIso';

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
	submitting: boolean;
	saldosPendientes: CintaCosecha[];
	fincaActivaId: number | null;
	semanaInicioCorte: number;
	semanaFinCorte: number;
	isOnline: boolean;
	colaSincronizacion: PayloadPendienteCosecha[];
	colaFallida: PayloadPendienteCosecha[];
	mostrarSoloAnioActual: boolean;
	monitoreoRedInicializado: boolean;
}

export interface ResultadoEnvioCosecha {
	ok: boolean;
	queued: boolean;
	message: string;
}

const COLA_KEY = 'cola_cosecha_pendiente';
const COLA_FALLIDA_KEY = 'cola_cosecha_fallida';
const MAX_INTENTOS_NO_ENCOLABLE = 3;
const VENTANA_CORTE_DEFAULT_INICIO = 11;
const VENTANA_CORTE_DEFAULT_FIN = 13;
const VENTANA_CORTE_MAX_AMPLITUD = 8;

type PayloadPendienteCosecha = PayloadCosecha & {
	intentos?: number;
	ultimoError?: string;
};

function toNonNegativeInt(value: unknown): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.trunc(n));
}

function obtenerInfoSemana(fecha = new Date()): {
	semana: number;
	anio: number;
} {
	return getCurrentIsoWeekInfo(fecha);
}

function parsearColaDesdeStorage(key: string): PayloadPendienteCosecha[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function resolverAnioDesdeBackend(
	item: BackendCinta,
	anioFallback: number,
): number {
	const raw = item.anio ?? item.year ?? item.año;
	const anio = Number(raw);
	return Number.isFinite(anio) ? anio : anioFallback;
}

function esErrorEncolable(error: unknown): boolean {
	const e = error as { response?: { status?: number } } | undefined;
	const status = e?.response?.status;
	if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
	if (status === undefined) return true;
	return status >= 500;
}

function extraerMensajeError(error: unknown): string {
	const e = error as
		| { response?: { data?: { error?: string; message?: string }; status?: number }; message?: string }
		| undefined;
	return (
		e?.response?.data?.error ||
		e?.response?.data?.message ||
		e?.message ||
		'No fue posible enviar el reporte.'
	);
}

export const useCosechaStore = defineStore('cosecha', {
	state: (): CosechaState => ({
		loading: false,
		submitting: false,
		saldosPendientes: [],
		fincaActivaId: null,
		semanaInicioCorte: 11,
		semanaFinCorte: 13,
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
		mostrarSoloAnioActual: false,
		colaSincronizacion: parsearColaDesdeStorage(COLA_KEY),
		colaFallida: parsearColaDesdeStorage(COLA_FALLIDA_KEY),
		monitoreoRedInicializado: false,
	}),

	getters: {
		infoSistema(): { semana: number; anio: number } {
			return obtenerInfoSemana();
		},

		semanaActual(): number {
			return this.infoSistema.semana;
		},

		anioActual(): number {
			return this.infoSistema.anio;
		},

		rangoCorteSugerido(): number[] {
			const inicio = Math.max(1, Math.min(52, toNonNegativeInt(this.semanaInicioCorte) || 11));
			const fin = Math.max(inicio, Math.min(52, toNonNegativeInt(this.semanaFinCorte) || 13));
			return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
		},

		totalDigitado(state): number {
			return state.saldosPendientes.reduce(
				(acc, item) => acc + toNonNegativeInt(item.cantidad_a_cosechar) + toNonNegativeInt(item.rechazo),
				0,
			);
		},

		totalRestante(state): number {
			return state.saldosPendientes.reduce((acc, item) => {
				const digitado = toNonNegativeInt(item.cantidad_a_cosechar) + toNonNegativeInt(item.rechazo);
				return acc + Math.max(0, toNonNegativeInt(item.saldo_en_campo) - digitado);
			}, 0);
		},

		saldosAgrupadosPorAnio(state): Record<number, CintaCosecha[]> {
			const { semana: sActual, anio: aActual } = this.infoSistema;
			const grupos: Record<number, CintaCosecha[]> = {};

			let lista = state.saldosPendientes.filter(
				(item) => toNonNegativeInt(item.saldo_en_campo) > 0,
			);

			// Mantener referencias al estado (sin clonar) para que la edición en la vista
			// impacte correctamente totalDigitado/totalRestante.
			lista.forEach((item) => {
				const diffAnios = aActual - item.anio;
				item.edad = diffAnios * 52 - item.semana_enfunde + sActual;
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

		saldosPorAnio(): Record<number, CintaCosecha[]> {
			return this.saldosAgrupadosPorAnio;
		},

		hayExcedidos(state): boolean {
			return state.saldosPendientes.some(
				(item) =>
					toNonNegativeInt(item.cantidad_a_cosechar) + toNonNegativeInt(item.rechazo) >
					toNonNegativeInt(item.saldo_en_campo),
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
		calcularEdadExacta(semanaEnfunde: number, anio: number): number {
			return calculateIsoWeekAge(semanaEnfunde, anio, new Date());
		},

		esCintaDeCorteActual(semanaEnfunde: number, anio: number): boolean {
			return this.calcularEdadExacta(semanaEnfunde, anio) === this.semanaInicioCorte;
		},

		esFrutaDeCorte(semanaEnfunde: number, anio: number): boolean {
			const edad = this.calcularEdadExacta(semanaEnfunde, anio);
			return edad >= this.semanaInicioCorte && edad <= this.semanaFinCorte;
		},

		configurarVentanaCorte(semanaInicio?: number, semanaFin?: number) {
			const inicioBase = toNonNegativeInt(semanaInicio);
			const finBase = toNonNegativeInt(semanaFin);
			const inicioNormalizado =
				inicioBase >= 1 && inicioBase <= 52
					? inicioBase
					: VENTANA_CORTE_DEFAULT_INICIO;
			const finNormalizado =
				finBase >= 1 && finBase <= 52
					? finBase
					: VENTANA_CORTE_DEFAULT_FIN;

			const inicio = Math.min(inicioNormalizado, finNormalizado);
			const fin = Math.max(inicioNormalizado, finNormalizado);

			// Blindaje: nunca permitir ventanas exageradas (ej: 1..52)
			if (fin - inicio > VENTANA_CORTE_MAX_AMPLITUD) {
				this.semanaInicioCorte = VENTANA_CORTE_DEFAULT_INICIO;
				this.semanaFinCorte = VENTANA_CORTE_DEFAULT_FIN;
				return;
			}

			this.semanaInicioCorte = inicio;
			this.semanaFinCorte = fin;
		},

		normalizarItemDigitacion(item: CintaCosecha) {
			item.cantidad_a_cosechar = toNonNegativeInt(item.cantidad_a_cosechar);
			item.rechazo = toNonNegativeInt(item.rechazo);
			item.saldo_en_campo = toNonNegativeInt(item.saldo_en_campo);

			const total = item.cantidad_a_cosechar + item.rechazo;
			if (total <= item.saldo_en_campo) return;

			const exceso = total - item.saldo_en_campo;
			if (item.rechazo >= exceso) {
				item.rechazo -= exceso;
				return;
			}

			const restante = exceso - item.rechazo;
			item.rechazo = 0;
			item.cantidad_a_cosechar = Math.max(
				0,
				item.cantidad_a_cosechar - restante,
			);
		},

		esExcedido(item: CintaCosecha): boolean {
			return (
				toNonNegativeInt(item.cantidad_a_cosechar) + toNonNegativeInt(item.rechazo) >
				toNonNegativeInt(item.saldo_en_campo)
			);
		},

		obtenerColorUrgencia(edad: number): string {
			if (edad > this.semanaFinCorte) return '#B71C1C'; // Crítico
			if (edad >= this.semanaInicioCorte && edad <= this.semanaFinCorte) return '#2E7D32'; // Óptimo
			return '#BDBDBD'; // Joven
		},

		calcularPorcentaje(item: CintaCosecha): number {
			const total = toNonNegativeInt(item.cantidad_a_cosechar) + toNonNegativeInt(item.rechazo);
			const saldo = toNonNegativeInt(item.saldo_en_campo);
			if (saldo === 0) return 0;
			return Math.min((total / saldo) * 100, 100);
		},

		ajustarDigitacion(
			item: CintaCosecha,
			campo: 'cantidad_a_cosechar' | 'rechazo',
			delta: number,
		) {
			this.normalizarItemDigitacion(item);
			const otroCampo = campo === 'cantidad_a_cosechar' ? 'rechazo' : 'cantidad_a_cosechar';
			const otro = toNonNegativeInt(item[otroCampo]);
			const maxPermitido = Math.max(0, toNonNegativeInt(item.saldo_en_campo) - otro);
			item[campo] = Math.min(maxPermitido, Math.max(0, toNonNegativeInt(item[campo]) + Math.trunc(delta)));
		},

		maximizarBuenos(item: CintaCosecha) {
			this.normalizarItemDigitacion(item);
			item.cantidad_a_cosechar = Math.max(0, toNonNegativeInt(item.saldo_en_campo) - toNonNegativeInt(item.rechazo));
		},

		async cargarSaldos(fincaId: number) {
			this.loading = true;
			this.fincaActivaId = fincaId;
			try {
				const data: BackendCinta[] = await cosechaService.getBalance(fincaId);
				const anioFallback = this.infoSistema.anio;

				this.saldosPendientes = data.map((item) => ({
					calendario_id: item.calendario_id,
					semana_enfunde: Number(item.semana_enfunde),
					anio: resolverAnioDesdeBackend(item, anioFallback),
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
				const edadActual = this.calcularEdadExacta(
					item.semana_enfunde,
					item.anio,
				);

				if (edadActual >= this.semanaInicioCorte) {
					item.cantidad_a_cosechar = item.saldo_en_campo;
					item.rechazo = 0;
				}
			});
		},

		async enviarCosecha(
			fincaId: number,
			fecha: string,
		): Promise<ResultadoEnvioCosecha> {
			if (this.submitting) {
				return {
					ok: false,
					queued: false,
					message: 'Ya hay un envío en progreso.',
				};
			}

			this.saldosPendientes.forEach((item) =>
				this.normalizarItemDigitacion(item),
			);

			const detalles = this.saldosPendientes
				.filter((s) => s.cantidad_a_cosechar > 0 || s.rechazo > 0)
				.map((s) => ({
					calendario_id: s.calendario_id,
					cantidad_racimos: s.cantidad_a_cosechar,
					cantidad_rechazo: s.rechazo,
				}));

			if (!detalles.length) {
				return {
					ok: false,
					queued: false,
					message: 'No hay racimos para enviar.',
				};
			}

			const payload: PayloadCosecha = {
				id_local: crypto.randomUUID(),
				finca_id: fincaId,
				fecha,
				timestamp: Date.now(),
				detalles,
			};

			this.submitting = true;
			try {
				await cosechaService.registrarLiquidacion(payload);
				await this.cargarSaldos(fincaId);
				return {
					ok: true,
					queued: false,
					message: 'Reporte enviado correctamente.',
				};
			} catch (error) {
				if (esErrorEncolable(error)) {
					this.colaSincronizacion.push({ ...payload, intentos: 0 });
					this.persistirCola();
					return {
						ok: true,
						queued: true,
						message: 'Sin conexión. Reporte guardado para sincronizar luego.',
					};
				}

				return {
					ok: false,
					queued: false,
					message: extraerMensajeError(error),
				};
			} finally {
				this.submitting = false;
			}
		},

		persistirCola() {
			if (typeof localStorage === 'undefined') return;
			localStorage.setItem(COLA_KEY, JSON.stringify(this.colaSincronizacion));
			localStorage.setItem(COLA_FALLIDA_KEY, JSON.stringify(this.colaFallida));
		},

		async sincronizarCola() {
			if (!this.isOnline || !this.colaSincronizacion.length) return;

			const pendientes = [...this.colaSincronizacion];
			const restantes: PayloadPendienteCosecha[] = [];
			let movidosAFallida = 0;

			for (const payload of pendientes) {
				try {
					await cosechaService.registrarLiquidacion(payload);
				} catch (error) {
					const e = error as { response?: { status?: number; data?: { error?: string; message?: string } } } | undefined;
					const intentos = (payload.intentos || 0) + 1;
					const ultimoError =
						e?.response?.data?.error ||
						e?.response?.data?.message ||
						'Error desconocido en sincronización';

					if (!esErrorEncolable(error) && intentos >= MAX_INTENTOS_NO_ENCOLABLE) {
						this.colaFallida.push({
							...payload,
							intentos,
							ultimoError,
						});
						movidosAFallida += 1;
						continue;
					}

					restantes.push({
						...payload,
						intentos,
						ultimoError,
					});
				}
			}

			this.colaSincronizacion = restantes;
			this.persistirCola();

			if (this.fincaActivaId && pendientes.length !== restantes.length) {
				await this.cargarSaldos(this.fincaActivaId);
			}

			if (movidosAFallida > 0) {
				useUIStore().showWarning(
					`${movidosAFallida} reporte(s) requieren revisión manual por errores de validación.`,
				);
			}
		},

		inicializarMonitoreoRed() {
			if (this.monitoreoRedInicializado) return;
			this.monitoreoRedInicializado = true;

			window.addEventListener('online', () => {
				this.isOnline = true;
				void this.sincronizarCola();
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});

			if (this.isOnline) {
				void this.sincronizarCola();
			}
		},
	},
});
