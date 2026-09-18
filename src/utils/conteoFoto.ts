export interface MarcaRacimo {
  id: number;
  x: number;
  y: number;
}

export function leerMarcasDetectadas(payload: unknown): MarcaRacimo[] {
  const data = payload as { borrador?: boolean; marcas?: unknown } | null;
  if (data?.borrador !== true || !Array.isArray(data.marcas) || data.marcas.length > 200) {
    throw new Error('El servidor no devolvió un borrador válido. Puedes marcar manualmente.');
  }
  return data.marcas.map((item, index) => {
    if (!item || typeof item.x !== 'number' || typeof item.y !== 'number'
      || !Number.isFinite(item.x) || !Number.isFinite(item.y)
      || item.x < 0 || item.x > 1 || item.y < 0 || item.y > 1) {
      throw new Error('Las posiciones detectadas no son válidas. Puedes marcar manualmente.');
    }
    return { id: index + 1, x: item.x, y: item.y };
  });
}

export interface CintaFoto {
  calendario_id: number;
  color_cinta: string;
  color_hex: string;
  semana_enfunde: number;
  anio: number;
  disponible: number;
}

export interface RepartoFoto {
  calendario_id: number;
  cantidad: number;
}

export function validarRepartoFoto(total: number, reparto: RepartoFoto[], cintas: CintaFoto[]) {
  if (!Number.isSafeInteger(total) || total <= 0 || !reparto.length) return false;
  const ids = new Set<number>();
  let suma = 0;
  for (const fila of reparto) {
    const cinta = cintas.find((item) => item.calendario_id === fila.calendario_id);
    if (!cinta || !Number.isSafeInteger(cinta.disponible) || cinta.disponible < 0
      || ids.has(fila.calendario_id) || !Number.isSafeInteger(fila.cantidad)
      || fila.cantidad <= 0 || fila.cantidad > cinta.disponible) return false;
    ids.add(fila.calendario_id);
    suma += fila.cantidad;
  }
  return suma === total;
}
