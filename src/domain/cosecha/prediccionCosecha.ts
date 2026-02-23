import type {
	PrediccionCosechaItem,
	PrediccionCosechaResponse,
} from '@/services/cosecha/cosechaService';
import type { EmbarqueListItem } from '@/services/embarque/embarqueTypes';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

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

export function crearPrediccionVacia(): PrediccionCosechaVM {
	return {
		metaAplicada: '--',
		promedioUC: '--',
		ratioAplicado: null,
		filas: [],
		semanaInicio: undefined,
		semanaFin: undefined,
	};
}

export function construirPrediccionVM(
	data: PrediccionCosechaResponse | null | undefined,
): PrediccionCosechaVM {
	if (!data) return crearPrediccionVacia();

	return {
		metaAplicada: data.meta_aplicada || '--',
		promedioUC:
			data.promedio_uc_diario || data.promedio_climatico_semanal || '--',
		ratioAplicado:
			typeof data.ratio_aplicado === 'number' && Number.isFinite(data.ratio_aplicado)
				? data.ratio_aplicado
				: null,
		filas: ordenarFilasPorUrgencia(data.proyecciones || []),
		semanaInicio: data.semana_inicio,
		semanaFin: data.semana_fin,
	};
}

export function ordenarFilasPorUrgencia(
	filas: PrediccionCosechaItem[],
): PrediccionFilaVM[] {
	return [...filas]
		.sort((a, b) => a.dias_faltantes - b.dias_faltantes)
		.map((item) => ({
			...item,
			confianza: calcularConfianza(item),
			explicacion: construirExplicacion(item),
		}));
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
	const tendencia = String(item.tendencia_climatica || 'sin tendencia');
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
