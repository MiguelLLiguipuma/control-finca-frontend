import { propietarioCosecha, claveColaCosecha } from './cosechaLocal';

export interface LocalWorkSummary { pending: number; failed: number; drafts: number; unreadable: boolean }

function belongsToOwner(key: string, owner: string): boolean {
  return key === claveColaCosecha(owner) || key.startsWith(`borrador_cosecha_conteo:v2:${owner}:`);
}

export function readLocalWork(owner: string | null): LocalWorkSummary {
  const summary: LocalWorkSummary = { pending: 0, failed: 0, drafts: 0, unreadable: false };
  if (!owner || owner !== propietarioCosecha()) return summary;
  try {
    const raw = localStorage.getItem(claveColaCosecha(owner));
    if (raw) {
      const data = JSON.parse(raw);
      if (!Array.isArray(data?.pendientes) || !Array.isArray(data?.fallidos)) throw new Error('queue');
      summary.pending = data.pendientes.length;
      summary.failed = data.fallidos.length;
    }
  } catch { summary.unreadable = true; }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`borrador_cosecha_conteo:v2:${owner}:`) && !key.endsWith(':respaldo')) summary.drafts++;
    }
  } catch { summary.unreadable = true; }
  return summary;
}

export function exportLocalWork(owner: string | null) {
  if (!owner || owner !== propietarioCosecha()) throw new Error('La sesion cambio. No se puede exportar.');
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && belongsToOwner(key, owner)) entries[key] = localStorage.getItem(key) || '';
  }
  return { version: 1, exportedAt: new Date().toISOString(), owner, entries };
}
