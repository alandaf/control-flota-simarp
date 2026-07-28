import { describe, it, expect } from 'vitest';
import { decodePolyline, googleManeuver } from './routing.js';

describe('decodePolyline', () => {
  it('decodifica el ejemplo canónico de Google', () => {
    // Ejemplo oficial: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
  it('cadena vacía → sin puntos', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('googleManeuver', () => {
  it('mapea giros básicos', () => {
    expect(googleManeuver('turn-left').modifier).toBe('left');
    expect(googleManeuver('turn-right').modifier).toBe('right');
    expect(googleManeuver('turn-slight-left').modifier).toBe('slight left');
    expect(googleManeuver('turn-sharp-right').modifier).toBe('sharp right');
    expect(googleManeuver('uturn-left').modifier).toBe('uturn');
  });
  it('rotondas devuelven type roundabout', () => {
    expect(googleManeuver('roundabout-left').type).toBe('roundabout');
  });
  it('vacío → recto por defecto', () => {
    expect(googleManeuver('')).toEqual({ type: 'turn', modifier: 'straight' });
  });
});
