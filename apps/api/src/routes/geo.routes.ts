import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'ControlFlota/1.0 (fleet demo)', 'Accept-Language': 'es' };

// Caché simple en memoria (evita golpear Nominatim de más)
const cache = new Map<string, { at: number; data: any }>();
const TTL = 1000 * 60 * 30;
function cached(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  return null;
}
function put(key: string, data: any) {
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
}

async function nominatim(path: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${NOMINATIM}${path}`, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function shortLabel(display: string): string {
  return display.split(',').slice(0, 3).join(',').trim();
}

export async function geoRoutes(app: FastifyInstance) {
  // ---- Búsqueda de direcciones (autocompletar) ----
  app.get('/search', { preHandler: authGuard() }, async (req, reply) => {
    const q = String((req.query as any)?.q ?? '').trim();
    if (q.length < 3) return { ok: true, results: [] };

    // Sesga a la vista actual del mapa si viene (mejores resultados locales)
    const vb = (req.query as any)?.viewbox as string | undefined;
    const key = `s:${q}:${vb ?? ''}`;
    const hit = cached(key);
    if (hit) return { ok: true, results: hit };

    let path = `/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=cl&accept-language=es&q=${encodeURIComponent(q)}`;
    if (vb) path += `&viewbox=${encodeURIComponent(vb)}&bounded=0`;

    try {
      const data = await nominatim(path);
      const results = (Array.isArray(data) ? data : []).map((r: any) => ({
        label: shortLabel(r.display_name),
        full: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
      put(key, results);
      return { ok: true, results };
    } catch {
      return reply.send({ ok: true, results: [] });
    }
  });

  // ---- Geocodificación inversa (coordenada -> dirección) ----
  app.get('/reverse', { preHandler: authGuard() }, async (req) => {
    const lat = Number((req.query as any)?.lat);
    const lng = Number((req.query as any)?.lng);
    if (!lat || !lng) return { ok: true, label: '' };

    const key = `r:${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const hit = cached(key);
    if (hit) return { ok: true, label: hit };

    try {
      const d = await nominatim(`/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${lat}&lon=${lng}`);
      const label = d?.display_name ? shortLabel(d.display_name) : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      put(key, label);
      return { ok: true, label };
    } catch {
      return { ok: true, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
  });
}
