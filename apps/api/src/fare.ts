import { env } from './env.js';

/** Distancia Haversine en kilómetros. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estima la tarifa (CLP) a partir de distancia (km) y duración (min). */
export function estimateFare(distanceKm: number, minutes = 0): number {
  const raw =
    env.FARE_BASE + distanceKm * env.FARE_PER_KM + minutes * env.FARE_PER_MIN;
  return Math.max(env.FARE_MINIMUM, Math.round(raw / 50) * 50);
}

/** Minutos estimados asumiendo ~30 km/h en ciudad. */
export function estimateMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 30) * 60);
}
