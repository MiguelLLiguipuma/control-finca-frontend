import { defineStore } from 'pinia';
import { cosechaService } from '../../services/cosecha/cosechaService.js';
import { useUIStore } from '../../stores/uiStore.js';

export const useCosechaStore = defineStore('cosecha', {
	state: () => ({
		loading: false,
		saldosPendientes: [],
		error: null,

		// --- ESTADO DE RED ---
		isOnline: navigator.onLine,
		colaSincronizacion:
			JSON.parse(localStorage.getItem('cola_cosecha_pendiente')) || [],
	}),

	getters: {
		// ============================================
		// A. LÓGICA DE NEGOCIO (CALCULADA)
		// ============================================

		// 1. Semana ISO Actual del Sistema
		semanaActualSistema: (state) => {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() + 4 - (d.getDay() || 7));
			return Math.ceil(
				((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7,
			);
		},

		// 2. Sugerencia de Corte (12 y 13 semanas de edad)
		sugerenciaCorte() {
			const s = this.semanaActualSistema;
			// Función interna para restar semanas cíclicamente (calendario 52 sem)
			const calc = (e) => {
				const r = s - e;
				return r <= 0 ? 52 + r : r;
			};
			return [calc(12), calc(13)];
		},

		// 3. Totales
		totalDigitado: (state) =>
			state.saldosPendientes.reduce(
				(a, i) =>
					a + (Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0),
				0,
			),

		totalRestante: (state) =>
			state.saldosPendientes.reduce(
				(a, i) =>
					a +
					(i.saldo_en_campo -
						(Number(i.cantidad_a_cosechar) || 0) -
						(Number(i.rechazo) || 0)),
				0,
			),

		// 4. Estados de Validación Global
		hayExcedidos() {
			// Usamos la acción 'esExcedido' referenciándola con 'this'
			return this.saldosPendientes.some((item) => this.esExcedido(item));
		},

		estadoOperacion() {
			if (this.hayExcedidos) return 'HAY EXCEDENTES';
			if (this.totalDigitado > 0) return 'LISTO PARA ENVIAR';
			return 'SIN DATOS';
		},

		estadoColor() {
			if (this.hayExcedidos) return 'error';
			if (this.totalDigitado > 0) return 'success';
			return 'grey';
		},

		// 5. ORDENAMIENTO INTELIGENTE (La lógica compleja visual)
		saldosOrdenados(state) {
			// Creamos una copia para no mutar el state directamente al ordenar
			return [...state.saldosPendientes].sort((a, b) => {
				// Prioridad 1: Es cinta de corte sugerido
				const aActual = this.esCintaDeCorteActual(a.semana_enfunde);
				const bActual = this.esCintaDeCorteActual(b.semana_enfunde);
				if (aActual && !bActual) return -1;
				if (!aActual && bActual) return 1;

				// Prioridad 2: Es fruta en rango de edad (11-14)
				const aCorte = this.esFrutaDeCorte(a.semana_enfunde);
				const bCorte = this.esFrutaDeCorte(b.semana_enfunde);
				if (aCorte && !bCorte) return -1;
				if (!aCorte && bCorte) return 1;

				// Prioridad 3: Mayor edad primero
				return (
					this.obtenerEdad(b.semana_enfunde) -
					this.obtenerEdad(a.semana_enfunde)
				);
			});
		},
	},

	actions: {
		// ============================================
		// B. HELPERS DE CÁLCULO (Usados por getters y vista)
		// ============================================

		obtenerEdad(sem) {
			const actual = this.semanaActualSistema;
			return sem > actual ? 52 - sem + actual : actual - sem;
		},

		esCintaDeCorteActual(semanaEnfunde) {
			return this.sugerenciaCorte.includes(semanaEnfunde);
		},

		esFrutaDeCorte(sem) {
			const edad = this.obtenerEdad(sem);
			return edad >= 11 && edad <= 14;
		},

		esExcedido(i) {
			return (
				(Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0) >
				i.saldo_en_campo
			);
		},

		calcularPorcentaje(i) {
			const totalInput =
				(Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0);
			return Math.min((totalInput / (i.saldo_en_campo || 1)) * 100, 100);
		},

		// ============================================
		// C. MONITOREO DE RED
		// ============================================
		inicializarMonitoreoRed() {
			window.addEventListener('online', () => {
				this.isOnline = true;
				this.sincronizarCola();
			});
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
		},

		// ============================================
		// D. SINCRONIZACIÓN
		// ============================================
		async sincronizarCola() {
			if (!this.isOnline || this.colaSincronizacion.length === 0) return;

			const uiStore = useUIStore();
			uiStore.showWarning(
				`Subiendo ${this.colaSincronizacion.length} registros pendientes...`,
			);

			const registrosParaSubir = [...this.colaSincronizacion];

			for (const registro of registrosParaSubir) {
				try {
					await cosechaService.registrarLiquidacion(registro.payload);
					this.colaSincronizacion = this.colaSincronizacion.filter(
						(r) => r.id_local !== registro.id_local,
					);
					this.actualizarLocalStorage();
				} catch (err) {
					console.error('Error subiendo registro, se queda en cola', err);
					break; // Parar si hay error para reintentar luego
				}
			}

			if (this.colaSincronizacion.length === 0) {
				uiStore.showSuccess('¡Todo sincronizado con la nube!');
			}
		},

		actualizarLocalStorage() {
			localStorage.setItem(
				'cola_cosecha_pendiente',
				JSON.stringify(this.colaSincronizacion),
			);
		},

		// ============================================
		// E. CARGA DE DATOS
		// ============================================
		async cargarSaldos(fincaId) {
			if (!fincaId) return;
			this.loading = true;
			try {
				const data = await cosechaService.getBalance(fincaId);
				// Inicializamos los campos de input en 0
				this.saldosPendientes = data.map((item) => ({
					...item,
					cantidad_a_cosechar: 0,
					rechazo: 0,
				}));
			} catch (err) {
				this.error = err?.message;
				useUIStore().showError(
					'No se pudieron cargar los saldos actualizados.',
				);
			} finally {
				this.loading = false;
			}
		},

		// ============================================
		// F. GUARDAR (TRANSACCIONAL)
		// ============================================
		async enviarCosecha(fincaId, fecha, usuarioId) {
			const uiStore = useUIStore();

			// 1. Validación usando el Getter del store
			if (this.hayExcedidos) {
				uiStore.showError(
					'Error: La cosecha supera el saldo disponible en algunas cintas',
				);
				return false;
			}

			// 2. Preparar payload
			const detalles = this.saldosPendientes
				.filter(
					(s) =>
						(Number(s.cantidad_a_cosechar) || 0) > 0 ||
						(Number(s.rechazo) || 0) > 0,
				)
				.map((s) => ({
					calendario_id: s.calendario_id,
					cantidad_racimos: Number(s.cantidad_a_cosechar) || 0,
					cantidad_rechazo: Number(s.rechazo) || 0,
				}));

			if (detalles.length === 0) return false;

			const payload = {
				finca_id: fincaId,
				fecha,
				usuario_id: usuarioId,
				detalles,
			};

			// 3. Estrategia de Guardado (Offline First)

			// CASO A: Sin internet
			if (!this.isOnline) {
				this.colaSincronizacion.push({ id_local: Date.now(), payload });
				this.actualizarLocalStorage();
				uiStore.showWarning('Sin conexión. Guardado en memoria temporal.');
				this.resetCosecha();
				return true;
			}

			// CASO B: Con internet
			this.loading = true;
			try {
				await cosechaService.registrarLiquidacion(payload);
				uiStore.showSuccess('Cosecha guardada en el servidor');
				await this.cargarSaldos(fincaId);
				return true;
			} catch (err) {
				// CASO C: Fallo de servidor -> Fallback a cola local
				console.warn('Fallo de red al enviar. Guardando localmente.');
				this.colaSincronizacion.push({ id_local: Date.now(), payload });
				this.actualizarLocalStorage();
				uiStore.showWarning(
					'Problema de conexión. Se guardó para intentar luego.',
				);
				this.resetCosecha();
				return true;
			} finally {
				this.loading = false;
			}
		},

		resetCosecha() {
			this.saldosPendientes.forEach((s) => {
				s.cantidad_a_cosechar = 0;
				s.rechazo = 0;
			});
		},
	},
});
