import { env } from './env.js';
import { haversineKm, estimateMinutes } from './fare.js';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng] para Leaflet
  source: 'osrm' | 'straight';
}

/**
 * Calcula la ruta más corta por calle usando OSRM.
 * OSRM implementa el camino mínimo sobre el grafo vial real (contraction
 * hierarchies, una optimización de Dijkstra). Si el servicio no responde,
 * degrada a una línea recta con distancia Haversine.
 */
export async function getRoute(
  oLat: number, oLng: number, dLat: number, dLng: number
): Promise<RouteResult> {
  // Distancia en línea recta: sirve de referencia para validar el resultado.
  const straightKm = haversineKm(oLat, oLng, dLat, dLng);

  // radiuses limita cuánto puede "encajar" OSRM cada punto a la red vial. Así,
  // coordenadas fuera del área cargada (p.ej. otra ciudad) devuelven error en
  // lugar de una ruta absurda encajada al borde del mapa.
  const url =
    `${env.OSRM_URL}/route/v1/driving/${oLng},${oLat};${dLng},${dLat}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=false` +
    `&radiuses=${env.OSRM_SNAP_RADIUS_M};${env.OSRM_SNAP_RADIUS_M}`;

  // Hasta 2 intentos antes de degradar (el OSRM público falla a veces)
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
      // Si la ruta es ~0 pero en recta hay distancia real, OSRM encajó mal: descartar.
      if (distanceKm < 0.05 && straightKm > 0.2) throw new Error('OSRM ruta degenerada');

      const coords: [number, number][] = (route.geometry.coordinates as [number, number][])
        .map(([lng, lat]) => [lat, lng]);

      return {
        distanceKm,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        geometry: coords,
        source: 'osrm',
      };
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Degradación: línea recta
  const km = +straightKm.toFixed(2);
  return {
    distanceKm: km,
    durationMin: estimateMinutes(km),
    geometry: [[oLat, oLng], [dLat, dLng]],
    source: 'straight',
  };
}
