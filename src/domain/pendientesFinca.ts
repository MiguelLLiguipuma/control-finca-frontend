import type { AlertaOperativa } from '@/services/alertaService';
import type { AppPermission } from '@/utils/rbac';

export const ESTADOS_ALERTAS_ABIERTAS = 'pendiente,enviada,leida';
export const LIMITE_ALERTAS_DASHBOARD = 200;
const urgencia = { critica: 0, alta: 1, media: 2, baja: 3 };
export const etiquetasSeveridad = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
type Permisos = (permission: AppPermission) => boolean;
export interface AccionPendiente {
  texto: string;
  to: { path: string; query?: Record<string, string> };
}
export interface PendienteFinca {
  alerta: AlertaOperativa;
  accion: AccionPendiente | null;
}

export function accionParaAlerta(alerta: AlertaOperativa, can: Permisos, administra: boolean): AccionPendiente | null {
  const finca = String(alerta.finca_id);
  if (!can('view.alertas')) return null;
  if (alerta.tipo === 'enfunde_faltante' && can('view.enfunde')) {
    return { texto: 'Revisar enfunde', to: { path: '/registro-enfunde', query: { finca_id: finca } } };
  }
  if (alerta.tipo === 'cinta_critica' && can('view.cosecha')) {
    return { texto: 'Revisar cosecha', to: { path: '/registro-cosecha', query: { finca_id: finca } } };
  }
  if (alerta.tipo === 'clima_desactualizado' && can('view.clima')) {
    return { texto: 'Consultar clima', to: { path: '/clima', query: { finca_id: finca } } };
  }
  const tab = alerta.tipo === 'inventario_historico_cintas' ? 'historico'
    : alerta.tipo === 'fumigacion_vencida' && administra ? 'configuracion' : 'alertas';
  return {
    texto: tab === 'historico' ? 'Revisar cintas' : tab === 'configuracion' ? 'Revisar fumigación' : 'Revisar alerta',
    to: { path: '/alertas', query: { finca_id: finca, tab, abiertas: '1', ...(tab === 'configuracion' ? { seccion: 'fumigacion' } : {}) } },
  };
}

export function priorizarPendientes(items: AlertaOperativa[], fincaId: number, can: Permisos, administra: boolean): PendienteFinca[] {
  if (!can('view.alertas')) return [];
  const ids = new Set<number>();
  return items.filter(item => {
    if (Number(item.finca_id) !== fincaId || !['pendiente', 'enviada', 'leida'].includes(item.estado)
      || !Object.hasOwn(urgencia, item.severidad) || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  }).sort((a, b) => urgencia[a.severidad] - urgencia[b.severidad]
    || (Date.parse(b.detectada_en) || 0) - (Date.parse(a.detectada_en) || 0) || b.id - a.id)
    .map(alerta => ({ alerta, accion: accionParaAlerta(alerta, can, administra) }));
}

export function fincaDesdeEnlace(value: unknown, fincas: ReadonlyArray<{ id: number }>): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && fincas.some(finca => Number(finca.id) === id) ? id : null;
}

export function pestanaDesdeEnlace(value: unknown, administra: boolean): string {
  if (value === 'historico' || value === 'alertas') return value;
  if (value === 'configuracion' && administra) return value;
  return 'alertas';
}

export function conservaBorradorEnfunde(form: {
  finca_id: number | null; cantidad_fundas: number | null; calidad: number | null; observaciones: string;
}, destino: number): boolean {
  return Number(form.finca_id) !== destino
    && (form.cantidad_fundas !== null || form.calidad !== null || Boolean(form.observaciones.trim()));
}
