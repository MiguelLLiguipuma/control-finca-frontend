import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
	useCosechaStore,
	type CintaCosecha,
} from '@/stores/cosecha/cosechaStore';
import { useEmpresaStore } from '@/stores/empresaStore';
import { useFincaStore } from '@/stores/fincaStore';
import { useFechasOcupadas } from '@/composables/useFechasOcupadas';
import { toLocalIsoDate } from '@/utils/dateIso';

dayjs.extend(isoWeek);

interface SnackbarState {
	show: boolean;
	message: string;
	color: string;
}

interface SetCampoPayload {
	item: CintaCosecha;
	campo: 'cantidad_a_cosechar' | 'rechazo';
	valor: number;
}

interface BorradorCosechaItem {
	calendario_id: number;
	cantidad_a_cosechar: number;
	rechazo: number;
}

interface BorradorCosechaLocal {
	finca_id: number;
	fecha: string;
	actualizado_en: number;
	items: BorradorCosechaItem[];
}

const BORRADOR_COSECHA_PREFIX = 'borrador_cosecha_conteo';

export function useRegistroCosecha() {
	const cosechaStore = useCosechaStore();
	const fincaStore = useFincaStore();
	const empresaStore = useEmpresaStore();
	const { fincas } = storeToRefs(fincaStore);
	const {
		cargarFechasOcupadas,
		fechasOcupadas,
		limpiarFechasOcupadas,
		obtenerEstadoFecha,
		toIsoDate,
		toIsoDateUnknown,
	} = useFechasOcupadas();

	const fincaSeleccionada = ref<number | null>(fincaStore.fincaSeleccionadaId);
	const fechaCosecha = ref(toLocalIsoDate());
	const fechaObjetoPicker = ref<Date | null>(new Date());
	const menuFecha = ref(false);
	const hidratandoPantalla = ref(true);
	const restaurandoBorrador = ref(false);
	const snackbar = ref<SnackbarState>({
		show: false,
		message: '',
		color: 'info',
	});

	const sortedYears = computed(() =>
		Object.keys(cosechaStore.saldosPorAnio || {}).sort(
			(a, b) => Number(a) - Number(b),
		),
	);
	const fechaFormateada = computed(() => {
		if (!fechaObjetoPicker.value) return 'Seleccionar Fecha';
		return fechaObjetoPicker.value.toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	});
	const infoDiaSemana = computed(() => {
		if (!fechaObjetoPicker.value) return '';
		const dia = fechaObjetoPicker.value.toLocaleDateString('es-ES', {
			weekday: 'long',
		});
		const semanaSeleccionada = dayjs(fechaObjetoPicker.value).isoWeek();
		return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · Semana ${semanaSeleccionada}`;
	});
	const fechaMaxima = computed(() => new Date());
	const fechaMinima = computed(() => {
		const fecha = new Date();
		fecha.setFullYear(fecha.getFullYear() - 1);
		return fecha;
	});
	const estadoFechaSeleccionada = computed(() =>
		obtenerEstadoFecha(fechaCosecha.value),
	);
	const hayConteoSinEnviar = computed(() =>
		crearBorradorDesdeDigitacion() !== null,
	);

	function notify(message: string, color = 'info') {
		snackbar.value = { show: true, message, color };
	}

	function getBorradorKey(fincaId = fincaSeleccionada.value, fecha = fechaCosecha.value) {
		if (!fincaId || !fecha) return '';
		return `${BORRADOR_COSECHA_PREFIX}:${fincaId}:${fecha}`;
	}

	function crearBorradorDesdeDigitacion(): BorradorCosechaLocal | null {
		if (!fincaSeleccionada.value || !fechaCosecha.value) return null;
		const items = cosechaStore.saldosPendientes
			.filter((item) => item.cantidad_a_cosechar > 0 || item.rechazo > 0)
			.map((item) => ({
				calendario_id: item.calendario_id,
				cantidad_a_cosechar: Number(item.cantidad_a_cosechar || 0),
				rechazo: Number(item.rechazo || 0),
			}));

		if (!items.length) return null;
		return {
			finca_id: fincaSeleccionada.value,
			fecha: fechaCosecha.value,
			actualizado_en: Date.now(),
			items,
		};
	}

	function guardarBorradorLocal() {
		if (restaurandoBorrador.value || typeof localStorage === 'undefined') return;
		const key = getBorradorKey();
		if (!key) return;

		const borrador = crearBorradorDesdeDigitacion();
		if (!borrador) {
			localStorage.removeItem(key);
			return;
		}

		localStorage.setItem(key, JSON.stringify(borrador));
	}

	function limpiarBorradorLocal(fincaId = fincaSeleccionada.value, fecha = fechaCosecha.value) {
		if (typeof localStorage === 'undefined') return;
		const key = getBorradorKey(fincaId, fecha);
		if (key) localStorage.removeItem(key);
	}

	function limpiarDigitacionActual() {
		cosechaStore.saldosPendientes.forEach((item) => {
			item.cantidad_a_cosechar = 0;
			item.rechazo = 0;
		});
	}

	function restaurarBorradorLocal() {
		if (typeof localStorage === 'undefined') return false;
		const key = getBorradorKey();
		if (!key) return false;
		const raw = localStorage.getItem(key);
		if (!raw) {
			limpiarDigitacionActual();
			return false;
		}

		try {
			const parsed = JSON.parse(raw) as BorradorCosechaLocal;
			const items = Array.isArray(parsed?.items) ? parsed.items : [];
			const mapa = new Map(
				items.map((item) => [Number(item.calendario_id), item]),
			);

			restaurandoBorrador.value = true;
			cosechaStore.saldosPendientes.forEach((item) => {
				const draft = mapa.get(Number(item.calendario_id));
				item.cantidad_a_cosechar = Number(draft?.cantidad_a_cosechar || 0);
				item.rechazo = Number(draft?.rechazo || 0);
				cosechaStore.normalizarItemDigitacion(item);
			});
			return items.length > 0;
		} catch {
			localStorage.removeItem(key);
			limpiarDigitacionActual();
			return false;
		} finally {
			restaurandoBorrador.value = false;
		}
	}

	function obtenerColorTarjeta(item: CintaCosecha) {
		if (cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)) {
			return 'error';
		}
		if (cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)) {
			return 'warning';
		}
		return 'surface';
	}

	function obtenerVarianteTarjeta(
		item: CintaCosecha,
	): 'tonal' | 'elevated' {
		if (cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)) {
			return 'tonal';
		}
		if (cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)) {
			return 'tonal';
		}
		return 'elevated';
	}

	async function cargarSaldos(fincaId: number) {
		if (!fincaId || cosechaStore.loading) return;
		fincaStore.seleccionarFinca(fincaId);
		let saldosActualizados = false;
		restaurandoBorrador.value = true;
		try {
			saldosActualizados = await cosechaStore.cargarSaldos(fincaId);
		} finally {
			restaurandoBorrador.value = false;
		}
		if (!saldosActualizados) {
			notify('No se pudieron actualizar los saldos de cosecha.', 'error');
			return;
		}
		if (restaurarBorradorLocal()) {
			notify('Se restauró un conteo guardado localmente.', 'info');
		}
	}

	function fechaCosechaPermitida(value: unknown): boolean {
		const iso = toIsoDateUnknown(value);
		if (!iso) return false;
		const estado = fechasOcupadas.value[iso];
		if (!estado?.cosecha) return true;
		return iso === fechaCosecha.value;
	}

	function setCampoDigitacion({ item, campo, valor }: SetCampoPayload) {
		const numero = Number(valor);
		item[campo] = Number.isFinite(numero) ? numero : 0;
	}

	function normalizarDigitacion(item: CintaCosecha) {
		cosechaStore.normalizarItemDigitacion(item);
	}

	async function guardarCosecha() {
		if (cosechaStore.loading) return;
		if (!fincaSeleccionada.value) {
			notify('Seleccione una finca', 'error');
			return;
		}
		if (cosechaStore.totalDigitado === 0) {
			notify('Ingrese al menos un racimo', 'info');
			return;
		}
		if (!localStorage.getItem('token')) {
			notify('Sesión no válida. Ingrese nuevamente.', 'error');
			return;
		}

		const result = await cosechaStore.enviarCosecha(
			fincaSeleccionada.value,
			fechaCosecha.value,
		);
		if (!result.ok) {
			notify(result.message, 'error');
			return;
		}
		if (fincaSeleccionada.value && !result.queued) {
			await cargarFechasOcupadas({
				fincaId: fincaSeleccionada.value,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		}
		limpiarBorradorLocal();
		notify(result.message, result.queued ? 'warning' : 'success');
	}

	async function cargarDatosIniciales() {
		const [empresasResult, fincasResult] = await Promise.allSettled([
			empresaStore.empresas.length
				? Promise.resolve()
				: empresaStore.fetchEmpresas(),
			fincaStore.obtenerFincas(),
		]);

		if (empresasResult.status === 'rejected') {
			notify('No se pudieron cargar empresas, continuando con fincas.', 'warning');
		}

		if (fincasResult.status === 'rejected') {
			notify('Error al obtener fincas. Verifique conexión o sesión.', 'error');
			return;
		}

		fincaSeleccionada.value = fincaStore.fincaSeleccionadaId;
		if (!fincaSeleccionada.value && fincas.value.length > 0) {
			fincaSeleccionada.value = fincas.value[0].id;
			fincaStore.seleccionarFinca(fincaSeleccionada.value);
		}

		if (!fincaSeleccionada.value) {
			notify('No hay fincas disponibles para esta sesión.', 'warning');
			return;
		}

		try {
			await cargarSaldos(fincaSeleccionada.value);
			await cargarFechasOcupadas({
				fincaId: fincaSeleccionada.value,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		} catch {
			notify('No se pudieron cargar saldos de cosecha.', 'error');
		}
	}

	watch(fechaObjetoPicker, (newDate) => {
		if (!newDate) return;
		fechaCosecha.value = toLocalIsoDate(newDate);
	});

	watch(fechaCosecha, async () => {
		if (hidratandoPantalla.value) return;
		await nextTick();
		if (restaurarBorradorLocal()) {
			notify('Se restauró el conteo guardado para esta fecha.', 'info');
		}
	});

	watch(
		fincaSeleccionada,
		async (id) => {
			if (hidratandoPantalla.value) return;
			if (!id) {
				limpiarFechasOcupadas();
				return;
			}
			await cargarSaldos(id);
			await cargarFechasOcupadas({
				fincaId: id,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		},
	);

	watch(
		() =>
			cosechaStore.saldosPendientes.map((item) => ({
				id: item.calendario_id,
				buenos: item.cantidad_a_cosechar,
				rechazo: item.rechazo,
			})),
		() => {
			guardarBorradorLocal();
		},
		{ deep: true },
	);

	onMounted(async () => {
		try {
			await cargarDatosIniciales();
		} finally {
			hidratandoPantalla.value = false;
		}
	});

	return {
		cosechaStore,
		fincas,
		fincaSeleccionada,
		fechaCosecha,
		fechaObjetoPicker,
		menuFecha,
		snackbar,
		sortedYears,
		fechaFormateada,
		infoDiaSemana,
		fechaMaxima,
		fechaMinima,
		estadoFechaSeleccionada,
		hayConteoSinEnviar,
		obtenerColorTarjeta,
		obtenerVarianteTarjeta,
		cargarSaldos,
		fechaCosechaPermitida,
		setCampoDigitacion,
		normalizarDigitacion,
		guardarCosecha,
		toIsoDate,
	};
}
