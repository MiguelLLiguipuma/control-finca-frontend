import { defineStore } from 'pinia';
import { cosechaService } from '../../services/cosecha/cosechaService.js';
import { useUIStore } from '../../stores/uiStore.js';

export const useCosechaStore = defineStore('cosecha', {
	state: () => ({
		loading: false,
		saldosPendientes: [],
		error: null,
		// Detectamos el estado inicial usando el navegador
		isOnline: navigator.onLine,
		// Recuperamos la cola del disco duro del navegador
		colaSincronizacion:
			JSON.parse(localStorage.getItem('cola_cosecha_pendiente')) || [],
	}),

	actions: {
		// ============================================
		// 1. MONITOREO DE RED (VERSIÓN WEB/Navegador)
		// ============================================
		inicializarMonitoreoRed() {
			// Escuchar cuando vuelve el internet
			window.addEventListener('online', () => {
				this.isOnline = true;
				this.sincronizarCola(); // ¡Auto-subida!
			});

			// Escuchar cuando se va el internet
			window.addEventListener('offline', () => {
				this.isOnline = false;
			});
		},

		// ============================================
		// 2. SINCRONIZACIÓN (Igual que antes)
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
					// Si subió bien, lo borramos de la cola
					this.colaSincronizacion = this.colaSincronizacion.filter(
						(r) => r.id_local !== registro.id_local,
					);
					this.actualizarLocalStorage();
				} catch (err) {
					console.error('Error subiendo registro, se queda en cola', err);
					// Si falla, paramos el bucle para no saturar
					break;
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
		// 3. CARGA DE SALDOS
		// ============================================
		async cargarSaldos(fincaId) {
			if (!fincaId) return;
			this.loading = true;
			try {
				const data = await cosechaService.getBalance(fincaId);
				this.saldosPendientes = data.map((item) => ({
					...item,
					cantidad_a_cosechar: 0,
					rechazo: 0,
				}));
			} catch (err) {
				// Si falla la carga, no borramos el error, solo avisamos
				this.error = err?.message;
				useUIStore().showError(
					'No se pudieron cargar los saldos actualizados.',
				);
			} finally {
				this.loading = false;
			}
		},

		// ============================================
		// 4. GUARDAR (Lógica Híbrida)
		// ============================================
		async enviarCosecha(fincaId, fecha, usuarioId) {
			const uiStore = useUIStore();

			// --- VALIDACIONES (Tu lógica original) ---
			const excedidos = this.saldosPendientes.filter((s) => {
				const buenos = Number(s.cantidad_a_cosechar) || 0;
				const rechazo = Number(s.rechazo) || 0;
				return buenos + rechazo > s.saldo_en_campo;
			});

			if (excedidos.length > 0) {
				uiStore.showError('Error: La cosecha supera el saldo disponible');
				return false;
			}

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

			// --- LÓGICA DE GUARDADO ---

			// CASO A: NO HAY INTERNET (Detectado por navegador)
			if (!this.isOnline) {
				this.colaSincronizacion.push({ id_local: Date.now(), payload });
				this.actualizarLocalStorage();
				uiStore.showWarning('Sin conexión. Guardado en memoria temporal.');
				this.resetCosecha();
				return true;
			}

			// CASO B: HAY INTERNET (Intento directo)
			this.loading = true;
			try {
				await cosechaService.registrarLiquidacion(payload);
				uiStore.showSuccess('Cosecha guardada en el servidor');
				await this.cargarSaldos(fincaId);
				return true;
			} catch (err) {
				// CASO C: PARECE QUE HAY INTERNET PERO FALLÓ EL SERVIDOR
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
