import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth.js';

// Photon (Komoot): geocodificador OSM pensado para autocompletar. Sin API key,
// más tolerante que Nominatim (mejor para muchos usuarios en un mismo servidor).
const PHOTON = 'https://photon.komoot.io';
const HEADERS = { 'User-Agent': 'ControlFlota/1.0 (fleet demo)' };

// Caché simple en memoria
const cache = new Map<string, { at: number; data: any }>();
const TTL = 1000 * 60 * 30;
function cached(key: string) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL ? hit.data : null;
}
function put(key: string, data: any) {
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 800) cache.delete(cache.keys().next().value as string);
}

async function photon(path: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${PHOTON}${path}`, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`photon ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Arma una etiqueta legible desde las propiedades de un feature de Photon. */
function label(pr: any): string {
  const main = pr.name
    ? (pr.housenumber ? `${pr.name} ${pr.housenumber}` : pr.name)
    : [pr.street, pr.housenumber].filter(Boolean).join(' ');
  const area = pr.district || pr.city || pr.locality || pr.county || '';
  const region = pr.state || pr.country || '';
  return [main, area, region].filter(Boolean).slice(0, 3).join(', ') || `${pr.city || ''}`;
}

function centerOfViewbox(vb?: string): { lat: number; lon: number } | null {
  if (!vb) return null;
  const [w, s, e, n] = vb.split(',').map(Number);
  if ([w, s, e, n].some((x) => Number.isNaN(x))) return null;
  return { lat: (s + n) / 2, lon: (w + e) / 2 };
}

export async function geoRoutes(app: FastifyInstance) {
  // ---- Búsqueda de direcciones (autocompletar) ----
  app.get('/search', { preHandler: authGuard() }, async (req) => {
    const q = String((req.query as any)?.q ?? '').trim();
    if (q.length < 3) return { ok: true, results: [] };

    const vb = (req.query as any)?.viewbox as string | undefined;
    const c = centerOfViewbox(vb);
    const key = `s:${q}:${c ? c.lat.toFixed(2) + ',' + c.lon.toFixed(2) : ''}`;
    const hit = cached(key);
    if (hit) return { ok: true, results: hit };

    let path = `/api/?q=${encodeURIComponent(q)}&limit=8&lang=default`;
    if (c) path += `&lat=${c.lat}&lon=${c.lon}`; // sesga a la vista del mapa

    try {
      const data = await photon(path);
      const seen = new Set<string>();
      const results = (data?.features ?? [])
        .map((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          return { label: label(f.properties), full: label(f.properties), lat, lng };
        })
        .filter((r: any) => {
          if (!r.label || seen.has(r.label)) return false;
          seen.add(r.label); return true;
        });
      put(key, results);
      return { ok: true, results };
    } catch {
      return { ok: true, results: [] };
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
      const data = await photon(`/reverse?lat=${lat}&lon=${lng}&lang=default`);
      const f = data?.features?.[0];
      const lbl = f ? label(f.properties) : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      put(key, lbl);
      return { ok: true, label: lbl };
    } catch {
      return { ok: true, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
  });
}
