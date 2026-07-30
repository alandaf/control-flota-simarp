import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Maneuver } from './Icons';

interface Step { lat: number; lng: number; instruction: string; type: string; modifier: string; distance: number; }
interface Props {
  target: { lat: number; lng: number } | null; // destino del tramo actual
  legKey: string;                                // cambia al cambiar de tramo (recogida/viaje)
  getPos: () => { lat: number; lng: number } | null;
  onOffRoute?: () => void;                       // se llama al detectar un desvío (para avisar al panel)
}

// ---- Geometría local (metros) ----
const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
interface XY { x: number; y: number }
const toXY = (lat: number, lng: number, latRef: number, lngRef: number): XY => ({
  x: rad(lng - lngRef) * Math.cos(rad(latRef)) * R,
  y: rad(lat - latRef) * R,
});
const dist = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);

/** Proyecta p sobre el segmento a-b. Devuelve distancia perpendicular y avance (0..len). */
function projectSeg(p: XY, a: XY, b: XY): { d: number; along: number } {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * vx, cy = a.y + t * vy;
  return { d: Math.hypot(p.x - cx, p.y - cy), along: t * Math.sqrt(len2) };
}

function fmtDist(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(1).replace('.0', '') + ' km';
  return Math.max(0, Math.round(m / 10) * 10) + ' m';
}

// Modelo de la ruta pre-calculado para el seguimiento
interface RouteModel {
  latRef: number; lngRef: number;
  xy: XY[];            // vértices de la ruta en metros
  cum: number[];       // distancia acumulada por vértice
  stepAlong: number[]; // avance (m) de cada maniobra a lo largo de la ruta
  total: number;
}

// Guía SOLO VISUAL: muestra en pantalla la próxima maniobra y la distancia.
// La navegación por voz real se delega a Waze / Google Maps (botones del panel);
// la voz interna se quitó porque seguía una ruta calculada aparte y se
// desincronizaba a mitad de camino.
export default function NavGuide({ target, legKey, getPos, onOffRoute }: Props) {
  const offRouteRef = useRef(onOffRoute); offRouteRef.current = onOffRoute;
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [distM, setDistM] = useState(0);

  const stepsRef = useRef<Step[]>([]); stepsRef.current = steps;
  const modelRef = useRef<RouteModel | null>(null);
  const offCount = useRef(0);
  const recalcAt = useRef(0);            // timestamp del último recálculo (anti-rebote)

  // (Re)calcula la ruta con maniobras + geometría desde la posición actual hacia el destino
  async function fetchSteps() {
    const pos = getPos();
    if (!pos || !target) return;
    recalcAt.current = Date.now();
    try {
      const r = await api<any>('/api/trips/route', {
        origin_lat: pos.lat, origin_lng: pos.lng, dest_lat: target.lat, dest_lng: target.lng, steps: true,
      });
      const s: Step[] = r.steps ?? [];
      const geom: [number, number][] = r.geometry ?? [];
      modelRef.current = buildModel(s, geom);
      setSteps(s);
      setIdx(s.length > 1 ? 1 : 0);
      offCount.current = 0;
    } catch { /* reintenta luego */ }
  }

  function buildModel(s: Step[], geom: [number, number][]): RouteModel | null {
    if (geom.length < 2) return null;
    const latRef = geom[0][0], lngRef = geom[0][1];
    const xy = geom.map(([la, ln]) => toXY(la, ln, latRef, lngRef));
    const cum = [0];
    for (let i = 1; i < xy.length; i++) cum[i] = cum[i - 1] + dist(xy[i - 1], xy[i]);
    const total = cum[cum.length - 1];
    // Cada maniobra -> avance del vértice más cercano de la ruta
    const stepAlong = s.map((st) => {
      const p = toXY(st.lat, st.lng, latRef, lngRef);
      let best = 0, bd = Infinity;
      for (let i = 0; i < xy.length; i++) { const d = dist(p, xy[i]); if (d < bd) { bd = d; best = i; } }
      return cum[best];
    });
    if (stepAlong.length) stepAlong[stepAlong.length - 1] = total; // la llegada = fin de la ruta
    return { latRef, lngRef, xy, cum, stepAlong, total };
  }

  useEffect(() => { fetchSteps(); /* eslint-disable-next-line */ }, [legKey]);

  // Bucle de seguimiento (solo actualiza la maniobra visible y detecta desvíos)
  useEffect(() => {
    const iv = setInterval(() => {
      const pos = getPos();
      const s = stepsRef.current;
      const model = modelRef.current;
      if (!pos || s.length === 0 || !model) return;

      // Proyecta la posición sobre la ruta: distancia perpendicular (fuera de ruta) y avance
      const p = toXY(pos.lat, pos.lng, model.latRef, model.lngRef);
      let cross = Infinity, sAlong = 0;
      for (let i = 0; i < model.xy.length - 1; i++) {
        const pr = projectSeg(p, model.xy[i], model.xy[i + 1]);
        if (pr.d < cross) { cross = pr.d; sAlong = model.cum[i] + pr.along; }
      }

      // Maniobra actual = primera cuyo avance está por delante de mí
      let i = model.stepAlong.findIndex((a) => a > sAlong + 6);
      if (i < 0) i = s.length - 1;
      const d = Math.max(0, model.stepAlong[i] - sAlong); // distancia real por la ruta
      setIdx(i);
      setDistM(d);

      // Aviso de desvío al panel de operaciones (sin recalcular cerca del destino,
      // donde el GPS "salta" entre calles y disparaba falsos positivos).
      const remaining = model.total - sAlong;
      if (cross > 60 && remaining > 300) {
        offCount.current++;
        if (offCount.current >= 3 && Date.now() - recalcAt.current > 8000) {
          offRouteRef.current?.(); // avisa al panel del desvío
          fetchSteps();
        }
      } else {
        offCount.current = 0;
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line
  }, []);

  const cur = steps[Math.min(idx, steps.length - 1)];
  if (!cur) return null;

  return (
    <div className="nav-banner">
      <div className="nav-arrow"><Maneuver type={cur.type} modifier={cur.modifier} /></div>
      <div className="nav-text">
        <div className="nav-dist">{cur.type === 'arrive' ? 'Llegando' : fmtDist(distM)}</div>
        <div className="nav-instr">{cur.instruction}</div>
      </div>
    </div>
  );
}
