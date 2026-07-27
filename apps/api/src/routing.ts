import { env } from './env.js';
import { haversineKm, estimateMinutes } from './fare.js';

export interface NavStep {
  lat: number;
  lng: number;
  instruction: string;   // texto en español
  type: string;          // tipo de maniobra OSRM
  modifier: string;      // dirección (left/right/…)
  distance: number;      // metros del tramo
  name: string;          // nombre de la vía
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng] para Leaflet
  source: 'osrm' | 'straight';
  steps?: NavStep[];
}

const DIR: Record<string, string> = {
  left: 'a la izquierda', right: 'a la derecha',
  'slight left': 'ligeramente a la izquierda', 'slight right': 'ligeramente a la derecha',
  'sharp left': 'cerrado a la izquierda', 'sharp right': 'cerrado a la derecha',
  straight: 'recto', uturn: 'en U',
};

/** Convierte una maniobra de OSRM en una instrucción en español. */
function instruction(m: any, name: string): string {
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
    case 'roundabout':
    case 'rotary': return `Entra a la rotonda${via}`;
    case 'new name': return `Sigue${via}`;
    default: return `Continúa ${dir || 'recto'}${via}`;
  }
}

/**
 * Calcula la ruta más corta por calle usando OSRM (Multi-Level Dijkstra).
 * Con `withSteps` incluye las maniobras giro a giro. Si el servicio no
 * responde, degrada a línea recta con distancia Haversine.
 */
export async function getRoute(
  oLat: number, oLng: number, dLat: number, dLng: number, withSteps = false
): Promise<RouteResult> {
  const straightKm = haversineKm(oLat, oLng, dLat, dLng);

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
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

      const data: any = await res.json();
      if (data?.code !== 'Ok') throw new Error(`OSRM code ${data?.code}`);
      const route = data?.routes?.[0];
      if (!route) throw new Error('OSRM sin rutas');

      const distanceKm = +(route.distance / 1000).toFixed(2);
      if (distanceKm < 0.05 && straightKm > 0.2) throw new Error('OSRM ruta degenerada');

      const coords: [number, number][] = (route.geometry.coordinates as [number, number][])
        .map(([lng, lat]) => [lat, lng]);

      const result: RouteResult = {
        distanceKm,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        geometry: coords,
        source: 'osrm',
      };

      if (withSteps) {
        const steps: NavStep[] = [];
        for (const leg of route.legs ?? []) {
          for (const s of leg.steps ?? []) {
            const [lng, lat] = s.maneuver.location as [number, number];
            steps.push({
              lat, lng,
              instruction: instruction(s.maneuver, s.name),
              type: s.maneuver.type ?? '',
              modifier: s.maneuver.modifier ?? '',
              distance: Math.round(s.distance ?? 0),
              name: s.name ?? '',
            });
          }
        }
        result.steps = steps;
      }

      return result;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }

  const km = +straightKm.toFixed(2);
  return {
    distanceKm: km,
    durationMin: estimateMinutes(km),
    geometry: [[oLat, oLng], [dLat, dLng]],
    source: 'straight',
  };
}
