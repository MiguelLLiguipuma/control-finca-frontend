import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export interface IsoWeekInfo {
	semana: number;
	anio: number;
}

export const MIN_CUTTABLE_CINTA_AGE_WEEKS = 11;
export const MAX_VISIBLE_CINTA_AGE_WEEKS = 16;

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

export function toLocalIsoDate(fecha: Date = new Date()): string {
	return [
		fecha.getFullYear(),
		pad2(fecha.getMonth() + 1),
		pad2(fecha.getDate()),
	].join('-');
}

export function parseLocalIsoDate(value: string | null | undefined): Date | null {
	const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDateOnly(value: unknown, fallback = toLocalIsoDate()): string {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return toLocalIsoDate(value);
	}
	if (typeof value === 'string') {
		const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
		return match ? match[1] : fallback;
	}
	return fallback;
}

export function getCurrentIsoWeekInfo(fecha: Date | string | number = new Date()): IsoWeekInfo {
	const d = dayjs(fecha);
	return {
		semana: d.isoWeek(),
		anio: d.isoWeekYear(),
	};
}

export function isoWeeksInYear(anioIso: number): number {
	return dayjs(`${anioIso}-12-28`).isoWeek();
}

export function isoWeekStartDate(anioIso: number, semanaIso: number) {
	const anio = Math.trunc(Number(anioIso));
	const semanaMax = isoWeeksInYear(anio);
	const semana = Math.max(1, Math.min(Math.trunc(Number(semanaIso)), semanaMax));
	return dayjs(`${anio}-01-04`).startOf('isoWeek').add(semana - 1, 'week');
}

export function calculateIsoWeekAge(
	semanaEnfunde: number,
	anioEnfunde: number,
	fechaActual: Date | string | number = new Date(),
): number {
	const inicioEnfunde = isoWeekStartDate(anioEnfunde, semanaEnfunde);
	const inicioActual = dayjs(fechaActual).startOf('isoWeek');
	return Math.max(0, inicioActual.diff(inicioEnfunde, 'week'));
}

export function isIsoWeekAgeVisible(
	semanaEnfunde: number,
	anioEnfunde: number,
	fechaActual: Date | string | number = new Date(),
	maxExclusive = MAX_VISIBLE_CINTA_AGE_WEEKS,
): boolean {
	const semana = Number(semanaEnfunde);
	const anio = Number(anioEnfunde);
	const fecha = dayjs(fechaActual);

	if (
		!Number.isFinite(semana) ||
		!Number.isFinite(anio) ||
		!Number.isFinite(maxExclusive) ||
		!fecha.isValid()
	) {
		return false;
	}

	return calculateIsoWeekAge(semana, anio, fecha.toDate()) < maxExclusive;
}
