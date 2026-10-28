export function readSessionToken(): string | null {
  try { return localStorage.getItem('token') || null; }
  catch { return null; }
}

export function isAuthenticationRequest(url = ''): boolean {
  try {
    return /\/(?:api\/)?auth\/(login|google|register)\/?$/.test(new URL(url, 'https://local.invalid').pathname);
  } catch { return false; }
}

export function shouldExpireSession(status: number, message: string, authenticated: boolean): boolean {
  if (!authenticated) return false;
  if (status === 401) return true;
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return status === 403 && /sesion (expirada|invalida)|ingrese nuevamente|token (de seguridad )?(no valido|invalido)/i.test(normalized);
}
