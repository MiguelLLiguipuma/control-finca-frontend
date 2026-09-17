export interface MarcaRacimo {
  id: number;
  x: number;
  y: number;
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
