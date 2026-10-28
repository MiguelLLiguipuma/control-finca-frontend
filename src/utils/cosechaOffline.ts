import type { BackendCinta, PayloadCosecha } from '@/services/cosecha/cosechaService';
import type { Finca } from '@/stores/fincaStore';
import { propietarioCosecha } from './cosechaLocal';

interface InventarioLocal {
  version: 1;
  fincaId: number;
  consultadoEn: number;
  cintas: BackendCinta[];
  confirmados: string[];
}

const key = (owner: string, suffix: string) => `cosecha_offline_v1:${owner}:${suffix}`;
const mismaSesion = (owner: string) => owner === propietarioCosecha();
export const permiteCopiaLocal = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status == null || status === 408 || status === 429 || status >= 500;
};

export function guardarFincasLocales(owner: string, fincas: Finca[]) {
  if (!mismaSesion(owner)) return;
  localStorage.setItem(key(owner, 'fincas'), JSON.stringify(fincas));
}

export function leerFincasLocales(owner: string): Finca[] {
  if (!mismaSesion(owner)) return [];
  try {
    const data = JSON.parse(localStorage.getItem(key(owner, 'fincas')) || '[]');
    return Array.isArray(data) && data.every(f => Number.isSafeInteger(f.id) && f.id > 0 && typeof f.nombre === 'string') ? data : [];
  } catch { return []; }
}

export function leerInventarioLocal(owner: string, fincaId: number): InventarioLocal | null {
  if (!mismaSesion(owner)) return null;
  try {
    const data = JSON.parse(localStorage.getItem(key(owner, `inventario:${fincaId}`)) || 'null');
    if (data?.version !== 1 || data.fincaId !== fincaId || !Number.isFinite(data.consultadoEn) ||
      !Array.isArray(data.confirmados) || !Array.isArray(data.cintas) ||
      !data.cintas.every((c: BackendCinta) => Number.isSafeInteger(c.calendario_id) && c.calendario_id > 0 &&
        Number.isFinite(Number(c.saldo_en_campo)) && Number(c.saldo_en_campo) >= 0 &&
        Number.isInteger(Number(c.semana_enfunde)) && Number.isInteger(Number(c.anio)) &&
        typeof c.color_cinta === 'string' && typeof c.color_hex === 'string')) return null;
    return data;
  } catch { return null; }
}

export function guardarInventarioLocal(owner: string, fincaId: number, cintas: BackendCinta[], consultadoEn: number) {
  if (!mismaSesion(owner)) return;
  const anterior = leerInventarioLocal(owner, fincaId);
  const data: InventarioLocal = { version: 1, fincaId, cintas, consultadoEn, confirmados: anterior?.confirmados || [] };
  localStorage.setItem(key(owner, `inventario:${fincaId}`), JSON.stringify(data));
}

// El saldo descargado es bruto: los pendientes se descuentan al leer, los confirmados una sola vez aquí.
export function descontarConfirmadoLocal(owner: string, payload: PayloadCosecha) {
  const data = leerInventarioLocal(owner, payload.finca_id);
  if (!data || data.confirmados.includes(payload.id_local)) return;
  for (const detalle of payload.detalles) {
    const cinta = data.cintas.find(c => c.calendario_id === detalle.calendario_id);
    if (cinta) cinta.saldo_en_campo = Math.max(0, Number(cinta.saldo_en_campo) - detalle.cantidad_racimos - detalle.cantidad_rechazo);
  }
  data.confirmados.push(payload.id_local);
  localStorage.setItem(key(owner, `inventario:${payload.finca_id}`), JSON.stringify(data));
}
