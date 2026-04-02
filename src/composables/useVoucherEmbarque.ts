import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/auth/authStore';
import { useEmbarqueStore } from '@/stores/embarque/embarqueStore';
import { useFincaStore } from '@/stores/fincaStore';
import { cosechaService } from '@/services/cosecha/cosechaService';
import type { EmbarqueEstado } from '@/services/embarque/embarqueTypes';
import { getCurrentIsoWeekInfo } from '@/utils/dateIso';

interface FechaOcupadaState {
	cosecha: boolean;
	voucher: boolean;
}

interface ResumenFinca {
	finca_id: number;
	finca_nombre: string;
	racimos_buenos: number;
	total_racimos: number;
	total_cajas: number;
	ratio_comercial: number;
	ratio_operativo: number;
}

export function useVoucherEmbarque() {
	const fincaStore = useFincaStore();
	const embarqueStore = useEmbarqueStore();
	const authStore = useAuthStore();
	const { smAndDown } = useDisplay();
	const { fincas } = storeToRefs(fincaStore);

	const dialogAnular = ref(false);
	const motivoAnulacion = ref('');
	const cajasSemanaInput = ref<number>(0);
	const avisoEmpresa = ref('');
	const menuFecha = ref(false);
	const fechaVoucherPicker = ref<Date | null>(new Date());
	const menuFechaBusqueda = ref(false);
	const fechaBusqueda = ref(new Date().toISOString().split('T')[0]);
	const fechaBusquedaPicker = ref<Date | null>(new Date());
	const numeroVoucherBusqueda = ref('');
	const modoBusquedaNumero = ref<'contains' | 'exact'>('contains');
	const mensajeBusqueda = ref('');
	const fechasOcupadas = ref<Record<string, FechaOcupadaState>>({});
	const cajasPorFinca = ref<Record<number, number>>({});
	const animarCambioVoucher = ref(false);
	let timerAnimacionVoucher: ReturnType<typeof setTimeout> | null = null;

	const chipEstado = computed(() => {
		const estado = embarqueStore.voucherActual?.estado;
		if (estado === 'CONFIRMADO') return { text: 'CONFIRMADO', color: 'success' };
		if (estado === 'ANULADO') return { text: 'ANULADO', color: 'error' };
		return { text: 'BORRADOR', color: 'warning' };
	});

	const voucherEstadoClass = computed(() => {
		const estado = embarqueStore.voucherActual?.estado || 'BORRADOR';
		if (estado === 'CONFIRMADO') return 'voucher-theme-confirmado';
		if (estado === 'ANULADO') return 'voucher-theme-anulado';
		return 'voucher-theme-borrador';
	});

	const canConfirmVoucher = computed(() => authStore.can('action.voucher.confirm'));
	const canCancelVoucher = computed(() => authStore.can('action.voucher.cancel'));

	const motivoBloqueoConfirmar = computed(() => {
		if (embarqueStore.submitting) return '';
		if (!canConfirmVoucher.value) return 'Tu rol no tiene permiso para confirmar vouchers.';
		if (!embarqueStore.voucherActual?.id) return 'Primero guarda el voucher como borrador.';
		if (embarqueStore.voucherActual?.estado === 'CONFIRMADO') return 'Este voucher ya esta confirmado.';
		if (embarqueStore.voucherActual?.estado === 'ANULADO') return 'Un voucher anulado no se puede confirmar.';
		if (!embarqueStore.puedeConfirmar) return 'Ingresa cajas embarcadas para poder confirmar.';
		return '';
	});

	const fincaPorId = computed(() => {
		const map = new Map<number, { empresa_id: number }>();
		for (const finca of fincas.value) {
			map.set(finca.id, { empresa_id: finca.empresa_id });
		}
		return map;
	});

	const empresaBloqueadaId = computed<number | null>(() => {
		const primerId = embarqueStore.fincaIds[0];
		if (!primerId) return null;
		return fincaPorId.value.get(primerId)?.empresa_id ?? null;
	});

	const fincasDisponibles = computed(() => {
		if (!empresaBloqueadaId.value) return fincas.value;
		return fincas.value.filter((finca) => finca.empresa_id === empresaBloqueadaId.value);
	});

	const resumenFincas = computed<ResumenFinca[]>(() => {
		const map = new Map<number, ResumenFinca>();
		for (const linea of embarqueStore.lineas) {
			const key = linea.finca_id;
			const base = map.get(key) || {
				finca_id: key,
				finca_nombre: linea.finca_nombre || `Finca ${key}`,
				racimos_buenos: 0,
				total_racimos: 0,
				total_cajas: 0,
				ratio_comercial: 0,
				ratio_operativo: 0,
			};
			base.racimos_buenos += Number(linea.racimos_buenos || 0);
			base.total_racimos += Number(linea.total_racimos || 0);
			base.total_cajas += Number(linea.cajas_embarcadas || 0);
			map.set(key, base);
		}

		return Array.from(map.values()).map((row) => ({
			...row,
			total_cajas: Number(row.total_cajas.toFixed(2)),
			ratio_comercial:
				row.racimos_buenos > 0 ? Number((row.total_cajas / row.racimos_buenos).toFixed(4)) : 0,
			ratio_operativo:
				row.total_racimos > 0 ? Number((row.total_cajas / row.total_racimos).toFixed(4)) : 0,
		}));
	});

	const fincasSeleccionadasTexto = computed(() => {
		const ids = new Set(embarqueStore.fincaIds);
		const nombres = fincas.value
			.filter((finca) => ids.has(finca.id))
			.map((finca) => finca.nombre)
			.filter(Boolean);
		return nombres.length ? nombres.join(', ') : 'No especificadas';
	});

	const fechaMaxima = computed(() => new Date());
	const fechaMinima = computed(() => {
		const fecha = new Date();
		fecha.setFullYear(fecha.getFullYear() - 1);
		return fecha;
	});

	const estadoFechaSeleccionada = computed(
		() => fechasOcupadas.value[embarqueStore.fechaEmbarque] || null,
	);
	const lineasTableHeight = computed(() => (smAndDown.value ? '320px' : '420px'));
	const fechaImpresionTexto = computed(() =>
		new Date().toLocaleString('es-EC', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		}),
	);

	function colorEstado(estado: EmbarqueEstado): string {
		if (estado === 'CONFIRMADO') return 'success';
		if (estado === 'ANULADO') return 'error';
		return 'warning';
	}

	function toIsoDate(value: Date): string {
		return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 10);
	}

	function toIsoDateUnknown(value: unknown): string | null {
		if (value instanceof Date) return toIsoDate(value);
		if (typeof value === 'string') return value.slice(0, 10);
		if (value && typeof value === 'object') {
			const raw = value as Record<string, unknown>;
			if (raw.date instanceof Date) return toIsoDate(raw.date);
			if (typeof raw.date === 'string') return raw.date.slice(0, 10);
			if (typeof raw.isoDate === 'string') return raw.isoDate.slice(0, 10);
			if (typeof raw.formatted === 'string') return raw.formatted.slice(0, 10);
		}
		return null;
	}

	function fechaVoucherPermitida(value: unknown): boolean {
		const iso = toIsoDateUnknown(value);
		if (!iso) return false;
		const estado = fechasOcupadas.value[iso];
		if (!estado?.voucher) return true;
		return iso === embarqueStore.fechaEmbarque;
	}

	function syncPickerWithStoreDate() {
		const parsed = new Date(`${embarqueStore.fechaEmbarque}T00:00:00`);
		fechaVoucherPicker.value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	}

	function syncBusquedaPicker() {
		const parsed = new Date(`${fechaBusqueda.value}T00:00:00`);
		fechaBusquedaPicker.value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	}

	function semanaIsoDesdeFecha(fechaISO: string): number {
		const base = String(fechaISO || '').trim();
		const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(base) ? `${base}T00:00:00` : new Date();
		const { semana } = getCurrentIsoWeekInfo(fechaValida);
		return Math.max(1, Math.min(53, Number(semana) || 1));
	}

	function syncSemanaCorteAuto(force = false) {
		if (!force && embarqueStore.voucherActual) return;
		embarqueStore.semanaCorte = semanaIsoDesdeFecha(embarqueStore.fechaEmbarque);
	}

	async function cargarFechasOcupadas() {
		const ids = embarqueStore.fincaIds.length
			? embarqueStore.fincaIds
			: fincaStore.fincaSeleccionadaId
				? [fincaStore.fincaSeleccionadaId]
				: [];
		if (!ids.length) {
			fechasOcupadas.value = {};
			return;
		}

		try {
			const data = await cosechaService.getFechasOcupadas({
				finca_ids: ids.join(','),
				fecha_desde: toIsoDate(fechaMinima.value),
				fecha_hasta: toIsoDate(fechaMaxima.value),
			});
			const map: Record<string, FechaOcupadaState> = {};
			for (const item of data.fechas || []) {
				if (!item?.fecha) continue;
				map[item.fecha] = {
					cosecha: Boolean(item.cosecha),
					voucher: Boolean(item.voucher),
				};
			}
			fechasOcupadas.value = map;
		} catch {
			fechasOcupadas.value = {};
		}
	}

	async function refrescarBase() {
		mensajeBusqueda.value = '';
		embarqueStore.resetFormulario();
		syncSemanaCorteAuto(true);
		await embarqueStore.cargarPreliquidacion();
		cajasSemanaInput.value = 0;
		fechaBusqueda.value = embarqueStore.fechaEmbarque;
		syncBusquedaPicker();
		await embarqueStore.cargarListado(fechaBusqueda.value);
	}

	function aplicarCajasSemana() {
		embarqueStore.setCajasTotalesSemana(cajasSemanaInput.value);
	}

	function aplicarCajasFinca(fincaId: number) {
		embarqueStore.setCajasPorFinca(fincaId, Number(cajasPorFinca.value[fincaId] || 0));
	}

	async function guardar() {
		mensajeBusqueda.value = '';
		await embarqueStore.guardarVoucher();
		fechaBusqueda.value = embarqueStore.fechaEmbarque;
		syncBusquedaPicker();
		await embarqueStore.cargarListado(fechaBusqueda.value);
	}

	async function confirmar() {
		if (!canConfirmVoucher.value) {
			embarqueStore.error = 'No tiene permisos para confirmar vouchers.';
			return;
		}
		mensajeBusqueda.value = '';
		await embarqueStore.confirmarVoucher();
		fechaBusqueda.value = embarqueStore.fechaEmbarque;
		syncBusquedaPicker();
		await embarqueStore.cargarListado(fechaBusqueda.value);
	}

	function abrirDialogoAnular() {
		if (!canCancelVoucher.value) {
			embarqueStore.error = 'No tiene permisos para anular vouchers.';
			return;
		}
		dialogAnular.value = true;
	}

	async function anular() {
		if (!canCancelVoucher.value) {
			embarqueStore.error = 'No tiene permisos para anular vouchers.';
			return;
		}
		await embarqueStore.anularVoucher(motivoAnulacion.value);
		if (!embarqueStore.error) {
			dialogAnular.value = false;
			motivoAnulacion.value = '';
			await embarqueStore.cargarListado(fechaBusqueda.value);
		}
	}

	async function buscarVouchers() {
		await embarqueStore.buscarVouchersAvanzado({
			fecha: fechaBusqueda.value,
			numeroVoucher: numeroVoucherBusqueda.value,
			numeroVoucherExacto: modoBusquedaNumero.value === 'exact',
			fechaDesde: toIsoDate(fechaMinima.value),
			fechaHasta: toIsoDate(fechaMaxima.value),
		});
		if (!embarqueStore.error && embarqueStore.listado.length === 0) {
			mensajeBusqueda.value = numeroVoucherBusqueda.value
				? `No se encontro voucher con numero "${numeroVoucherBusqueda.value}".`
				: `No hay vouchers para ${fechaBusqueda.value}.`;
			return;
		}
		mensajeBusqueda.value = '';
	}

	watch(
		() => embarqueStore.fechaEmbarque,
		() => {
			syncPickerWithStoreDate();
			syncSemanaCorteAuto();
			if (!fechaBusqueda.value) {
				fechaBusqueda.value = embarqueStore.fechaEmbarque;
				syncBusquedaPicker();
			}
		},
	);

	watch(
		() => embarqueStore.fincaIds.slice(),
		async (ids) => {
			const normalizados = Array.from(new Set(ids.filter((id) => Number(id) > 0)));
			if (!normalizados.length) {
				avisoEmpresa.value = '';
				await cargarFechasOcupadas();
				mensajeBusqueda.value = '';
				await embarqueStore.cargarListado(fechaBusqueda.value);
				return;
			}

			const empresaObjetivo = fincaPorId.value.get(normalizados[0])?.empresa_id;
			const permitidos = normalizados.filter(
				(id) => fincaPorId.value.get(id)?.empresa_id === empresaObjetivo,
			);

			if (permitidos.length !== normalizados.length) {
				embarqueStore.fincaIds = permitidos;
				avisoEmpresa.value = 'Solo se permiten fincas de una misma empresa por voucher.';
				return;
			}

			avisoEmpresa.value = '';
			await cargarFechasOcupadas();
			mensajeBusqueda.value = '';
			await embarqueStore.cargarListado(fechaBusqueda.value);
		},
	);

	watch(fechaVoucherPicker, (value) => {
		if (!value) return;
		embarqueStore.fechaEmbarque = toIsoDate(value);
	});

	watch(fechaBusquedaPicker, (value) => {
		if (!value) return;
		fechaBusqueda.value = toIsoDate(value);
	});

	watch(
		resumenFincas,
		(rows) => {
			const next: Record<number, number> = {};
			for (const row of rows) {
				const current = cajasPorFinca.value[row.finca_id];
				next[row.finca_id] =
					typeof current === 'number' && Number.isFinite(current)
						? current
						: Number(row.total_cajas.toFixed(2));
			}
			cajasPorFinca.value = next;
		},
		{ immediate: true },
	);

	onMounted(async () => {
		await fincaStore.obtenerFincas();
		syncSemanaCorteAuto(true);
		syncPickerWithStoreDate();
		fechaBusqueda.value = embarqueStore.fechaEmbarque;
		syncBusquedaPicker();
		await cargarFechasOcupadas();
		mensajeBusqueda.value = '';
		await embarqueStore.cargarListado(fechaBusqueda.value);
	});

	watch(
		() => embarqueStore.voucherActual?.id ?? null,
		(next, prev) => {
			if (!next || next === prev) return;
			animarCambioVoucher.value = false;
			requestAnimationFrame(() => {
				animarCambioVoucher.value = true;
				if (timerAnimacionVoucher) clearTimeout(timerAnimacionVoucher);
				timerAnimacionVoucher = setTimeout(() => {
					animarCambioVoucher.value = false;
				}, 520);
			});
		},
	);

	onBeforeUnmount(() => {
		if (timerAnimacionVoucher) clearTimeout(timerAnimacionVoucher);
	});

	function imprimirVoucher() {
		window.print();
	}

	return {
		fincas,
		embarqueStore,
		authStore,
		dialogAnular,
		motivoAnulacion,
		cajasSemanaInput,
		avisoEmpresa,
		menuFecha,
		fechaVoucherPicker,
		menuFechaBusqueda,
		fechaBusqueda,
		fechaBusquedaPicker,
		numeroVoucherBusqueda,
		modoBusquedaNumero,
		mensajeBusqueda,
		cajasPorFinca,
		animarCambioVoucher,
		chipEstado,
		voucherEstadoClass,
		canConfirmVoucher,
		canCancelVoucher,
		motivoBloqueoConfirmar,
		fincasDisponibles,
		resumenFincas,
		fincasSeleccionadasTexto,
		fechaMaxima,
		fechaMinima,
		estadoFechaSeleccionada,
		lineasTableHeight,
		fechaImpresionTexto,
		colorEstado,
		fechaVoucherPermitida,
		refrescarBase,
		aplicarCajasSemana,
		aplicarCajasFinca,
		guardar,
		confirmar,
		abrirDialogoAnular,
		anular,
		buscarVouchers,
		imprimirVoucher,
	};
}
