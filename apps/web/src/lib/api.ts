// Vacío = mismo origen (la web sirve /api y /socket.io por proxy). Así funciona
// desde localhost, la IP de la red o un túnel HTTPS sin recompilar.
export const API_URL = (import.meta.env.VITE_API_URL as string) || '';

const TOKEN_KEY = 'flota_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try { data = await res.json(); } catch { throw new Error('Respuesta inválida del servidor'); }
  if (!res.ok || data?.ok === false) {
    if (res.status === 401) clearToken();
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data as T;
}

// ---- Utilidades de UI ----
export const money = (n: number) => '$' + Number(n || 0).toLocaleString('es-CL');
export const initials = (name?: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const STATUS_ES: Record<string, string> = {
  requested: 'Buscando conductor', accepted: 'Conductor en camino',
  arrived: 'Conductor llegó', in_progress: 'En viaje',
  completed: 'Completado', cancelled: 'Cancelado',
  available: 'Disponible', busy: 'Ocupado', offline: 'Desconectado',
  active: 'Activo', inactive: 'Inactivo', in_use: 'En uso', maintenance: 'Mantención',
};
export const es = (s: string) => STATUS_ES[s] || s;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Geocodificación inversa (Nominatim / OpenStreetMap). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const d = await r.json();
    return d.display_name ? d.display_name.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
