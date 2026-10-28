export function propietarioCosecha(): string | null {
  try {
    if (!localStorage.getItem('token')) return null;
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const id = Number(user?.id ?? user?.id_usuario);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const empresa = Number(user?.empresa_id) || 0;
    return `${empresa}:${id}`;
  } catch {
    return null;
  }
}

export function claveColaCosecha(propietario: string): string {
  return `cosecha_colas_v2:${propietario}`;
}

export const CLAVES_COLA_ANTIGUA = ['cola_cosecha_pendiente', 'cola_cosecha_fallida'] as const;
