import { computed, ref } from 'vue';
import {
	cosechaService,
	type FechaOcupadaItem,
} from '@/services/cosecha/cosechaService';

export interface FechaOcupadaState {
	cosecha: boolean;
	voucher: boolean;
}

const MS_PER_MINUTE = 60 * 1000;

function toIsoDate(value: Date): string {
	return new Date(value.getTime() - value.getTimezoneOffset() * MS_PER_MINUTE)
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

function mapFechasOcupadas(items: FechaOcupadaItem[] | undefined): Record<string, FechaOcupadaState> {
	const map: Record<string, FechaOcupadaState> = {};
	for (const item of items || []) {
		if (!item?.fecha) continue;
		map[item.fecha] = {
			cosecha: Boolean(item.cosecha),
			voucher: Boolean(item.voucher),
		};
	}
	return map;
}

export function useFechasOcupadas() {
	const fechasOcupadas = ref<Record<string, FechaOcupadaState>>({});
	const hasFechasOcupadas = computed(
		() => Object.keys(fechasOcupadas.value).length > 0,
	);

	async function cargarFechasOcupadas(params: {
		fincaId: number;
		fechaDesde: Date;
		fechaHasta: Date;
	}) {
		const { fincaId, fechaDesde, fechaHasta } = params;
		if (!fincaId) {
			fechasOcupadas.value = {};
			return;
		}

		try {
			const data = await cosechaService.getFechasOcupadas({
				finca_id: fincaId,
				fecha_desde: toIsoDate(fechaDesde),
				fecha_hasta: toIsoDate(fechaHasta),
			});
			fechasOcupadas.value = mapFechasOcupadas(data.fechas);
		} catch {
			// La vista no debe bloquear la operación si falla el marcado del calendario.
			fechasOcupadas.value = {};
		}
	}

	function limpiarFechasOcupadas() {
		fechasOcupadas.value = {};
	}

	function obtenerEstadoFecha(isoDate: string): FechaOcupadaState | null {
		return fechasOcupadas.value[isoDate] || null;
	}

	return {
		fechasOcupadas,
		hasFechasOcupadas,
		cargarFechasOcupadas,
		limpiarFechasOcupadas,
		obtenerEstadoFecha,
		toIsoDate,
		toIsoDateUnknown,
	};
}
