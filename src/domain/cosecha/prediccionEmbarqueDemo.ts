export interface EmbarqueHistoricoDemo {
	semana: number;
	anio: number;
	racimosTotales: number;
}

export interface PesosModelo {
	base: number;
	estacional: number;
	tendencia: number;
}

export interface ResultadoModeloDemo {
	baseHistorica: number;
	estacionalSemana: number;
	tendenciaReciente: number;
	rechazoRecientePct: number;
	pesos: PesosModelo;
	estimadoBruto: number;
	estimadoNeto: number;
	rangoMin: number;
	rangoMax: number;
	maeRef: number;
}

function round(n: number, d = 2): number {
	const p = 10 ** d;
	return Math.round(n * p) / p;
}

function promedio(values: number[]): number {
	if (!values.length) return 0;
	return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function desviacion(values: number[]): number {
	if (values.length < 2) return 0;
	const avg = promedio(values);
	const variance =
		values.reduce((acc, n) => acc + (n - avg) * (n - avg), 0) /
		(values.length - 1);
	return Math.sqrt(Math.max(0, variance));
}

function cv(values: number[]): number {
	const avg = promedio(values);
	if (avg <= 0) return 1;
	return desviacion(values) / avg;
}

function trimmedMean(values: number[]): number {
	if (values.length < 5) return promedio(values);
	const sorted = [...values].sort((a, b) => a - b);
	const k = Math.floor(sorted.length * 0.1);
	return promedio(sorted.slice(k, sorted.length - k));
}

function semanaDistanciaCircular(a: number, b: number): number {
	const diff = Math.abs(a - b);
	return Math.min(diff, 53 - diff);
}

function scoreEstacional(series: EmbarqueHistoricoDemo[], semanaObjetivo: number) {
	const subset = series.filter((x) => semanaDistanciaCircular(x.semana, semanaObjetivo) <= 1);
	const vals = subset.map((x) => x.racimosTotales);
	const n = vals.length;
	const v = cv(vals);
	let nivel: 'alto' | 'medio' | 'bajo' = 'bajo';
	if (n >= 8 && v <= 0.2) nivel = 'alto';
	else if (n >= 5 && v <= 0.35) nivel = 'medio';
	return {
		nivel,
		valor: subset.length ? promedio(vals) : promedio(series.map((x) => x.racimosTotales)),
	};
}

function scoreReciente(series: EmbarqueHistoricoDemo[]) {
	const recent = [...series].sort((a, b) => a.anio * 100 + a.semana - (b.anio * 100 + b.semana)).slice(-8);
	const vals = recent.map((x) => x.racimosTotales);
	const n = vals.length;
	const v = cv(vals);
	let nivel: 'alto' | 'medio' | 'bajo' = 'bajo';
	if (n >= 6 && v <= 0.25) nivel = 'alto';
	else if (n >= 4) nivel = 'medio';

	let numerador = 0;
	let denominador = 0;
	for (let i = 0; i < vals.length; i += 1) {
		const w = i + 1;
		numerador += vals[i] * w;
		denominador += w;
	}
	return {
		nivel,
		valor: denominador > 0 ? numerador / denominador : promedio(vals),
	};
}

export function calcularModeloDemo(
	series: EmbarqueHistoricoDemo[],
	semanaObjetivo: number,
	rechazoRecientePct = 8.5,
): ResultadoModeloDemo {
	const baseHistorica = trimmedMean(series.map((x) => x.racimosTotales));
	const est = scoreEstacional(series, semanaObjetivo);
	const rec = scoreReciente(series);

	const wEst = est.nivel === 'alto' ? 0.5 : est.nivel === 'medio' ? 0.4 : 0.25;
	const wRec = rec.nivel === 'alto' ? 0.3 : rec.nivel === 'medio' ? 0.25 : 0.15;
	const wBase = Math.max(0.1, 1 - wEst - wRec);
	const sum = wBase + wEst + wRec;
	const pesos = {
		base: wBase / sum,
		estacional: wEst / sum,
		tendencia: wRec / sum,
	};

	const estimadoBruto =
		baseHistorica * pesos.base +
		est.valor * pesos.estacional +
		rec.valor * pesos.tendencia;
	const estimadoNeto = estimadoBruto * (1 - rechazoRecientePct / 100);
	const maeRef = desviacion(series.map((x) => x.racimosTotales)) * 0.45;

	return {
		baseHistorica: round(baseHistorica),
		estacionalSemana: round(est.valor),
		tendenciaReciente: round(rec.valor),
		rechazoRecientePct: round(rechazoRecientePct, 2),
		pesos: {
			base: round(pesos.base, 3),
			estacional: round(pesos.estacional, 3),
			tendencia: round(pesos.tendencia, 3),
		},
		estimadoBruto: round(estimadoBruto),
		estimadoNeto: round(estimadoNeto),
		rangoMin: round(Math.max(0, estimadoNeto - maeRef)),
		rangoMax: round(estimadoNeto + maeRef),
		maeRef: round(maeRef),
	};
}

export const HISTORICO_EMBARQUE_DEMO: EmbarqueHistoricoDemo[] = [
	{ semana: 50, anio: 2025, racimosTotales: 980 },
	{ semana: 51, anio: 2025, racimosTotales: 1020 },
	{ semana: 52, anio: 2025, racimosTotales: 995 },
	{ semana: 1, anio: 2026, racimosTotales: 1015 },
	{ semana: 2, anio: 2026, racimosTotales: 1040 },
	{ semana: 3, anio: 2026, racimosTotales: 1075 },
	{ semana: 4, anio: 2026, racimosTotales: 1080 },
	{ semana: 5, anio: 2026, racimosTotales: 972 },
	{ semana: 6, anio: 2026, racimosTotales: 972 },
	{ semana: 7, anio: 2026, racimosTotales: 864 },
	{ semana: 8, anio: 2026, racimosTotales: 972 },
	{ semana: 9, anio: 2026, racimosTotales: 1080 },
];
