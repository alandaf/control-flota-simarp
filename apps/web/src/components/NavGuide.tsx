import { useEffect, useRef, useState } from 'react';
import { api, haversineKm } from '../lib/api';
import { Maneuver, Volume, VolumeOff } from './Icons';

interface Step { lat: number; lng: number; instruction: string; type: string; modifier: string; distance: number; }
interface Props {
  target: { lat: number; lng: number } | null; // destino del tramo actual
  legKey: string;                                // cambia al cambiar de tramo (recogida/viaje)
  getPos: () => { lat: number; lng: number } | null;
}

function fmtDist(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(1).replace('.0', '') + ' km';
  return Math.max(0, Math.round(m / 10) * 10) + ' m';
}

export default function NavGuide({ target, legKey, getPos }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(1);
  const [distM, setDistM] = useState(0);
  const [muted, setMuted] = useState(false);

  const idxRef = useRef(1); idxRef.current = idx;
  const stepsRef = useRef<Step[]>([]); stepsRef.current = steps;
  const mutedRef = useRef(false); mutedRef.current = muted;
  const spokenAt = useRef<number>(-1);   // idx anunciado "en X metros"
  const spokenNow = useRef<number>(-1);  // idx anunciado "ahora"
  const offCount = useRef(0);

  function speak(text: string) {
    if (mutedRef.current || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // (Re)calcula la ruta con maniobras desde la posición actual hacia el destino
  async function fetchSteps() {
    const pos = getPos();
    if (!pos || !target) return;
    try {
      const r = await api<any>('/api/trips/route', {
        origin_lat: pos.lat, origin_lng: pos.lng, dest_lat: target.lat, dest_lng: target.lng, steps: true,
      });
      const s: Step[] = r.steps ?? [];
      setSteps(s);
      setIdx(s.length > 1 ? 1 : 0);
      spokenAt.current = -1; spokenNow.current = -1; offCount.current = 0;
    } catch { /* reintenta luego */ }
  }

  useEffect(() => { fetchSteps(); /* eslint-disable-next-line */ }, [legKey]);

  // Bucle de seguimiento
  useEffect(() => {
    const iv = setInterval(() => {
      const pos = getPos();
      const s = stepsRef.current;
      if (!pos || s.length === 0) return;

      let i = Math.min(idxRef.current, s.length - 1);
      let d = haversineKm(pos.lat, pos.lng, s[i].lat, s[i].lng) * 1000;

      // Avanza a la siguiente maniobra al pasar la actual
      if (d < 22 && i < s.length - 1) { i++; setIdx(i); d = haversineKm(pos.lat, pos.lng, s[i].lat, s[i].lng) * 1000; }
      setDistM(d);

      // Anuncios por voz
      const st = s[i];
      if (st.type === 'arrive') {
        if (d < 40 && spokenNow.current !== i) { spokenNow.current = i; speak('Llegaste a tu destino'); }
      } else {
        if (d < 300 && spokenAt.current !== i) { spokenAt.current = i; speak(`En ${fmtDist(d)}, ${st.instruction}`); }
        if (d < 35 && spokenNow.current !== i) { spokenNow.current = i; speak(st.instruction); }
      }

      // Recalcular si se salió de la ruta
      if (d > 220) { offCount.current++; if (offCount.current >= 3) fetchSteps(); }
      else offCount.current = 0;
    }, 2500);
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
      <button className="nav-mute" onClick={() => { setMuted((v) => !v); if (muted) speak('Navegación activada'); }}
              title={muted ? 'Activar voz' : 'Silenciar'}>
        {muted ? <VolumeOff /> : <Volume />}
      </button>
    </div>
  );
}
