import { env } from './env.js';
import { haversineKm, estimateMinutes } from './fare.js';

export interface NavStep {
  lat: number; lng: number; instruction: string;
  type: string; modifier: string; distance: number; name: string;
}
export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng] para Leaflet
  source: 'osrm' | 'google' | 'straight';
  steps?: NavStep[];
}

// ---- Caché de rutas (reduce llamadas repetidas; clave por coords redondeadas) ----
const cache = new Map<string, { at: number; data: RouteResult }>();
const TTL = 1000 * 60 * 10;
const rk = (a: number) => a.toFixed(4);

// =====================================================================
// Instrucciones (español)
// =====================================================================
const DIR: Record<string, string> = {
  left: 'a la izquierda', right: 'a la derecha',
  'slight left': 'ligeramente a la izquierda', 'slight right': 'ligeramente a la derecha',
  'sharp left': 'cerrado a la izquierda', 'sharp right': 'cerrado a la derecha',
  straight: 'recto', uturn: 'en U',
};
function osrmInstruction(m: any, name: string): string {
  const dir = DIR[m?.modifier] ?? '';
  const via = name ? ` por ${name}` : '';
  switch (m?.type) {
    case 'depart': return `Comienza${via}`;
    case 'arrive': return 'Llegaste a tu destino';
    case 'turn': return `Gira ${dir}${via}`;
    case 'continue': return `Continúa ${dir || 'recto'}${via}`;
    case 'merge': return `Incorpórate${via}`;
    case 'on ramp': return `Toma la salida${via}`;
    case 'off ramp': return `Sal${via}`;
    case 'fork': return `Mantente ${dir || 'recto'}${via}`;
    case 'end of road': return `Al final de la calle gira ${dir}${via}`;
    case 'roundabout': case 'rotary': return `Entra a la rotonda${via}`;
    case 'new name': return `Sigue${via}`;
    default: return `Continúa ${dir || 'recto'}${via}`;
  }
}

// =====================================================================
// OSRM (OpenStreetMap)
// =====================================================================
async function tryOsrm(oLat: number, oLng: number, dLat: number, dLng: number, withSteps: boolean, straightKm: number): Promise<RouteResult | null> {
  const url =
    `${env.OSRM_URL}/route/v1/driving/${oLng},${oLat};${dLng},${dLat}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=${withSteps}` +
    `&radiuses=${env.OSRM_SNAP_RADIUS_M};${env.OSRM_SNAP_RADIUS_M}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), env.OSRM_TIMEOUT_MS);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data: any = await res.json();
      if (data?.code !== 'Ok') throw new Error(`OSRM ${data?.code}`);
      const route = data?.routes?.[0];
      if (!route) throw new Error('sin rutas');
      const distanceKm = +(route.distance / 1000).toFixed(2);
      if (distanceKm < 0.05 && straightKm > 0.2) throw new Error('degenerada');
      const geometry: [number, number][] = (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]);
      const result: RouteResult = { distanceKm, durationMin: Math.max(1, Math.round(route.duration / 60)), geometry, source: 'osrm' };
      if (withSteps) {
        const steps: NavStep[] = [];
        for (const leg of route.legs ?? []) for (const s of leg.steps ?? []) {
          const [lng, lat] = s.maneuver.location as [number, number];
          steps.push({ lat, lng, instruction: osrmInstruction(s.maneuver, s.name), type: s.maneuver.type ?? '', modifier: s.maneuver.modifier ?? '', distance: Math.round(s.distance ?? 0), name: s.name ?? '' });
        }
        result.steps = steps;
      }
      return result;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

// =====================================================================
// Google Directions (datos propios de Google)
// =====================================================================
export function decodePolyline(str: string): [number, number][] {
  let index = 0, lat = 0, lng = 0; const coords: [number, number][] = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}
export function googleManeuver(m: string): { type: string; modifier: string } {
  if (!m) return { type: 'turn', modifier: 'straight' };
  if (m.includes('roundabout') || m.includes('rotary')) return { type: 'roundabout', modifier: '' };
  let modifier = 'straight';
  if (m.includes('uturn')) modifier = 'uturn';
  else if (m.includes('slight-left')) modifier = 'slight left';
  else if (m.includes('slight-right')) modifier = 'slight right';
  else if (m.includes('sharp-left')) modifier = 'sharp left';
  else if (m.includes('sharp-right')) modifier = 'sharp right';
  else if (m.includes('left')) modifier = 'left';
  else if (m.includes('right')) modifier = 'right';
  return { type: 'turn', modifier };
}
const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function tryGoogle(oLat: number, oLng: number, dLat: number, dLng: number, withSteps: boolean): Promise<RouteResult | null> {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  // departure_time=now -> ruteo según tráfico en vivo (evita congestión, p. ej. el centro
  // en hora punta y prefiere La Pólvora). alternatives=true -> Google devuelve varias y
  // elegimos la más rápida considerando el tráfico actual.
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLng}&destination=${dLat},${dLng}` +
    `&mode=driving&departure_time=now&alternatives=true&traffic_model=best_guess&language=es&region=cl&key=${env.GOOGLE_MAPS_API_KEY}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), env.OSRM_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`google ${res.status}`);
    const data: any = await res.json();
    if (data?.status !== 'OK') throw new Error(`google ${data?.status}`);
    // Duración con tráfico (cae a la nominal si Google no la trae)
    const trafficSecs = (r: any) => (r.legs ?? []).reduce((s: number, l: any) => s + (l.duration_in_traffic?.value ?? l.duration.value), 0);
    const route = (data.routes as any[]).reduce((best, r) => (trafficSecs(r) < trafficSecs(best) ? r : best), data.routes[0]);
    let dist = 0, dur = 0;
    for (const leg of route.legs) { dist += leg.distance.value; dur += (leg.duration_in_traffic?.value ?? leg.duration.value); }
    const geometry = decodePolyline(route.overview_polyline.points);
    const result: RouteResult = { distanceKm: +(dist / 1000).toFixed(2), durationMin: Math.max(1, Math.round(dur / 60)), geometry, source: 'google' };
    if (withSteps) {
      const steps: NavStep[] = [];
      for (const leg of route.legs) for (const s of leg.steps) {
        const mv = googleManeuver(s.maneuver || '');
        steps.push({ lat: s.start_location.lat, lng: s.start_location.lng, instruction: stripHtml(s.html_instructions), type: mv.type, modifier: mv.modifier, distance: Math.round(s.distance?.value ?? 0), name: '' });
      }
      const last = route.legs[route.legs.length - 1].end_location;
      steps.push({ lat: last.lat, lng: last.lng, instruction: 'Llegaste a tu destino', type: 'arrive', modifier: '', distance: 0, name: '' });
      result.steps = steps;
    }
    return result;
  } catch { return null; }
}

// =====================================================================
// Orquestador: proveedor elegido -> respaldo -> línea recta
// =====================================================================
export async function getRoute(oLat: number, oLng: number, dLat: number, dLng: number, withSteps = false): Promise<RouteResult> {
  const key = `${env.ROUTING_PROVIDER}:${rk(oLat)},${rk(oLng)},${rk(dLat)},${rk(dLng)}:${withSteps ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const straightKm = haversineKm(oLat, oLng, dLat, dLng);
  let result: RouteResult | null = null;

  if (env.ROUTING_PROVIDER === 'google') {
    result = await tryGoogle(oLat, oLng, dLat, dLng, withSteps);
    if (!result) result = await tryOsrm(oLat, oLng, dLat, dLng, withSteps, straightKm); // respaldo
  } else {
    result = await tryOsrm(oLat, oLng, dLat, dLng, withSteps, straightKm);
  }

  if (!result) {
    result = {
      distanceKm: +straightKm.toFixed(2),
      durationMin: estimateMinutes(straightKm),
      geometry: [[oLat, oLng], [dLat, dLng]],
      source: 'straight',
    };
  }

  cache.set(key, { at: Date.now(), data: result });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return result;
}
