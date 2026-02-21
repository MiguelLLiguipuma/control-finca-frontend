import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export interface IsoWeekInfo {
	semana: number;
	anio: number;
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
