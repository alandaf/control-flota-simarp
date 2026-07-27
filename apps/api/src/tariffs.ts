import { query, one } from './db.js';
import { env } from './env.js';

export interface Tariff { base: number; per_km: number; per_min: number; minimum: number; }

// Caché en memoria de la configuración (settings). Se recarga al guardar.
let cache: Record<string, number> = {};

export async function loadSettings(): Promise<void> {
  try {
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM settings');
    cache = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  } catch {
    cache = {};
  }
}

export function globalTariff(): Tariff {
  return {
    base: cache.fare_base ?? env.FARE_BASE,
    per_km: cache.fare_per_km ?? env.FARE_PER_KM,
    per_min: cache.fare_per_min ?? env.FARE_PER_MIN,
    minimum: cache.fare_minimum ?? env.FARE_MINIMUM,
  };
}

export function allSettings(): Record<string, number> {
  const g = globalTariff();
  return { fare_base: g.base, fare_per_km: g.per_km, fare_per_min: g.per_min, fare_minimum: g.minimum };
}

/**
 * Tarifa aplicable a un pasajero: usa la de su empresa cliente si tiene
 * valores propios; si no, la global. Devuelve también su company_id.
 */
export async function tariffForUser(userId: number): Promise<{ tariff: Tariff; companyId: number | null }> {
  const g = globalTariff();
  const c = await one<any>(
    `SELECT u.company_id, co.fare_base, co.fare_per_km, co.fare_per_min, co.fare_minimum
     FROM users u LEFT JOIN companies co ON co.id = u.company_id
     WHERE u.id = $1`, [userId]
  );
  if (!c) return { tariff: g, companyId: null };
  return {
    companyId: c.company_id ?? null,
    tariff: {
      base: c.fare_base ?? g.base,
      per_km: c.fare_per_km ?? g.per_km,
      per_min: c.fare_per_min ?? g.per_min,
      minimum: c.fare_minimum ?? g.minimum,
    },
  };
}
