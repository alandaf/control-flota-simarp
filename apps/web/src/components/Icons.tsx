/* Íconos SVG (estilo lineal, heredan color y tamaño por CSS) */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P): P => ({
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p,
});

export const Logo = (p: P) => (
  <svg {...base(p)}><path d="M5 17H4a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 .24-.65L5.7 8.9a2 2 0 0 1 1.5-.68h9.6a2 2 0 0 1 1.5.68l2.46 3.15a1 1 0 0 1 .24.65V16a1 1 0 0 1-1 1h-1" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /><path d="M9.5 17h5" /></svg>
);
export const Car = Logo;
export const User = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" /></svg>
);
export const Wheel = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3v6.5M4.2 8.5l5.6 3.2M19.8 8.5l-5.6 3.2" /></svg>
);
export const Users = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-2.8 2.7-5 6-5s6 2.2 6 5" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M21 20c0-2.4-1.6-4.2-4-4.8" /></svg>
);
export const Pin = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const Flag = (p: P) => (
  <svg {...base(p)}><path d="M5 21V4M5 4h11l-1.5 3L16 10H5" /></svg>
);
export const Phone = (p: P) => (
  <svg {...base(p)}><path d="M4 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V20a1.5 1.5 0 0 1-1.6 1.5C11 21 3 13 2.5 5.6A1.5 1.5 0 0 1 4 4Z" /></svg>
);
export const Navigation = (p: P) => (
  <svg {...base(p)}><path d="M3 11l18-8-8 18-2.2-7.8L3 11Z" /></svg>
);
export const Compass = Navigation;
export const Power = (p: P) => (
  <svg {...base(p)}><path d="M12 3v9" /><path d="M6.4 6.4a8 8 0 1 0 11.2 0" /></svg>
);
export const LogOut = (p: P) => (
  <svg {...base(p)}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
);
export const Plus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const Trash = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
);
export const ChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>
);
export const Search = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}><path d="M5 12.5 10 17l9-10" /></svg>
);
export const CheckCircle = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const Grid = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>
);
export const Map = (p: P) => (
  <svg {...base(p)}><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
);
export const Route = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5" /></svg>
);
export const Truck = (p: P) => (
  <svg {...base(p)}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14v9H3V6.5Z" /><path d="M14 8h3.5l3 3v3H14V8Z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
);
export const Star = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}><path d="m12 3 2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6L4 9.3l6-.7L12 3Z" /></svg>
);
export const StarOutline = (p: P) => (
  <svg {...base(p)}><path d="m12 3 2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6L4 9.3l6-.7L12 3Z" /></svg>
);
export const Clock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);
export const Play = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}><path d="M7 4.5v15l12-7.5L7 4.5Z" /></svg>
);
export const Locate = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
export const Volume = (p: P) => (
  <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12" /></svg>
);
export const VolumeOff = (p: P) => (
  <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 4 6M21 9l-4 6" /></svg>
);

// Flecha de maniobra según la dirección de OSRM
export function Maneuver({ type, modifier, ...p }: P & { type?: string; modifier?: string }) {
  if (type === 'arrive') return <Flag {...p} />;
  if (type === 'roundabout' || type === 'rotary')
    return <svg {...base(p)}><circle cx="12" cy="13" r="5" /><path d="M12 8V3M12 3l-2.5 2.5M12 3l2.5 2.5" /></svg>;
  const m = modifier || 'straight';
  if (m.includes('uturn')) return <svg {...base(p)}><path d="M8 20V10a4 4 0 0 1 8 0v3" /><path d="m19 13-3 3-3-3" /></svg>;
  if (m === 'left' || m === 'sharp left') return <svg {...base(p)}><path d="M20 18v-4a4 4 0 0 0-4-4H5" /><path d="m9 6-4 4 4 4" /></svg>;
  if (m === 'right' || m === 'sharp right') return <svg {...base(p)}><path d="M4 18v-4a4 4 0 0 1 4-4h11" /><path d="m15 6 4 4-4 4" /></svg>;
  if (m === 'slight left') return <svg {...base(p)}><path d="M18 20V9a3 3 0 0 0-3-3H8" /><path d="m11 3-3 3 3 3" /></svg>;
  if (m === 'slight right') return <svg {...base(p)}><path d="M6 20V9a3 3 0 0 1 3-3h7" /><path d="m13 3 3 3-3 3" /></svg>;
  // recto
  return <svg {...base(p)}><path d="M12 21V4" /><path d="m7 9 5-5 5 5" /></svg>;
}
