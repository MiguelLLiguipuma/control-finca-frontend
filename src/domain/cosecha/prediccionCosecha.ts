import type {
	PrediccionCosechaItem,
	PrediccionCosechaResponse,
	PrediccionProximoEmbarque,
	PrediccionModeloInfo,
	PrediccionCacheInfo,
	PrediccionClimaInfo,
} from '@/services/cosecha/cosechaService';
import type { EmbarqueListItem } from '@/services/embarque/embarqueTypes';
import {
	calculateIsoWeekAge,
	MIN_CUTTABLE_CINTA_AGE_WEEKS,
	isIsoWeekAgeVisible,
	isoWeekStartDate,
} from '@/utils/dateIso';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const MADUREZ_AJUSTADA_MARKER = 'MADUREZ_AJUSTADA_POR_EDAD';

export type NivelConfianza = 'ALTA' | 'MEDIA' | 'BAJA';

export interface PrediccionFilaVM extends PrediccionCosechaItem {
	confianza: NivelConfianza;
	explicacion: string;
}

export interface PrediccionCosechaVM {
	metaAplicada: number | string;
	promedioUC: string | number;
	ratioAplicado: number | null;
	filas: PrediccionFilaVM[];
	semanaInicio?: number;
	semanaFin?: number;
	proximoEmbarque: PrediccionProximoEmbarque | null;
	modelo: PrediccionModeloInfo | null;
	cache: PrediccionCacheInfo | null;
	clima: PrediccionClimaInfo | null;
}

export interface BacktestingSemanaVM {
	key: string;
	semanaLabel: string;
	cajasReales: number;
	cajasEstimadas: number;
	errorAbs: number;
	errorPct: number;
}

export interface BacktestingResumenVM {
	mae: number;
	mape: number;
	sesgoPct: number;
	totalSemanas: number;
}

export interface DiagnosticoBacktestingVM {
	estadoLabel: 'ESTABLE' | 'VIGILAR' | 'CRITICO';
	estadoColor: 'success' | 'warning' | 'error';
	recomiendaRecalibrar: boolean;
	mensaje: string;
}

export type CalidadDatosNivel = 'ALTA' | 'MEDIA' | 'BAJA';
export type CalidadDatosEstado = 'ok' | 'warning' | 'error';

export interface CalidadDatosCheck {
	key: string;
	label: string;
	estado: CalidadDatosEstado;
	puntos: number;
	maxPuntos: number;
	mensaje: string;
}

export interface CalidadDatosPrediccionVM {
	score: number;
	nivel: CalidadDatosNivel;
	color: 'success' | 'warning' | 'error';
	mensaje: string;
	checks: CalidadDatosCheck[];
}

export interface RecomendacionOperativaPrediccion {
	key: string;
	titulo: string;
	detalle: string;
	color: 'success' | 'warning' | 'error' | 'info';
	icon: string;
	prioridad: number;
}

export function crearPrediccionVacia(): PrediccionCosechaVM {
	return {
		metaAplicada: '--',
		promedioUC: '--',
		ratioAplicado: null,
		filas: [],
		semanaInicio: undefined,
		semanaFin: undefined,
		proximoEmbarque: null,
		modelo: null,
		cache: null,
		clima: null,
	};
}

export function crearCalidadDatosVacia(): CalidadDatosPrediccionVM {
	return {
		score: 0,
		nivel: 'BAJA',
		color: 'error',
		mensaje: 'Sin datos suficientes para evaluar la calidad.',
		checks: [],
	};
}

export function construirPrediccionVM(
	data: PrediccionCosechaResponse | null | undefined,
): PrediccionCosechaVM {
	if (!data) return crearPrediccionVacia();

	const clima = data.clima || data.modelo?.clima || null;
	const promedioUC = clima && !clima.confiable
		? 'Sin clima reciente'
		: data.promedio_uc_diario || data.promedio_climatico_semanal || '--';

	return {
		metaAplicada: data.meta_aplicada || '--',
		promedioUC,
		ratioAplicado:
			typeof data.ratio_aplicado === 'number' && Number.isFinite(data.ratio_aplicado)
				? data.ratio_aplicado
				: null,
		filas: ordenarFilasPorUrgencia(
			data.proyecciones || [],
			data.semana_inicio,
		),
		semanaInicio: data.semana_inicio,
		semanaFin: data.semana_fin,
		proximoEmbarque: data.prediccion_proximo_embarque || null,
		modelo: data.modelo || null,
		cache: data.cache || null,
		clima,
	};
}

function construirCheck(
	key: string,
	label: string,
	puntos: number,
	maxPuntos: number,
	mensaje: string,
): CalidadDatosCheck {
	const ratio = maxPuntos > 0 ? puntos / maxPuntos : 0;
	const estado: CalidadDatosEstado =
		ratio >= 0.75 ? 'ok' : ratio >= 0.4 ? 'warning' : 'error';

	return {
		key,
		label,
		estado,
		puntos: Number(puntos.toFixed(2)),
		maxPuntos,
		mensaje,
	};
}

function nivelDesdeScore(score: number): CalidadDatosNivel {
	if (score >= 80) return 'ALTA';
	if (score >= 55) return 'MEDIA';
	return 'BAJA';
}

function colorDesdeNivel(nivel: CalidadDatosNivel): CalidadDatosPrediccionVM['color'] {
	if (nivel === 'ALTA') return 'success';
	if (nivel === 'MEDIA') return 'warning';
	return 'error';
}

export function evaluarCalidadDatosPrediccion(
	vm: PrediccionCosechaVM,
	backtesting?: BacktestingResumenVM,
): CalidadDatosPrediccionVM {
	const filasConSaldo = (vm.filas || []).filter(
		(item) => Number(item.saldo_en_campo || 0) > 0,
	);
	const semanasAnalizadas = Number(vm.modelo?.semanas_analizadas || 0);
	const coefVariacion = Number(vm.modelo?.coef_variacion);
	const hasCoefVariacion = Number.isFinite(coefVariacion) && coefVariacion >= 0;
	const mape = Number(backtesting?.mape || 0);
	const semanasBacktesting = Number(backtesting?.totalSemanas || 0);
	const clima = vm.clima || vm.modelo?.clima || null;

	const checks: CalidadDatosCheck[] = [];

	const puntosInventario =
		filasConSaldo.length >= 4 ? 20 : filasConSaldo.length >= 2 ? 14 : filasConSaldo.length >= 1 ? 8 : 0;
	checks.push(
		construirCheck(
			'inventario',
			'Inventario de cintas',
			puntosInventario,
			20,
			filasConSaldo.length
				? `${filasConSaldo.length} cinta(s) con saldo disponible.`
				: 'No hay cintas con saldo disponible para proyectar.',
		),
	);

	const filasMadurezAjustada = filasConSaldo.filter(
		(item) => String(item.tendencia_climatica || '').includes(MADUREZ_AJUSTADA_MARKER),
	).length;
	const puntosMadurez =
		!filasConSaldo.length || filasMadurezAjustada === 0
			? 15
			: filasMadurezAjustada <= Math.max(1, Math.ceil(filasConSaldo.length * 0.2))
				? 9
				: 3;
	checks.push(
		construirCheck(
			'madurez-coherencia',
			'Coherencia de madurez',
			puntosMadurez,
			15,
			filasMadurezAjustada
				? `${filasMadurezAjustada} cinta(s) tenían madurez climática adelantada y fueron ajustadas por edad real.`
				: 'La madurez climática coincide con la edad operativa de las cintas.',
		),
	);

	const climaConfiable = clima?.confiable === true;
	const puntosClima = !clima
		? 2
		: climaConfiable
			? 15
			: clima.estado === 'ATRASADO'
				? 4
				: 0;
	checks.push(
		construirCheck(
			'clima',
			'Historial climático',
			puntosClima,
			15,
			!clima
				? 'El backend no informó la salud del historial climático.'
				: climaConfiable
					? `Clima actualizado. Última fecha: ${clima.ultima_fecha_clima || '--'}.`
					: clima.estado === 'ATRASADO'
						? `Clima atrasado ${clima.dias_atraso ?? '--'} día(s). La madurez usa respaldo por edad.`
						: 'Sin registros climáticos para esta finca.',
		),
	);

	const puntosRatio =
		typeof vm.ratioAplicado === 'number' && Number.isFinite(vm.ratioAplicado) && vm.ratioAplicado > 0
			? 15
			: 0;
	checks.push(
		construirCheck(
			'ratio',
			'Ratio aplicado',
			puntosRatio,
			15,
			puntosRatio
				? `Ratio disponible: ${vm.ratioAplicado?.toFixed(4)}.`
				: 'No hay ratio aplicado; las cajas esperadas pierden confiabilidad.',
		),
	);

	const puntosModelo =
		semanasAnalizadas >= 8 ? 20 : semanasAnalizadas >= 4 ? 14 : semanasAnalizadas >= 1 ? 7 : 0;
	checks.push(
		construirCheck(
			'modelo',
			'Historial del modelo',
			puntosModelo,
			20,
			semanasAnalizadas
				? `${semanasAnalizadas} semana(s) analizadas por el modelo.`
				: 'No se recibió información histórica del modelo.',
		),
	);

	let puntosEstabilidad = 10;
	if (hasCoefVariacion) {
		if (coefVariacion <= 0.2) puntosEstabilidad = 15;
		else if (coefVariacion <= 0.35) puntosEstabilidad = 11;
		else puntosEstabilidad = 5;
	}
	checks.push(
		construirCheck(
			'estabilidad',
			'Estabilidad histórica',
			puntosEstabilidad,
			15,
			hasCoefVariacion
				? `Coeficiente de variación: ${(coefVariacion * 100).toFixed(1)}%.`
				: 'Sin coeficiente de variación; se aplica evaluación conservadora.',
		),
	);

	const puntosEmbarque = vm.proximoEmbarque ? 15 : 4;
	checks.push(
		construirCheck(
			'embarque',
			'Predicción de embarque',
			puntosEmbarque,
			15,
			vm.proximoEmbarque
				? `Método: ${vm.proximoEmbarque.metodo || 'backend'}.`
				: 'No se recibió bloque avanzado de próximo embarque; se usa estimación básica.',
		),
	);

	let puntosBacktesting = 5;
	let mensajeBacktesting = 'Sin suficientes vouchers confirmados para validar error reciente.';
	if (semanasBacktesting >= 4) {
		if (mape <= 8) puntosBacktesting = 15;
		else if (mape <= 15) puntosBacktesting = 10;
		else puntosBacktesting = 4;
		mensajeBacktesting = `${semanasBacktesting} semana(s) validadas, MAPE ${mape.toFixed(2)}%.`;
	}
	checks.push(
		construirCheck(
			'backtesting',
			'Validación contra real',
			puntosBacktesting,
			15,
			mensajeBacktesting,
		),
	);

	const puntosLogrados = checks.reduce((acc, item) => acc + item.puntos, 0);
	const puntosPosibles = checks.reduce((acc, item) => acc + item.maxPuntos, 0);
	const score = puntosPosibles > 0
		? Math.max(0, Math.min(100, Math.round((puntosLogrados / puntosPosibles) * 100)))
		: 0;
	const nivel = nivelDesdeScore(score);

	return {
		score,
		nivel,
		color: colorDesdeNivel(nivel),
		mensaje:
			nivel === 'ALTA'
				? 'Datos suficientes para usar la predicción como referencia operativa.'
				: nivel === 'MEDIA'
					? 'Predicción útil, pero conviene revisar campo antes de decidir.'
					: 'Predicción débil; requiere más historial o validación manual.',
		checks,
	};
}

export function generarRecomendacionesOperativas(
	vm: PrediccionCosechaVM,
	calidad: CalidadDatosPrediccionVM,
	backtesting?: BacktestingResumenVM,
): RecomendacionOperativaPrediccion[] {
	const recomendaciones: RecomendacionOperativaPrediccion[] = [];
	const proximo = vm.proximoEmbarque;
	const filas = vm.filas || [];
	const urgentes = filas.filter(
		(item) =>
			Number(item.dias_faltantes || 0) <= 7 ||
			Number(item.progreso_madurez || 0) >= 90,
	);
	const riesgo = Number(proximo?.racimos_en_riesgo || 0);
	const ideal = Number(proximo?.racimos_rango_ideal || 0);
	const totalEstimado = Number(proximo?.racimos_estimados || 0);
	const mape = Number(backtesting?.mape || 0);
	const sesgo = Number(backtesting?.sesgoPct || 0);
	const semanasBacktesting = Number(backtesting?.totalSemanas || 0);

	if (calidad.nivel === 'BAJA') {
		recomendaciones.push({
			key: 'calidad-baja',
			titulo: 'Validar datos antes de decidir',
			detalle: 'La base de datos es débil para planificación; revise campo, saldos y vouchers recientes.',
			color: 'error',
			icon: 'mdi-database-alert',
			prioridad: 10,
		});
	} else if (calidad.nivel === 'MEDIA') {
		recomendaciones.push({
			key: 'calidad-media',
			titulo: 'Usar como referencia con revisión de campo',
			detalle: 'La predicción es útil, pero conviene confirmar las cintas críticas antes de programar corte.',
			color: 'warning',
			icon: 'mdi-clipboard-search-outline',
			prioridad: 6,
		});
	} else {
		recomendaciones.push({
			key: 'calidad-alta',
			titulo: 'Predicción apta para planificación',
			detalle: 'Los datos tienen buena base para organizar corte, embarque y recursos operativos.',
			color: 'success',
			icon: 'mdi-check-decagram-outline',
			prioridad: 3,
		});
	}

	if (vm.clima && !vm.clima.confiable) {
		recomendaciones.push({
			key: 'clima-atrasado',
			titulo: 'Sincronizar historial climático',
			detalle:
				vm.clima.estado === 'ATRASADO'
					? `El clima está atrasado ${vm.clima.dias_atraso ?? '--'} día(s). Actualice clima antes de confiar en UC.`
					: 'No hay historial climático útil para esta finca. Revise coordenadas y sincronización.',
			color: 'warning',
			icon: 'mdi-weather-cloudy-alert',
			prioridad: 10,
		});
	}

	if (urgentes.length > 0) {
		const top = urgentes.slice(0, 3).map((item) => item.color_cinta).join(', ');
		recomendaciones.push({
			key: 'cintas-urgentes',
			titulo: 'Priorizar revisión de cintas críticas',
			detalle: `${urgentes.length} cinta(s) cerca de corte o sobremadurez: ${top}.`,
			color: 'error',
			icon: 'mdi-alert-circle-outline',
			prioridad: 9,
		});
	}

	if (proximo && riesgo > 0 && totalEstimado > 0) {
		const riesgoPct = (riesgo / totalEstimado) * 100;
		if (riesgoPct >= 35) {
			recomendaciones.push({
				key: 'riesgo-alto',
				titulo: 'Riesgo operativo alto',
				detalle: `${riesgo} racimos en riesgo (${riesgoPct.toFixed(1)}%). Ajuste cuadrilla o fecha de corte.`,
				color: 'warning',
				icon: 'mdi-timeline-alert-outline',
				prioridad: 8,
			});
		} else if (ideal > 0) {
			recomendaciones.push({
				key: 'rango-ideal',
				titulo: 'Mantener enfoque en rango ideal',
				detalle: `${ideal} racimos están dentro del rango ideal estimado para el próximo embarque.`,
				color: 'success',
				icon: 'mdi-target',
				prioridad: 2,
			});
		}
	}

	if (!proximo) {
		recomendaciones.push({
			key: 'sin-embarque-avanzado',
			titulo: 'Estimación básica activa',
			detalle: 'No llegó el bloque avanzado de próximo embarque; use el resultado como orientación preliminar.',
			color: 'info',
			icon: 'mdi-information-outline',
			prioridad: 5,
		});
	}

	if (semanasBacktesting >= 4) {
		if (mape > 15) {
			recomendaciones.push({
				key: 'backtesting-critico',
				titulo: 'Recalibrar predicción',
				detalle: `El error reciente es alto (MAPE ${mape.toFixed(2)}%). Revise ratio y comportamiento histórico.`,
				color: 'error',
				icon: 'mdi-wrench-clock-outline',
				prioridad: 10,
			});
		} else if (Math.abs(sesgo) >= 8) {
			recomendaciones.push({
				key: 'sesgo-persistente',
				titulo: sesgo > 0 ? 'El modelo está sobreestimando' : 'El modelo está subestimando',
				detalle: `Sesgo reciente de ${sesgo.toFixed(2)}%. Ajuste el criterio antes de comprometer embarque.`,
				color: 'warning',
				icon: 'mdi-scale-balance',
				prioridad: 7,
			});
		}
	} else {
		recomendaciones.push({
			key: 'sin-backtesting',
			titulo: 'Falta validación contra embarques reales',
			detalle: 'Se necesitan más vouchers confirmados para medir el error reciente con confianza.',
			color: 'info',
			icon: 'mdi-history',
			prioridad: 4,
		});
	}

	return recomendaciones
		.sort((a, b) => b.prioridad - a.prioridad)
		.slice(0, 4);
}

export function ordenarFilasPorUrgencia(
	filas: PrediccionCosechaItem[],
	semanaInicioCorte = MIN_CUTTABLE_CINTA_AGE_WEEKS,
): PrediccionFilaVM[] {
	const edadMinimaCorte =
		Number.isFinite(Number(semanaInicioCorte)) && Number(semanaInicioCorte) > 0
			? Number(semanaInicioCorte)
			: MIN_CUTTABLE_CINTA_AGE_WEEKS;

	return [...filas]
		.filter((item) =>
			isIsoWeekAgeVisible(Number(item.semana_enfunde), Number(item.anio)),
		)
		.map((item) => normalizarFilaPrediccion(item, edadMinimaCorte))
		.sort((a, b) => a.dias_faltantes - b.dias_faltantes)
		.map((item) => ({
			...item,
			confianza: calcularConfianza(item),
			explicacion: construirExplicacion(item),
		}));
}

function normalizarFilaPrediccion(
	item: PrediccionCosechaItem,
	edadMinimaCorte: number,
): PrediccionCosechaItem {
	const fechaEstimada = resolverFechaEstimadaCoherente(item, edadMinimaCorte);
	const diasFaltantes = calcularDiasFaltantesPorFecha(fechaEstimada, item);
	const edad = calculateIsoWeekAge(
		Number(item.semana_enfunde),
		Number(item.anio),
	);
	const progresoMadurez = resolverProgresoMadurezCoherente(
		item,
		edad,
		edadMinimaCorte,
	);

	return {
		...item,
		progreso_madurez: progresoMadurez,
		fecha_estimada: fechaEstimada.format('YYYY-MM-DD'),
		dias_faltantes: diasFaltantes,
		tendencia_climatica:
			progresoMadurez < Number(item.progreso_madurez || 0)
				? `${item.tendencia_climatica || 'sin tendencia'} · ${MADUREZ_AJUSTADA_MARKER}`
				: item.tendencia_climatica,
		mensaje_clima: resolverEstadoPrediccion(
			{ ...item, progreso_madurez: progresoMadurez },
			diasFaltantes,
			edad,
			edadMinimaCorte,
		),
	};
}

function resolverFechaEstimadaCoherente(
	item: PrediccionCosechaItem,
	edadMinimaCorte: number,
): dayjs.Dayjs {
	const fechaBackend = dayjs(String(item.fecha_estimada || '').slice(0, 10));
	const fechaMinimaCorte = isoWeekStartDate(
		Number(item.anio),
		Number(item.semana_enfunde),
	)
		.add(edadMinimaCorte, 'week')
		.startOf('day');

	if (!fechaBackend.isValid()) return fechaMinimaCorte;
	return fechaBackend.isBefore(fechaMinimaCorte) ? fechaMinimaCorte : fechaBackend.startOf('day');
}

function resolverProgresoMadurezCoherente(
	item: PrediccionCosechaItem,
	edad: number,
	edadMinimaCorte: number,
): number {
	const progresoBackend = Number(item.progreso_madurez);
	const progreso = Number.isFinite(progresoBackend) ? progresoBackend : 0;
	const edadBase = Math.max(1, edadMinimaCorte);
	const maximoPorEdad = Math.min(100, (Math.max(0, edad) / edadBase) * 100);

	return Number(Math.max(0, Math.min(progreso, maximoPorEdad)).toFixed(1));
}

function calcularDiasFaltantesPorFecha(
	fechaEstimada: dayjs.Dayjs,
	item: PrediccionCosechaItem,
): number {
	const diasBackend = Number(item.dias_faltantes);
	const diasFallback = Number.isFinite(diasBackend) ? diasBackend : 0;

	if (!fechaEstimada.isValid()) {
		return Math.max(0, Math.round(diasFallback));
	}

	const hoy = dayjs().startOf('day');
	const diasCalendario = fechaEstimada.startOf('day').diff(hoy, 'day');
	return Math.max(0, diasCalendario);
}

function resolverEstadoPrediccion(
	item: PrediccionCosechaItem,
	diasFaltantes: number,
	edad: number,
	edadMinimaCorte: number,
): string {
	const madurez = Number(item.progreso_madurez || 0);
	const estadoBackend = String(item.mensaje_clima || '').trim();

	if (edad < Math.max(0, edadMinimaCorte - 1)) {
		return 'En Desarrollo';
	}

	if (
		edad >= edadMinimaCorte &&
		(diasFaltantes <= 0 || madurez >= 90 || estadoBackend === 'Corte Urgente')
	) {
		return 'Corte Urgente';
	}

	if (diasFaltantes <= 7 || madurez >= 75) {
		return 'Proxima Cosecha';
	}

	return estadoBackend || 'En Desarrollo';
}

export function colorEstadoPrediccion(mensajeClima: string): string {
	if (mensajeClima === 'Corte Urgente') return 'error';
	if (mensajeClima === 'Proxima Cosecha') return 'warning';
	return 'success';
}

export function colorMadurezPrediccion(progresoMadurez: number): string {
	if (progresoMadurez >= 90) return 'error';
	if (progresoMadurez >= 75) return 'warning';
	return 'info';
}

export function colorConfianzaPrediccion(confianza: NivelConfianza): string {
	if (confianza === 'ALTA') return 'success';
	if (confianza === 'MEDIA') return 'warning';
	return 'error';
}

function calcularConfianza(item: PrediccionCosechaItem): NivelConfianza {
	const tendencia = String(item.tendencia_climatica || '').toUpperCase();
	const dias = Number(item.dias_faltantes || 0);
	const madurez = Number(item.progreso_madurez || 0);

	const penalizaTendencia =
		tendencia.includes('ALTA VARIABILIDAD') || tendencia.includes('INESTABLE');
	if (penalizaTendencia) return 'BAJA';
	if (dias <= 10 && madurez >= 70) return 'ALTA';
	if (dias <= 20 && madurez >= 50) return 'MEDIA';
	return 'BAJA';
}

function construirExplicacion(item: PrediccionCosechaItem): string {
	const dias = Number(item.dias_faltantes || 0);
	const madurez = Number(item.progreso_madurez || 0);
	const tendencia = String(item.tendencia_climatica || 'sin tendencia')
		.replace(` · ${MADUREZ_AJUSTADA_MARKER}`, '')
		.replace(MADUREZ_AJUSTADA_MARKER, 'madurez ajustada por edad real');
	return `Madurez ${madurez.toFixed(1)}%, ${dias} dias estimados, clima: ${tendencia}.`;
}

export function construirBacktestingSemanal(
	vouchers: EmbarqueListItem[],
	ratioAplicado: number | null,
): BacktestingSemanaVM[] {
	if (!Array.isArray(vouchers) || !vouchers.length) return [];
	if (typeof ratioAplicado !== 'number' || !Number.isFinite(ratioAplicado) || ratioAplicado <= 0) {
		return [];
	}

	const agrupado = new Map<string, { anio: number; semana: number; real: number; estimada: number }>();

	for (const item of vouchers) {
		const fecha = dayjs(item.fecha_embarque);
		if (!fecha.isValid()) continue;
		const anio = fecha.isoWeekYear();
		const semana = fecha.isoWeek();
		const key = `${anio}-W${String(semana).padStart(2, '0')}`;

		const real = Number(item.total_cajas || 0);
		const estimada = Number(item.total_racimos || 0) * ratioAplicado;

		const prev = agrupado.get(key) || { anio, semana, real: 0, estimada: 0 };
		prev.real += real;
		prev.estimada += estimada;
		agrupado.set(key, prev);
	}

	return Array.from(agrupado.entries())
		.map(([key, x]) => {
			const errorAbs = Math.abs(x.real - x.estimada);
			const errorPct = x.real > 0 ? (errorAbs / x.real) * 100 : 0;
			return {
				key,
				semanaLabel: `Sem ${x.semana}/${x.anio}`,
				cajasReales: Number(x.real.toFixed(2)),
				cajasEstimadas: Number(x.estimada.toFixed(2)),
				errorAbs: Number(errorAbs.toFixed(2)),
				errorPct: Number(errorPct.toFixed(2)),
			};
		})
		.sort((a, b) => a.key.localeCompare(b.key));
}

export function resumirBacktestingSemanal(
	semanas: BacktestingSemanaVM[],
): BacktestingResumenVM {
	if (!semanas.length) {
		return { mae: 0, mape: 0, sesgoPct: 0, totalSemanas: 0 };
	}

	let sumAbs = 0;
	let sumPct = 0;
	let sumBias = 0;
	let countPct = 0;

	for (const semana of semanas) {
		sumAbs += semana.errorAbs;
		if (semana.cajasReales > 0) {
			sumPct += semana.errorPct;
			sumBias += ((semana.cajasEstimadas - semana.cajasReales) / semana.cajasReales) * 100;
			countPct += 1;
		}
	}

	return {
		mae: Number((sumAbs / semanas.length).toFixed(2)),
		mape: Number((countPct ? sumPct / countPct : 0).toFixed(2)),
		sesgoPct: Number((countPct ? sumBias / countPct : 0).toFixed(2)),
		totalSemanas: semanas.length,
	};
}

export function diagnosticarBacktesting(
	resumen: BacktestingResumenVM,
): DiagnosticoBacktestingVM {
	const mape = Number(resumen.mape || 0);
	const sesgoAbs = Math.abs(Number(resumen.sesgoPct || 0));
	const suficientesSemanas = Number(resumen.totalSemanas || 0) >= 4;

	if (mape <= 8) {
		return {
			estadoLabel: 'ESTABLE',
			estadoColor: 'success',
			recomiendaRecalibrar: false,
			mensaje: 'Desempeno consistente. Mantener ratio actual.',
		};
	}

	if (mape <= 15) {
		const recalibrar = suficientesSemanas && sesgoAbs >= 8;
		return {
			estadoLabel: 'VIGILAR',
			estadoColor: 'warning',
			recomiendaRecalibrar: recalibrar,
			mensaje: recalibrar
				? 'Error moderado con sesgo persistente. Recomendada recalibracion.'
				: 'Error moderado. Monitorear 2-3 semanas adicionales.',
		};
	}

	return {
		estadoLabel: 'CRITICO',
		estadoColor: 'error',
		recomiendaRecalibrar: true,
		mensaje: 'Error alto en prediccion. Recalibrar ratio de inmediato.',
	};
}
