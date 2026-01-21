import { defineStore } from 'pinia';
import { cosechaService } from '../../services/cosecha/cosechaService';
import { useUIStore } from '../../stores/uiStore';

// --- 1. INTERFACES ---

interface RawBalance {
	calendario_id: number;
	semana_enfunde: number | string;
	saldo_en_campo: number | string;
	color_cinta: string;
	color_hex: string;
	anio?: number | string;
	year?: number | string;
	año?: number | string;
}

export interface CintaCosecha {
	calendario_id: number;
	semana_enfunde: number;
	anio: number;
	saldo_en_campo: number;
	color_cinta: string;
	color_hex: string;
	cantidad_a_cosechar: number;
	rechazo: number;
}

interface CosechaState {
	loading: boolean;
	saldosPendientes: CintaCosecha[];
	fincaActivaId: number | null;
	isOnline: boolean;
	colaSincronizacion: any[];
}

// --- 2. HELPER (Lógica Matemática Pura) ---
// Definimos esto FUERA del store para que TS no se confunda con el 'this'
// Recibe la semana/año de la cinta y la semana/año actual del sistema
const calcularEdadHelper = (
	semItem: number,
	anioItem: number,
	semActual: number,
	anioActual: number,
): number => {
	const diffAnios = anioActual - anioItem;
	if (diffAnios === 0) return semActual - semItem;
	if (diffAnios > 0) return diffAnios * 52 - semItem + semActual;
	return -1; // Futuro
};

// --- 3. STORE ---

export const useCosechaStore = defineStore('cosecha', {
	state: (): CosechaState => ({
		loading: false,
		saldosPendientes: [],
		fincaActivaId: null,
		isOnline: navigator.onLine,
		colaSincronizacion: JSON.parse(
			localStorage.getItem('cola_cosecha_pendiente') || '[]',
		),
	}),

	getters: {
		// --- TIEMPO ---
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

		semanaActual(state): number {
			return this.infoSistema.semana;
		},
		anioActual(state): number {
			return this.infoSistema.anio;
		},

		// --- CONFIG ---
		rangoCorteSugerido: (): number[] => [12, 13],

		// --- TOTALES ---
		totalDigitado: (state): number =>
			state.saldosPendientes.reduce(
				(acc, item) =>
					acc + (item.cantidad_a_cosechar || 0) + (item.rechazo || 0),
				0,
			),

		totalRestante: (state): number =>
			state.saldosPendientes.reduce((acc, item) => {
				const digitado = (item.cantidad_a_cosechar || 0) + (item.rechazo || 0);
				return acc + (item.saldo_en_campo - digitado);
			}, 0),

		hayExcedidos(): boolean {
			return this.saldosPendientes.some((item) => this.esExcedido(item));
		},

		estadoOperacion(): string {
			if (this.hayExcedidos) return 'ERROR EN SALDOS';
			if (this.totalDigitado > 0) return 'LISTO PARA ENVIAR';
			if (this.saldosPendientes.length === 0) return 'SIN DATOS';
			return 'ESPERANDO DATOS';
		},

		estadoColor(): string {
			if (this.hayExcedidos) return 'error';
			if (this.totalDigitado > 0) return 'success';
			return 'grey-darken-1';
		},

		// --- ORDENAMIENTO ---
		saldosOrdenados(state): CintaCosecha[] {
			// Obtenemos info del sistema UNA sola vez aquí
			const { semana: semActual, anio: anioActual } = this.infoSistema;

			// 1. Filtramos futuros imposibles
			const lista = state.saldosPendientes.filter((item) => {
				// CORRECCIÓN: Usamos el helper externo, no 'this.calcularEdadExacta'
				const edad = calcularEdadHelper(
					item.semana_enfunde,
					item.anio,
					semActual,
					anioActual,
				);
				return edad > 0;
			});

			return lista.sort((a, b) => {
				// A. REGLA DE ORO: Año (2025 antes que 2026)
				if (a.anio !== b.anio) return a.anio - b.anio;

				// B. Calculamos edades usando el helper
				const edadA = calcularEdadHelper(
					a.semana_enfunde,
					a.anio,
					semActual,
					anioActual,
				);
				const edadB = calcularEdadHelper(
					b.semana_enfunde,
					b.anio,
					semActual,
					anioActual,
				);

				// C. Prioridad a 12-13 semanas
				const aIdeal = edadA >= 12 && edadA <= 13;
				const bIdeal = edadB >= 12 && edadB <= 13;

				if (aIdeal && !bIdeal) return -1;
				if (!aIdeal && bIdeal) return 1;

				// D. Más vieja primero
				return edadB - edadA;
			});
		},

		saldosPorAnio(): Record<string, CintaCosecha[]> {
			const grupos: Record<string, CintaCosecha[]> = {};
			this.saldosOrdenados.forEach((item) => {
				const key = String(item.anio);
				if (!grupos[key]) grupos[key] = [];
				grupos[key].push(item);
			});
			return grupos;
		},
	},

	actions: {
		// Acción pública que usa el mismo helper
		calcularEdadExacta(semItem: number, anioItem: number): number {
			const { semana, anio } = this.infoSistema;
			return calcularEdadHelper(semItem, anioItem, semana, anio);
		},

		esCintaDeCorteActual(sem: number, anio: number): boolean {
			const edad = this.calcularEdadExacta(sem, anio);
			return edad >= 12 && edad <= 13;
		},

		esFrutaDeCorte(sem: number, anio: number): boolean {
			const edad = this.calcularEdadExacta(sem, anio);
			return edad >= 11 && edad <= 14;
		},

		esExcedido(item: CintaCosecha): boolean {
			const input = (item.cantidad_a_cosechar || 0) + (item.rechazo || 0);
			return input > item.saldo_en_campo;
		},

		calcularPorcentaje(item: CintaCosecha): number {
			if (!item.saldo_en_campo) return 0;
			const input = (item.cantidad_a_cosechar || 0) + (item.rechazo || 0);
			return Math.min((input / item.saldo_en_campo) * 100, 100);
		},

		// --- CARGA DE DATOS ---
		async cargarSaldos(fincaId: number) {
			if (!fincaId) return;
			this.loading = true;
			this.fincaActivaId = fincaId;

			try {
				const data: RawBalance[] = await cosechaService.getBalance(fincaId);

				const { semana: semActual, anio: anioActualSistema } = this.infoSistema;

				this.saldosPendientes = data.map((item) => {
					const semEnfunde = Number(item.semana_enfunde);
					let anioFinal =
						Number(item.anio) || Number(item.year) || Number(item.año);

					// INFERENCIA DE AÑO SI VIENE VACÍO
					if (!anioFinal) {
						if (semEnfunde > semActual + 15) {
							anioFinal = anioActualSistema - 1;
						} else {
							anioFinal = anioActualSistema;
						}
					}

					return {
						calendario_id: item.calendario_id,
						semana_enfunde: semEnfunde,
						saldo_en_campo: Number(item.saldo_en_campo),
						color_cinta: item.color_cinta,
						color_hex: item.color_hex,
						anio: anioFinal,
						cantidad_a_cosechar: 0,
						rechazo: 0,
					} as CintaCosecha;
				});
			} catch (err) {
				useUIStore().showError('Error cargando inventario.');
				this.saldosPendientes = [];
			} finally {
				this.loading = false;
			}
		},

		resetInputs() {
			this.saldosPendientes.forEach((s) => {
				s.cantidad_a_cosechar = 0;
				s.rechazo = 0;
			});
		},

		async enviarCosecha(fincaId: number, fecha: string, usuarioId: number) {
			const uiStore = useUIStore();

			if (this.hayExcedidos) {
				uiStore.showError('Error: Cantidades superan el saldo.');
				return false;
			}
			if (this.totalDigitado === 0) {
				uiStore.showWarning('No hay datos para enviar.');
				return false;
			}

			const detalles = this.saldosPendientes
				.filter((s) => s.cantidad_a_cosechar > 0 || s.rechazo > 0)
				.map((s) => ({
					calendario_id: s.calendario_id,
					cantidad_racimos: s.cantidad_a_cosechar,
					cantidad_rechazo: s.rechazo,
				}));

			const payload = {
				id_local: crypto.randomUUID(),
				finca_id: fincaId,
				fecha,
				usuario_id: usuarioId,
				timestamp: Date.now(),
				detalles,
			};

			if (!this.isOnline) {
				this.colaSincronizacion.push(payload);
				this.persistirCola();
				uiStore.showWarning('Guardado Offline.');
				this.resetInputs();
				return true;
			}

			this.loading = true;
			try {
				await cosechaService.registrarLiquidacion(payload);
				uiStore.showSuccess('Enviado correctamente.');
				await this.cargarSaldos(fincaId);
				return true;
			} catch (err) {
				this.colaSincronizacion.push(payload);
				this.persistirCola();
				uiStore.showWarning('Fallo de red. Guardado localmente.');
				this.resetInputs();
				return true;
			} finally {
				this.loading = false;
			}
		},

		inicializarMonitoreoRed() {
			window.addEventListener('online', () => {
				this.isOnline = true;
				this.procesarCola();
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
			if (this.isOnline) this.procesarCola();
		},

		persistirCola() {
			localStorage.setItem(
				'cola_cosecha_pendiente',
				JSON.stringify(this.colaSincronizacion),
			);
		},

		async procesarCola() {
			if (this.colaSincronizacion.length === 0 || !this.isOnline) return;
			const cola = [...this.colaSincronizacion];
			const fallidos = [];
			for (const item of cola) {
				try {
					const { id_local, timestamp, ...data } = item;
					await cosechaService.registrarLiquidacion(data);
				} catch (e) {
					fallidos.push(item);
				}
			}
			this.colaSincronizacion = fallidos;
			this.persistirCola();
			if (fallidos.length === 0 && this.fincaActivaId)
				await this.cargarSaldos(this.fincaActivaId);
		},
	},
});
