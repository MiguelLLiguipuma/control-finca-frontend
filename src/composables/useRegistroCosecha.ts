import { computed, onMounted, ref, watch } from 'vue';
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
	const fechaCosecha = ref(new Date().toISOString().split('T')[0]);
	const fechaObjetoPicker = ref<Date | null>(new Date());
	const menuFecha = ref(false);
	const hidratandoPantalla = ref(true);
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

	function notify(message: string, color = 'info') {
		snackbar.value = { show: true, message, color };
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
		await cosechaStore.cargarSaldos(fincaId);
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
		if (fincaSeleccionada.value) {
			await cargarFechasOcupadas({
				fincaId: fincaSeleccionada.value,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		}
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
		const offset = newDate.getTimezoneOffset();
		const dateLocal = new Date(newDate.getTime() - offset * 60 * 1000);
		fechaCosecha.value = dateLocal.toISOString().split('T')[0];
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
