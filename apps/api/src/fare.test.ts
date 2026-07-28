import { describe, it, expect } from 'vitest';
import { haversineKm, estimateFare, estimateMinutes } from './fare.js';
import type { Tariff } from './tariffs.js';

const T: Tariff = { base: 800, per_km: 550, per_min: 90, minimum: 1500 };

describe('haversineKm', () => {
  it('es 0 para el mismo punto', () => {
    expect(haversineKm(-33.04, -71.62, -33.04, -71.62)).toBe(0);
  });
  it('es simétrica', () => {
    const a = haversineKm(-33.04, -71.62, -33.02, -71.64);
    const b = haversineKm(-33.02, -71.64, -33.04, -71.62);
    expect(a).toBeCloseTo(b, 10);
  });
  it('~111 km por grado de latitud', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });
});

describe('estimateFare', () => {
  it('respeta la tarifa mínima', () => {
    // 800 + 0.1*550 + 1*90 = 945 → redondeo 950, pero mínimo 1500
    expect(estimateFare(0.1, 1, T)).toBe(1500);
  });
  it('redondea a la decena de 50 más cercana', () => {
    // 800 + 5*550 + 10*90 = 4450 → múltiplo de 50 exacto
    expect(estimateFare(5, 10, T)).toBe(4450);
    expect(estimateFare(5, 10, T) % 50).toBe(0);
  });
  it('crece con distancia y tiempo', () => {
    expect(estimateFare(10, 20, T)).toBeGreaterThan(estimateFare(5, 10, T));
  });
  it('siempre múltiplo de 50 y ≥ mínimo', () => {
    for (const [km, min] of [[0, 0], [2, 3], [12.3, 27], [40, 80]] as const) {
      const f = estimateFare(km, min, T);
      expect(f % 50).toBe(0);
      expect(f).toBeGreaterThanOrEqual(T.minimum);
    }
  });
});

describe('estimateMinutes', () => {
  it('30 km → ~60 min a 30 km/h', () => {
    expect(estimateMinutes(30)).toBe(60);
  });
  it('0 km → 0 min', () => {
    expect(estimateMinutes(0)).toBe(0);
  });
});
