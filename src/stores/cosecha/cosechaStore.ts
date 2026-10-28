import { defineStore } from 'pinia';
import { crearUuid } from '@/utils/uuid';
import { claveColaCosecha, propietarioCosecha, CLAVES_COLA_ANTIGUA } from '@/utils/cosechaLocal';
import { leerInventarioLocal, guardarInventarioLocal, descontarConfirmadoLocal, permiteCopiaLocal } from '@/utils/cosechaOffline';
import {
	cosechaService,
	type BackendCinta,
	type PayloadCosecha,
} from '../../services/cosecha/cosechaService';
import { useUIStore } from '../../stores/uiStore';
import {
	calculateIsoWeekAge,
	getCurrentIsoWeekInfo,
	MAX_VISIBLE_CINTA_AGE_WEEKS,
	isIsoWeekAgeVisible,
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
	inventarioLocal: boolean;
	inventarioConsultadoEn: number | null;
	errorCopiaLocal: string;
	cargaInventarioSeq: number;
	loading: boolean;
	submitting: boolean;
	sincronizando: boolean;
	saldosPendientes: CintaCosecha[];
	fincaActivaId: number | null;
	semanaInicioCorte: number;
	semanaFinCorte: number;
	isOnline: boolean;
	colaSincronizacion: PayloadPendienteCosecha[];
	colaFallida: PayloadPendienteCosecha[];
	mostrarSoloAnioActual: boolean;
	monitoreoRedInicializado: boolean;
	propietario: string | null;
	pendientesAntiguos: number;
	errorAlmacenamiento: string;
}

export interface ResultadoEnvioCosecha {
	ok: boolean;
	queued: boolean;
	message: string;
}

const VENTANA_CORTE_DEFAULT_INICIO = 11;
const VENTANA_CORTE_DEFAULT_FIN = 12;
const VENTANA_CORTE_MAX_AMPLITUD = 8;

export type PayloadPendienteCosecha = PayloadCosecha & {
	intentos?: number;
	ultimoError?: string;
};

function esReporteLocal(value: unknown): value is PayloadPendienteCosecha {
	if (!value || typeof value !== 'object') return false;
	const item = value as PayloadPendienteCosecha;
	return typeof item.id_local === 'string' && item.id_local.length > 0 &&
		Number.isSafeInteger(item.finca_id) && item.finca_id > 0 &&
		typeof item.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.fecha) &&
		Number.isFinite(item.timestamp) && Array.isArray(item.detalles) && item.detalles.length > 0 &&
		item.detalles.every(d => d && Number.isSafeInteger(d.calendario_id) && d.calendario_id > 0 &&
			Number.isSafeInteger(d.cantidad_racimos) && d.cantidad_racimos >= 0 &&
			Number.isSafeInteger(d.cantidad_rechazo) && d.cantidad_rechazo >= 0);
}

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
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
	if (status === undefined) return true;
	return status === 408 || status === 429 || status >= 500;
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
		inventarioLocal: false,
		inventarioConsultadoEn: null,
		errorCopiaLocal: '',
		cargaInventarioSeq: 0,
		loading: false,
		submitting: false,
		sincronizando: false,
		saldosPendientes: [],
		fincaActivaId: null,
		semanaInicioCorte: VENTANA_CORTE_DEFAULT_INICIO,
		semanaFinCorte: VENTANA_CORTE_DEFAULT_FIN,
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
		mostrarSoloAnioActual: false,
		colaSincronizacion: [],
		colaFallida: [],
		propietario: null,
		pendientesAntiguos: 0,
		errorAlmacenamiento: '',
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
			const inicio = Math.max(
				0,
				Math.min(52, toNonNegativeInt(this.semanaInicioCorte) || VENTANA_CORTE_DEFAULT_INICIO),
			);
			const fin = Math.max(
				inicio,
				Math.min(52, toNonNegativeInt(this.semanaFinCorte) || VENTANA_CORTE_DEFAULT_FIN),
			);
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
			const { anio: aActual } = this.infoSistema;
			const grupos: Record<number, CintaCosecha[]> = {};

			let lista = state.saldosPendientes.filter(
				(item) => toNonNegativeInt(item.saldo_en_campo) > 0 || item.cantidad_a_cosechar > 0 || item.rechazo > 0,
			);

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
		activarSesion() {
			if (this.submitting || this.sincronizando) return;
			const propietario = propietarioCosecha();
			if (this.propietario === propietario) return;
			this.propietario = propietario;
			this.saldosPendientes = [];
			this.fincaActivaId = null;
			this.inventarioLocal = false;
			this.inventarioConsultadoEn = null;
			this.errorCopiaLocal = '';
			this.cargaInventarioSeq++;
			this.colaSincronizacion = [];
			this.colaFallida = [];
			this.errorAlmacenamiento = '';
			this.pendientesAntiguos = CLAVES_COLA_ANTIGUA.reduce((n, key) => n + parsearColaDesdeStorage(key).length, 0);
			if (!propietario) return;
			try {
				const raw = localStorage.getItem(claveColaCosecha(propietario));
				if (!raw) return;
				const data = JSON.parse(raw);
				if (!Array.isArray(data.pendientes) || !Array.isArray(data.fallidos) ||
					![...data.pendientes, ...data.fallidos].every(esReporteLocal)) throw new Error('Formato invalido');
				this.colaSincronizacion = data.pendientes;
				this.colaFallida = data.fallidos;
			} catch {
				this.errorAlmacenamiento = 'No se pudieron leer los reportes locales. No borres los datos del navegador; conserva este dispositivo para recuperarlos.';
			}
		},

		async reintentarFallido(id: string, correccion: Pick<PayloadCosecha, 'fecha' | 'detalles'>): Promise<boolean> {
			if (this.submitting || this.sincronizando || !this.propietario || this.propietario !== propietarioCosecha() || this.errorAlmacenamiento) return false;
			const original = this.colaFallida.find((item) => item.id_local === id);
			if (!original || !/^\d{4}-\d{2}-\d{2}$/.test(correccion.fecha)) return false;
			const fecha = new Date(`${correccion.fecha}T00:00:00Z`);
			if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== correccion.fecha) return false;
			if (correccion.detalles.length !== original.detalles.length || !correccion.detalles.every((d, i) =>
				d.calendario_id === original.detalles[i].calendario_id &&
				Number.isSafeInteger(d.cantidad_racimos) && d.cantidad_racimos >= 0 &&
				Number.isSafeInteger(d.cantidad_rechazo) && d.cantidad_rechazo >= 0,
			) || !correccion.detalles.some((d) => d.cantidad_racimos + d.cantidad_rechazo > 0)) return false;
			const fallidos = this.colaFallida;
			const pendientes = this.colaSincronizacion;
			// Conservamos el UUID: incluso un envio confirmado cuya respuesta se perdio no se duplica.
			this.colaSincronizacion = [...pendientes, { ...original, ...correccion, detalles: correccion.detalles.map(d => ({ ...d })), intentos: 0, ultimoError: undefined }];
			this.colaFallida = fallidos.filter((item) => item.id_local !== id);
			try {
				this.persistirCola();
			} catch {
				this.colaFallida = fallidos;
				this.colaSincronizacion = pendientes;
				useUIStore().showError('No se pudo guardar la correccion. El reporte original sigue conservado.');
				return false;
			}
			await this.sincronizarCola();
			return true;
		},

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
				inicioBase >= 0 && inicioBase <= 52
					? inicioBase
					: VENTANA_CORTE_DEFAULT_INICIO;
			const finNormalizado =
				finBase >= 0 && finBase <= 52
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

			// Un saldo menor es un conflicto, no permiso para recortar el conteo del operador.
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
			if (delta < 0) item[campo] = Math.max(0, item[campo] + Math.trunc(delta));
			else if (!this.esExcedido(item)) item[campo] = Math.min(maxPermitido, item[campo] + Math.trunc(delta));
		},

		maximizarBuenos(item: CintaCosecha) {
			this.normalizarItemDigitacion(item);
			item.cantidad_a_cosechar = Math.max(0, toNonNegativeInt(item.saldo_en_campo) - toNonNegativeInt(item.rechazo));
		},

		async cargarSaldos(fincaId: number): Promise<boolean> {
			this.activarSesion();
			const requestId = ++this.cargaInventarioSeq;
			const propietario = this.propietario;
			const fincaAnteriorId = this.fincaActivaId;
			this.loading = true;
			this.fincaActivaId = fincaId;
			if (fincaAnteriorId !== fincaId) {
				this.inventarioLocal = false;
				this.inventarioConsultadoEn = null;
			}
			try {
				let data: BackendCinta[];
				let copia = false;
				let consultadoEn = Date.now();
				try {
					if (!this.isOnline) throw new Error('Sin conexion');
					data = await cosechaService.getBalance(fincaId);
				} catch (error) {
					const local = propietario && permiteCopiaLocal(error) ? leerInventarioLocal(propietario, fincaId) : null;
					if (!local) throw error;
					data = local.cintas;
					consultadoEn = local.consultadoEn;
					copia = true;
				}
				if (requestId !== this.cargaInventarioSeq || propietario !== propietarioCosecha()) return false;
				this.inventarioLocal = copia;
				this.inventarioConsultadoEn = consultadoEn;
				this.errorCopiaLocal = '';
				if (!copia && propietario) {
					try {
						guardarInventarioLocal(propietario, fincaId, data.map(c => ({ ...c, anio: resolverAnioDesdeBackend(c, this.infoSistema.anio) })), consultadoEn);
					} catch {
						this.errorCopiaLocal = 'No se pudo guardar el inventario para uso sin conexión.';
					}
				}
				const digitado = new Map(
					(fincaAnteriorId === fincaId ? this.saldosPendientes : []).map((item) =>
						[item.calendario_id, { buenos: item.cantidad_a_cosechar, rechazo: item.rechazo }]),
				);
				const anioFallback = this.infoSistema.anio;

				this.saldosPendientes = data
					.map((item) => {
						const semanaEnfunde = Number(item.semana_enfunde);
						const anio = resolverAnioDesdeBackend(item, anioFallback);

						const reservado = [...this.colaSincronizacion, ...this.colaFallida]
							.filter((pendiente) => pendiente.finca_id === fincaId)
							.flatMap((pendiente) => pendiente.detalles)
							.filter((detalle) => detalle.calendario_id === item.calendario_id)
							.reduce((total, detalle) => total + detalle.cantidad_racimos + detalle.cantidad_rechazo, 0);
						return {
							calendario_id: item.calendario_id,
							semana_enfunde: semanaEnfunde,
							anio,
							saldo_en_campo: Math.max(0, Number(item.saldo_en_campo) - reservado),
							color_cinta: item.color_cinta,
							color_hex: item.color_hex,
							cantidad_a_cosechar: digitado.get(item.calendario_id)?.buenos || 0,
							rechazo: digitado.get(item.calendario_id)?.rechazo || 0,
							edad: calculateIsoWeekAge(semanaEnfunde, anio),
						};
					})
					.filter((item) =>
						isIsoWeekAgeVisible(item.semana_enfunde, item.anio),
					);
				return true;
			} catch (error) {
				if (requestId !== this.cargaInventarioSeq) return false;
				if (this.fincaActivaId === fincaId && fincaAnteriorId !== fincaId) {
					this.saldosPendientes = [];
				}
				this.errorCopiaLocal = 'No se pudo consultar el inventario ni recuperar una copia local autorizada.';
				useUIStore().showError(this.errorCopiaLocal);
				return false;
			} finally {
				if (requestId === this.cargaInventarioSeq) this.loading = false;
			}
		},

		sugerirCorteAutomatico() {
			this.saldosPendientes.forEach((item) => {
				const edadActual = this.calcularEdadExacta(
					item.semana_enfunde,
					item.anio,
				);

				if (
					edadActual >= this.semanaInicioCorte &&
					edadActual < MAX_VISIBLE_CINTA_AGE_WEEKS
				) {
					item.cantidad_a_cosechar = item.saldo_en_campo;
					item.rechazo = 0;
				}
			});
		},

		async enviarCosecha(
			fincaId: number,
			fecha: string,
		): Promise<ResultadoEnvioCosecha> {
			const propietario = this.propietario;
			if (!propietario || propietario !== propietarioCosecha() || this.errorAlmacenamiento) {
				return { ok: false, queued: false, message: this.errorAlmacenamiento || 'La sesion cambio. Ingresa con el usuario que inicio este conteo.' };
			}
			if (this.loading || this.fincaActivaId !== fincaId) {
				return { ok: false, queued: false, message: 'Espera a que se cargue el inventario de la finca seleccionada.' };
			}
			if (this.submitting || this.sincronizando) {
				return {
					ok: false,
					queued: false,
					message: 'Hay un envío o sincronización en progreso. Espera a que termine.',
				};
			}

			if (this.hayExcedidos || this.saldosPendientes.some(item =>
				![item.cantidad_a_cosechar, item.rechazo].every(n => Number.isSafeInteger(n) && n >= 0))) {
				return { ok: false, queued: false, message: 'El conteo se conserva. Revisa las cantidades y los conflictos de saldo antes de enviar.' };
			}

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
				id_local: crearUuid(),
				finca_id: fincaId,
				fecha,
				timestamp: Date.now(),
				detalles,
			};

			this.submitting = true;
			try {
				if (!this.isOnline) throw new Error('Sin conexion');
				await cosechaService.registrarLiquidacion(payload, propietario);
				this.descontarCopiaConfirmada(payload, propietario);
				this.consumirConteoEnviado(payload);
				if (this.fincaActivaId === fincaId) await this.cargarSaldos(fincaId);
				return {
					ok: true,
					queued: false,
					message: 'Reporte enviado correctamente.',
				};
			} catch (error) {
				if (propietario !== propietarioCosecha()) {
					return { ok: false, queued: false, message: 'La sesion cambio durante el envio. Revisa el reporte con la cuenta original antes de repetirlo.' };
				}
				if (esErrorEncolable(error)) {
					this.colaSincronizacion.push({ ...payload, intentos: 0 });
					try {
						this.persistirCola();
					} catch {
						this.colaSincronizacion = this.colaSincronizacion.filter((item) => item.id_local !== payload.id_local);
						return { ok: false, queued: false, message: 'No se pudo guardar en este dispositivo. El conteo sigue en pantalla; libera espacio y vuelve a intentar.' };
					}
					this.consumirConteoEnviado(payload);
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
				this.activarSesion();
			}
		},

		persistirCola() {
			if (!this.propietario || this.errorAlmacenamiento) throw new Error('Cola no disponible');
			localStorage.setItem(claveColaCosecha(this.propietario), JSON.stringify({
				pendientes: this.colaSincronizacion,
				fallidos: this.colaFallida,
			}));
		},

		descontarCopiaConfirmada(payload: PayloadCosecha, propietario: string) {
			try { descontarConfirmadoLocal(propietario, payload); }
			catch { this.errorCopiaLocal = 'El envío fue confirmado, pero no se pudo actualizar la copia local. Actualiza el inventario antes de salir sin conexión.'; }
		},

		consumirConteoEnviado(payload: PayloadCosecha) {
			if (this.fincaActivaId !== payload.finca_id) return;
			for (const detalle of payload.detalles) {
				const item = this.saldosPendientes.find((cinta) => cinta.calendario_id === detalle.calendario_id);
				if (!item) continue;
				item.cantidad_a_cosechar = Math.max(0, item.cantidad_a_cosechar - detalle.cantidad_racimos);
				item.rechazo = Math.max(0, item.rechazo - detalle.cantidad_rechazo);
				item.saldo_en_campo = Math.max(0, item.saldo_en_campo - detalle.cantidad_racimos - detalle.cantidad_rechazo);
			}
		},

		async sincronizarCola() {
			if (!localStorage.getItem('token')) return;
			this.activarSesion();
			const propietario = this.propietario;
			if (!propietario || propietario !== propietarioCosecha() || this.errorAlmacenamiento) return;
			if (!this.isOnline || this.sincronizando || this.submitting || !this.colaSincronizacion.length) return;
			this.sincronizando = true;
			let enviados = 0;
			let movidosAFallida = 0;
			try {
				const pendientes = [...this.colaSincronizacion];
				for (const payload of pendientes) {
					if (propietario !== propietarioCosecha()) break;
					try {
						await cosechaService.registrarLiquidacion(payload, propietario);
						this.descontarCopiaConfirmada(payload, propietario);
						// Quitar solo el enviado, conservando los registros nuevos de la cola.
						this.colaSincronizacion = this.colaSincronizacion.filter((item) => item.id_local !== payload.id_local);
						enviados++;
					} catch (error) {
						if (propietario !== propietarioCosecha()) break;
						const status = (error as { response?: { status?: number } })?.response?.status;
						// Una sesion expirada no convierte el reporte en un error de datos.
						if (status === 401 || status === 403) break;
						const pendiente = this.colaSincronizacion.find((item) => item.id_local === payload.id_local);
						if (!pendiente) continue;
						pendiente.intentos = (pendiente.intentos || 0) + 1;
						pendiente.ultimoError = extraerMensajeError(error);
						if (!esErrorEncolable(error)) {
							this.colaFallida.push({ ...pendiente });
							this.colaSincronizacion = this.colaSincronizacion.filter((item) => item.id_local !== payload.id_local);
							movidosAFallida++;
						}
					}
					this.persistirCola();
				}
				if (enviados && this.fincaActivaId && propietario === propietarioCosecha()) await this.cargarSaldos(this.fincaActivaId);
				if (movidosAFallida) {
					useUIStore().showWarning(`${movidosAFallida} reporte(s) requieren revisión manual por errores de validación.`);
				}
			} catch {
				useUIStore().showError('No se pudo actualizar la cola local. Conserva este dispositivo y vuelve a intentar la sincronización.');
			} finally {
				this.sincronizando = false;
				this.activarSesion();
			}
		},

		inicializarMonitoreoRed() {
			this.activarSesion();
			if (this.monitoreoRedInicializado) return;
			this.monitoreoRedInicializado = true;

			window.addEventListener('online', () => {
				this.isOnline = true;
				void this.sincronizarCola();
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
			window.addEventListener('storage', (event) => {
				if (event.key === 'user' || event.key === 'token' || event.key === null) this.activarSesion();
			});

			if (this.isOnline) {
				void this.sincronizarCola();
			}
		},
	},
});
