import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { fincaDesdeEnlace } from '@/domain/pendientesFinca';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
	useCosechaStore,
	type CintaCosecha,
} from '@/stores/cosecha/cosechaStore';
import { guardarFincasLocales, leerFincasLocales, permiteCopiaLocal } from '@/utils/cosechaOffline';
import { useFincaStore } from '@/stores/fincaStore';
import { useUIStore, type SnackbarColor } from '@/stores/uiStore';
import { useFechasOcupadas } from '@/composables/useFechasOcupadas';
import { toLocalIsoDate } from '@/utils/dateIso';
import { propietarioCosecha } from '@/utils/cosechaLocal';
import { prepararAppOffline } from '@/utils/prepararAppOffline';

dayjs.extend(isoWeek);

interface SetCampoPayload {
	item: CintaCosecha;
	campo: 'cantidad_a_cosechar' | 'rechazo';
	valor: number;
}

interface BorradorCosechaItem {
	calendario_id: number;
	cantidad_a_cosechar: number;
	rechazo: number;
	color_cinta?: string;
	semana_enfunde?: number;
	anio?: number;
}

export interface ConflictoConteo {
	calendario_id: number;
	nombre: string;
	buenos: number;
	rechazo: number;
	saldo: number | null;
}

interface BorradorCosechaLocal {
	finca_id: number;
	fecha: string;
	actualizado_en: number;
	items: BorradorCosechaItem[];
}

export interface UltimaCintaLiquidada {
	finca_id: number;
	fecha: string;
	color_cinta: string;
	color_hex: string;
	semana_enfunde: number;
	anio: number;
	cantidad_total: number;
	registrado_en: number;
	estado: 'enviado' | 'pendiente_sincronizar';
}

const BORRADOR_COSECHA_PREFIX = 'borrador_cosecha_conteo';
const ULTIMA_CINTA_LIQUIDADA_PREFIX = 'ultima_cinta_liquidacion';

export function useRegistroCosecha(fincaEnlace?: unknown) {
	const cosechaStore = useCosechaStore();
	cosechaStore.activarSesion();
	const propietario = propietarioCosecha();
	const fincaStore = useFincaStore();
	const uiStore = useUIStore();
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
	const ultimaCintaLiquidada = ref<UltimaCintaLiquidada | null>(null);
	const errorBorrador = ref('');
	const hayRespaldoBorrador = ref(false);
	const hayBorradorAntiguo = ref(false);
	const borradorNoLegibleKey = ref('');
	const itemsSinInventario = ref<BorradorCosechaItem[]>([]);
	const avisoOffline = ref('');
	const preparandoOffline = ref(false);
	const conflictosConteo = computed<ConflictoConteo[]>(() => [
		...cosechaStore.saldosPendientes.filter(item => cosechaStore.esExcedido(item)).map(item => ({
			calendario_id: item.calendario_id, nombre: `${item.color_cinta} · Semana ${item.semana_enfunde}/${item.anio}`,
			buenos: item.cantidad_a_cosechar, rechazo: item.rechazo, saldo: item.saldo_en_campo,
		})),
		...itemsSinInventario.value.map(item => ({
			calendario_id: item.calendario_id, nombre: item.color_cinta ? `${item.color_cinta} · Semana ${item.semana_enfunde}/${item.anio}` : `Cinta #${item.calendario_id}`,
			buenos: item.cantidad_a_cosechar, rechazo: item.rechazo, saldo: null,
		})),
	]);

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

	function notify(message: string, color: SnackbarColor = 'info') {
		uiStore.notify(message, color, {
			source: 'Liquidación de cosecha',
			scope: 'operacion',
		});
	}

	function getBorradorKey(fincaId = fincaSeleccionada.value, fecha = fechaCosecha.value) {
		if (!fincaId || !fecha || !propietario || propietario !== propietarioCosecha()) return '';
		return `${BORRADOR_COSECHA_PREFIX}:v2:${propietario}:${fincaId}:${fecha}`;
	}

	function getUltimaCintaKey(fincaId = fincaSeleccionada.value) {
		if (!fincaId || !propietario || propietario !== propietarioCosecha()) return '';
		return `${ULTIMA_CINTA_LIQUIDADA_PREFIX}:v2:${propietario}:${fincaId}`;
	}

	function crearBorradorDesdeDigitacion(): BorradorCosechaLocal | null {
		if (!fincaSeleccionada.value || !fechaCosecha.value) return null;
		const items = cosechaStore.saldosPendientes
			.filter((item) => item.cantidad_a_cosechar > 0 || item.rechazo > 0)
			.map((item) => ({
				calendario_id: item.calendario_id,
				color_cinta: item.color_cinta,
				semana_enfunde: item.semana_enfunde,
				anio: item.anio,
				cantidad_a_cosechar: Number(item.cantidad_a_cosechar || 0),
				rechazo: Number(item.rechazo || 0),
			}));

		const todos = [...items, ...itemsSinInventario.value];
		if (!todos.length) return null;
		return {
			finca_id: fincaSeleccionada.value,
			fecha: fechaCosecha.value,
			actualizado_en: Date.now(),
			items: todos,
		};
	}

	function guardarBorradorLocal() {
		if (hidratandoPantalla.value || restaurandoBorrador.value || cosechaStore.loading || typeof localStorage === 'undefined') return;
		const key = getBorradorKey();
		if (!key || key === borradorNoLegibleKey.value) return;

		try {
			const borrador = crearBorradorDesdeDigitacion();
			if (borrador) localStorage.setItem(key, JSON.stringify(borrador));
			else localStorage.removeItem(key);
			errorBorrador.value = '';
		} catch {
			errorBorrador.value = 'No se pudo guardar el borrador en este equipo. No cierres esta pantalla; libera espacio antes de continuar.';
		}
	}

	function limpiarBorradorLocal(fincaId = fincaSeleccionada.value, fecha = fechaCosecha.value) {
		if (typeof localStorage === 'undefined') return;
		const key = getBorradorKey(fincaId, fecha);
		if (key === borradorNoLegibleKey.value) return;
		try {
			if (key) localStorage.removeItem(key);
		} catch {
			errorBorrador.value = 'No se pudo actualizar el borrador local. Revisa los reportes enviados antes de repetir el conteo.';
		}
	}

	function cargarUltimaCintaLiquidada(fincaId = fincaSeleccionada.value) {
		if (typeof localStorage === 'undefined') return;
		const key = getUltimaCintaKey(fincaId);
		if (!key) {
			ultimaCintaLiquidada.value = null;
			return;
		}

		try {
			const raw = localStorage.getItem(key);
			ultimaCintaLiquidada.value = raw
				? (JSON.parse(raw) as UltimaCintaLiquidada)
				: null;
		} catch {
			localStorage.removeItem(key);
			ultimaCintaLiquidada.value = null;
		}
	}

	function obtenerUltimoItemDigitado() {
		return [...cosechaStore.saldosPendientes]
			.filter((item) => item.cantidad_a_cosechar > 0 || item.rechazo > 0)
			.pop() || null;
	}

	function guardarUltimaCintaLiquidada(
		estado: UltimaCintaLiquidada['estado'],
		ultimoItem: CintaCosecha | null,
	) {
		if (typeof localStorage === 'undefined' || !fincaSeleccionada.value) return;
		if (!ultimoItem) return;

		const data: UltimaCintaLiquidada = {
			finca_id: fincaSeleccionada.value,
			fecha: fechaCosecha.value,
			color_cinta: ultimoItem.color_cinta,
			color_hex: ultimoItem.color_hex,
			semana_enfunde: ultimoItem.semana_enfunde,
			anio: ultimoItem.anio,
			cantidad_total:
				Number(ultimoItem.cantidad_a_cosechar || 0) +
				Number(ultimoItem.rechazo || 0),
			registrado_en: Date.now(),
			estado,
		};
		const key = getUltimaCintaKey();
		try {
			if (key) localStorage.setItem(key, JSON.stringify(data));
		} catch {
			notify('El reporte fue procesado, pero no se pudo guardar el recordatorio de la ultima cinta.', 'warning');
		}
		ultimaCintaLiquidada.value = data;
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
		restaurandoBorrador.value = true;
		try {
			itemsSinInventario.value = [];
			hayRespaldoBorrador.value = Boolean(localStorage.getItem(key + ':respaldo'));
			borradorNoLegibleKey.value = '';
			errorBorrador.value = '';
			hayBorradorAntiguo.value = Boolean(localStorage.getItem(`${BORRADOR_COSECHA_PREFIX}:${fincaSeleccionada.value}:${fechaCosecha.value}`));
			const raw = localStorage.getItem(key);
			if (!raw) {
				limpiarDigitacionActual();
				return false;
			}
			const parsed = JSON.parse(raw) as BorradorCosechaLocal;
			if (!Array.isArray(parsed?.items) || !parsed.items.every(item =>
				Number.isSafeInteger(item.calendario_id) && item.calendario_id > 0 &&
				[item.cantidad_a_cosechar, item.rechazo].every(n => Number.isSafeInteger(n) && n >= 0)) ||
				new Set(parsed.items.map(item => item.calendario_id)).size !== parsed.items.length) throw new Error('Borrador invalido');
			const items = parsed.items;
			const mapa = new Map(
				items.map((item) => [Number(item.calendario_id), item]),
			);

			const disponibles = new Set(cosechaStore.saldosPendientes.map(item => item.calendario_id));
			itemsSinInventario.value = items.filter(item => !disponibles.has(item.calendario_id) && item.cantidad_a_cosechar + item.rechazo > 0);
			cosechaStore.saldosPendientes.forEach((item) => {
				const draft = mapa.get(Number(item.calendario_id));
				item.cantidad_a_cosechar = Number(draft?.cantidad_a_cosechar || 0);
				item.rechazo = Number(draft?.rechazo || 0);
			});
			return items.length > 0;
		} catch {
			borradorNoLegibleKey.value = key;
			errorBorrador.value = 'No se pudo recuperar el borrador local. Se conserva sin modificar para revision.';
			limpiarDigitacionActual();
			return false;
		} finally {
			restaurandoBorrador.value = false;
		}
	}

	function corregirConflicto(id: number, buenos: number, rechazo: number): boolean {
		if (cosechaStore.loading || cosechaStore.submitting || cosechaStore.sincronizando ||
			![buenos, rechazo].every(n => Number.isSafeInteger(n) && n >= 0)) return false;
		const conflicto = conflictosConteo.value.find(item => item.calendario_id === id);
		if (!conflicto || buenos + rechazo > (conflicto.saldo ?? 0)) return false;
		const key = getBorradorKey();
		if (!key || key === borradorNoLegibleKey.value) return false;
		try {
			const raw = localStorage.getItem(key);
			if (raw && !localStorage.getItem(key + ':respaldo')) localStorage.setItem(key + ':respaldo', raw);
			hayRespaldoBorrador.value = Boolean(localStorage.getItem(key + ':respaldo'));
		} catch {
			errorBorrador.value = 'No se pudo respaldar el conteo original. No se aplicó la corrección.';
			return false;
		}
		const item = cosechaStore.saldosPendientes.find(item => item.calendario_id === id);
		if (item) { item.cantidad_a_cosechar = buenos; item.rechazo = rechazo; }
		else itemsSinInventario.value = itemsSinInventario.value.filter(item => item.calendario_id !== id);
		guardarBorradorLocal();
		return !errorBorrador.value;
	}

	function exportarBorrador() {
		const key = getBorradorKey();
		if (!key) return;
		try {
			const actual = localStorage.getItem(key);
			const respaldo = localStorage.getItem(key + ':respaldo');
			const url = URL.createObjectURL(new Blob([JSON.stringify({ actual, respaldo }, null, 2)], { type: 'application/json' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = `conteo-${fincaSeleccionada.value}-${fechaCosecha.value}.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch { notify('No se pudo descargar el respaldo del conteo.', 'error'); }
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
		if (!fincaId) return;
		fincaStore.seleccionarFinca(fincaId);
		let saldosActualizados = false;
		restaurandoBorrador.value = true;
		try {
			saldosActualizados = await cosechaStore.cargarSaldos(fincaId);
			if (!saldosActualizados) {
			notify('No se pudieron actualizar los saldos de cosecha.', 'error');
			restaurarBorradorLocal();
			return;
			}
			if (restaurarBorradorLocal()) {
			notify('Se restauró un conteo guardado localmente.', 'info');
			}
		} finally {
			restaurandoBorrador.value = false;
		}
	}

	async function prepararSinConexion() {
		const fincaId = fincaSeleccionada.value;
		if (!fincaId || preparandoOffline.value || cosechaStore.loading || cosechaStore.submitting || cosechaStore.sincronizando) return;
		preparandoOffline.value = true;
		avisoOffline.value = '';
		try {
			if (!cosechaStore.isOnline) throw new Error('Conéctate para descargar la aplicación y actualizar los saldos.');
			await fincaStore.obtenerFincas();
			if (!propietario || propietario !== propietarioCosecha() || !fincas.value.some(f => f.id === fincaId)) throw new Error('La finca ya no está disponible en esta sesión.');
			guardarFincasLocales(propietario, fincas.value);
			await cargarSaldos(fincaId);
			if (cosechaStore.inventarioLocal || cosechaStore.errorCopiaLocal || !cosechaStore.inventarioConsultadoEn) throw new Error(cosechaStore.errorCopiaLocal || 'No se pudo descargar un inventario actualizado.');
			await prepararAppOffline();
			if (propietario !== propietarioCosecha() || fincaSeleccionada.value !== fincaId) return;
			avisoOffline.value = 'Finca preparada en este dispositivo. Conserva la sesión y no borres los datos del navegador. Los envíos se validarán al recuperar conexión.';
		} catch (error) {
			avisoOffline.value = error instanceof Error ? error.message : 'No se pudo preparar el trabajo sin conexión.';
		} finally { preparandoOffline.value = false; }
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
		if (conflictosConteo.value.length || borradorNoLegibleKey.value) {
			notify('El conteo se conserva. Resuelve las diferencias de inventario antes de enviar.', 'warning');
			return;
		}
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

		const ultimoItem = obtenerUltimoItemDigitado();
		const ultimoItemDigitado = ultimoItem ? { ...ultimoItem } : null;
		const result = await cosechaStore.enviarCosecha(
			fincaSeleccionada.value,
			fechaCosecha.value,
		);
		if (!result.ok) {
			notify(result.message, 'error');
			return;
		}
		guardarUltimaCintaLiquidada(
			result.queued ? 'pendiente_sincronizar' : 'enviado',
			ultimoItemDigitado,
		);
		if (fincaSeleccionada.value && !result.queued) {
			await cargarFechasOcupadas({
				fincaId: fincaSeleccionada.value,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		}
		if (cosechaStore.totalDigitado > 0) guardarBorradorLocal();
		else limpiarBorradorLocal();
		notify(result.message, result.queued ? 'warning' : 'success');
	}

	async function cargarDatosIniciales() {
		try {
			if (!cosechaStore.isOnline) throw new Error('Sin conexion');
			await fincaStore.obtenerFincas();
			if (propietario && propietario === propietarioCosecha()) {
				try { guardarFincasLocales(propietario, fincas.value); }
				catch { avisoOffline.value = 'No se pudo guardar la lista de fincas para uso sin conexión.'; }
			}
		} catch (error) {
			if (!propietario || propietario !== propietarioCosecha() || !permiteCopiaLocal(error)) return;
			fincaStore.fincas = leerFincasLocales(propietario);
			avisoOffline.value = fincaStore.fincas.length
				? 'Usando las fincas descargadas en este dispositivo.'
				: 'No hay fincas descargadas. Conéctate y prepara la finca antes de trabajar sin señal.';
			if (!fincaStore.fincas.length) { restaurarBorradorLocal(); return; }
		}
		if (propietario !== propietarioCosecha()) return;

		if (fincaEnlace !== undefined) {
			const destino = fincaDesdeEnlace(fincaEnlace, fincas.value);
			if (!destino) {
				fincaSeleccionada.value = null;
				notify('La finca del pendiente no está disponible para esta sesión. Selecciona una finca autorizada.', 'warning');
				return;
			}
			fincaStore.seleccionarFinca(destino);
		}
		fincaSeleccionada.value = fincaStore.fincaSeleccionadaId;
		if (!fincas.value.some(finca => finca.id === fincaSeleccionada.value) && fincas.value.length > 0) {
			fincaSeleccionada.value = fincas.value[0].id;
			fincaStore.seleccionarFinca(fincaSeleccionada.value);
		}

		if (!fincaSeleccionada.value) {
			notify('No hay fincas disponibles para esta sesión.', 'warning');
			return;
		}

		try {
			await cargarSaldos(fincaSeleccionada.value);
			cargarUltimaCintaLiquidada(fincaSeleccionada.value);
			if (cosechaStore.isOnline) await cargarFechasOcupadas({
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
			cargarUltimaCintaLiquidada(id);
			if (!cosechaStore.isOnline) limpiarFechasOcupadas();
			else await cargarFechasOcupadas({
				fincaId: id,
				fechaDesde: fechaMinima.value,
				fechaHasta: fechaMaxima.value,
			});
		},
	);

	watch(
		() => cosechaStore.loading,
		(loading, anterior) => {
			if (!loading && anterior && cosechaStore.fincaActivaId === fincaSeleccionada.value) restaurarBorradorLocal();
		},
		{ flush: 'sync' },
	);

	watch(
		() => [
			...itemsSinInventario.value,
			...cosechaStore.saldosPendientes.map((item) => ({
				id: item.calendario_id,
				buenos: item.cantidad_a_cosechar,
				rechazo: item.rechazo,
			})),
		],
		() => {
			guardarBorradorLocal();
		},
		{ deep: true, flush: 'sync' },
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
		sortedYears,
		fechaFormateada,
		infoDiaSemana,
		fechaMaxima,
		fechaMinima,
		estadoFechaSeleccionada,
		hayConteoSinEnviar,
		ultimaCintaLiquidada,
		errorBorrador,
		hayRespaldoBorrador,
		hayBorradorAntiguo,
		conflictosConteo,
		corregirConflicto,
		exportarBorrador,
		avisoOffline,
		preparandoOffline,
		prepararSinConexion,
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
