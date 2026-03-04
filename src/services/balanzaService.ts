import api from '@/services/api';

export interface BalanzaUltimaLectura {
  session_id: number | null;
  finca_id?: number | null;
  finca_nombre?: string | null;
  cajas: number;
  peso_neto_kg: number;
  peso_pico_kg?: number | null;
  estado: 'IDLE' | 'RUN' | string;
  timestamp: string;
}

export interface BalanzaSesionResumen {
  session_id: number;
  finca_id?: number | null;
  finca_nombre?: string | null;
  cajas: number;
  peso_pico_kg: number;
  iniciado_en?: string | null;
  finalizado_en?: string | null;
  timestamp?: string | null;
}

export interface BalanzaSesionesQuery {
  finca_id?: number;
  limit?: number;
}

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const balanzaService = {
  async getUltimaLectura(params: { finca_id?: number } = {}): Promise<BalanzaUltimaLectura | null> {
    const { data } = await api.get('/balanza/ultima-lectura', { params });
    if (!data) return null;

    return {
      session_id: (data as any).session_id ?? null,
      finca_id: (data as any).finca_id ?? null,
      finca_nombre: (data as any).finca_nombre ?? null,
      cajas: normalizeNumber((data as any).cajas),
      peso_neto_kg: normalizeNumber((data as any).peso_neto_kg),
      peso_pico_kg: (data as any).peso_pico_kg ?? null,
      estado: String((data as any).estado || 'IDLE'),
      timestamp: String((data as any).timestamp || new Date().toISOString()),
    };
  },

  async getSesiones(params: BalanzaSesionesQuery = {}): Promise<BalanzaSesionResumen[]> {
    const { data } = await api.get('/balanza/sesiones', { params: { limit: 20, ...params } });

    const list = Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray(data)
      ? data
      : [];

    return list.map((row: any) => ({
      session_id: normalizeNumber(row.session_id),
      finca_id: row.finca_id ?? null,
      finca_nombre: row.finca_nombre ?? null,
      cajas: normalizeNumber(row.cajas),
      peso_pico_kg: normalizeNumber(row.peso_pico_kg),
      iniciado_en: row.iniciado_en ?? null,
      finalizado_en: row.finalizado_en ?? null,
      timestamp: row.timestamp ?? null,
    }));
  },
};
