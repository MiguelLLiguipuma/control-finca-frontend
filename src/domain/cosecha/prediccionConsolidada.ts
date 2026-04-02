import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type {
	PrediccionCosechaResponse,
	PrediccionProximoEmbarque,
} from '@/services/cosecha/cosechaService';
import { construirPrediccionVM, type PrediccionFilaVM } from '@/domain/cosecha/prediccionCosecha';

dayjs.extend(isoWeek);

export interface PrediccionFincaDetalle {
	fincaId: number;
	fincaNombre: string;
	empresaNombre: string;
	semanaObjetivo: number;
	anioObjetivo: number;
	racimosEstimados: number;
	rangoMinimo: number;
	rangoMaximo: number;
	racimosIdeal: number;
	racimosRiesgo: number;
	rechazoEstimadoPct: number;
	confianza: string;
	tendencia: string;
	metaUc: number;
	promedioUcDiario: number;
	ratioAplicado: number | null;
	topCintas: PrediccionFilaVM[];
}

export interface PrediccionConsolidadaTotal {
	totalFincas: number;
	totalRacimosEstimados: number;
	totalRangoMinimo: number;
	totalRangoMaximo: number;
	totalIdeal: number;
	totalRiesgo: number;
	rechazoPonderadoPct: number;
	confianzaGlobal: 'ALTA' | 'MEDIA' | 'BAJA';
}

function normalizarNumero(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function confianzaGlobalDesde(detalles: PrediccionFincaDetalle[]): 'ALTA' | 'MEDIA' | 'BAJA' {
	if (!detalles.length) return 'BAJA';
	const niveles = detalles.map((d) => String(d.confianza || '').toUpperCase());
	if (niveles.some((n) => n === 'BAJA')) return 'BAJA';
	if (niveles.some((n) => n === 'MEDIA')) return 'MEDIA';
	return 'ALTA';
}

function construirFallbackEmbarque(
	data: PrediccionCosechaResponse,
): PrediccionProximoEmbarque {
	const vm = construirPrediccionVM(data);
	const total = vm.filas.reduce((acc, item) => acc + normalizarNumero(item.saldo_en_campo), 0);
	const now = dayjs();
	return {
		anio_objetivo: now.isoWeekYear(),
		semana_objetivo: now.isoWeek(),
		racimos_estimados: Math.round(total),
		rango_minimo: Math.round(total * 0.9),
		rango_maximo: Math.round(total * 1.1),
		racimos_rango_ideal: Math.round(total * 0.65),
		racimos_en_riesgo: Math.max(0, Math.round(total * 0.35)),
		rechazo_estimado_pct: 0,
		edad_promedio_corte: 0,
		tendencia: 'ESTABLE',
		confianza: 'MEDIA',
		sigma: 0,
		factor_estacional: 1,
		metodo: 'fallback_ui_multi',
	};
}

export function construirDetalleFinca(
	input: {
		fincaId: number;
		fincaNombre: string;
		empresaNombre: string;
		data: PrediccionCosechaResponse;
	},
): PrediccionFincaDetalle {
	const vm = construirPrediccionVM(input.data);
	const embarque = vm.proximoEmbarque || construirFallbackEmbarque(input.data);

	return {
		fincaId: input.fincaId,
		fincaNombre: input.fincaNombre,
		empresaNombre: input.empresaNombre,
		semanaObjetivo: normalizarNumero(embarque.semana_objetivo),
		anioObjetivo: normalizarNumero(embarque.anio_objetivo),
		racimosEstimados: normalizarNumero(embarque.racimos_estimados),
		rangoMinimo: normalizarNumero(embarque.rango_minimo),
		rangoMaximo: normalizarNumero(embarque.rango_maximo),
		racimosIdeal: normalizarNumero(embarque.racimos_rango_ideal),
		racimosRiesgo: normalizarNumero(embarque.racimos_en_riesgo),
		rechazoEstimadoPct: normalizarNumero(embarque.rechazo_estimado_pct),
		confianza: String(embarque.confianza || 'MEDIA').toUpperCase(),
		tendencia: String(embarque.tendencia || 'ESTABLE').toUpperCase(),
		metaUc: normalizarNumero(vm.metaAplicada),
		promedioUcDiario: normalizarNumero(vm.promedioUC),
		ratioAplicado: vm.ratioAplicado,
		topCintas: vm.filas.slice(0, 8),
	};
}

export function construirConsolidado(
	detalles: PrediccionFincaDetalle[],
): PrediccionConsolidadaTotal {
	const totalRacimosEstimados = detalles.reduce(
		(acc, item) => acc + normalizarNumero(item.racimosEstimados),
		0,
	);
	const rechazoPonderadoPct = totalRacimosEstimados
		? detalles.reduce(
				(acc, item) =>
					acc +
					(normalizarNumero(item.racimosEstimados) *
						normalizarNumero(item.rechazoEstimadoPct)),
				0,
		  ) / totalRacimosEstimados
		: 0;

	return {
		totalFincas: detalles.length,
		totalRacimosEstimados,
		totalRangoMinimo: detalles.reduce((acc, item) => acc + normalizarNumero(item.rangoMinimo), 0),
		totalRangoMaximo: detalles.reduce((acc, item) => acc + normalizarNumero(item.rangoMaximo), 0),
		totalIdeal: detalles.reduce((acc, item) => acc + normalizarNumero(item.racimosIdeal), 0),
		totalRiesgo: detalles.reduce((acc, item) => acc + normalizarNumero(item.racimosRiesgo), 0),
		rechazoPonderadoPct: Number(rechazoPonderadoPct.toFixed(2)),
		confianzaGlobal: confianzaGlobalDesde(detalles),
	};
}
