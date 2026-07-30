import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const SANTIAGO: [number, number] = [-33.4489, -70.6693];

const carGlyph = (stroke: string) =>
  `<g transform="translate(6.2,6.2) scale(0.9)" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
     <path d="M5 17H4a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 .24-.65L5.7 8.9a2 2 0 0 1 1.5-.68h9.6a2 2 0 0 1 1.5.68l2.46 3.15a1 1 0 0 1 .24.65V16a1 1 0 0 1-1 1h-1"/>
     <circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>
   </g>`;

// Punto de recogida: dot oscuro con anillo blanco (estilo mobility)
const originHtml =
  `<div class="mk-dot"><svg width="22" height="22" viewBox="0 0 22 22">
     <circle cx="11" cy="11" r="9" fill="#fff"/><circle cx="11" cy="11" r="6" fill="#0a0a0b"/>
   </svg></div>`;

// Destino: pin
const destHtml =
  `<div class="mk-pin"><svg width="28" height="34" viewBox="0 0 28 34">
     <path d="M14 1.5C7.6 1.5 2.5 6.5 2.5 12.6 2.5 20.6 14 32 14 32s11.5-11.4 11.5-19.4C25.5 6.5 20.4 1.5 14 1.5Z" fill="#e5484d" stroke="#fff" stroke-width="2.5"/>
     <circle cx="14" cy="12.4" r="4" fill="#fff"/>
   </svg></div>`;

const carMarkerHtml = (bg: string) =>
  `<div class="mk-dot"><svg width="36" height="36" viewBox="0 0 36 36">
     <circle cx="18" cy="18" r="14" fill="${bg}" stroke="#fff" stroke-width="2.5"/>
     ${carGlyph('#fff')}
   </svg></div>`;

// Marcador direccional del propio conductor: círculo + flecha que apunta al
// rumbo. El wrapper `.mk-rot` se rota por CSS (transform) desde Driver.tsx; no
// choca con el translate que Leaflet aplica al contenedor del marcador.
const navArrowHtml = (bg: string) =>
  `<div class="mk-rot" style="transform-origin:50% 50%"><svg width="40" height="40" viewBox="0 0 40 40">
     <circle cx="20" cy="20" r="15" fill="${bg}" stroke="#fff" stroke-width="2.5"/>
     <path d="M20 9 L27.5 27 L20 22.5 L12.5 27 Z" fill="#fff"/>
   </svg></div>`;

export const icons = {
  origin: L.divIcon({ html: originHtml, className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
  dest: L.divIcon({ html: destHtml, className: '', iconSize: [28, 34], iconAnchor: [14, 32] }),
  car: L.divIcon({ html: carMarkerHtml('#0a0a0b'), className: '', iconSize: [36, 36], iconAnchor: [18, 18] }),
  taxi: L.divIcon({ html: carMarkerHtml('#635bff'), className: '', iconSize: [36, 36], iconAnchor: [18, 18] }),
  nav: L.divIcon({ html: navArrowHtml('#635bff'), className: '', iconSize: [40, 40], iconAnchor: [20, 20] }),
};

/** Marcador de conductor para el mapa de administración (color según estado). */
export function driverMarkerIcon(color: string) {
  return L.divIcon({ html: carMarkerHtml(color), className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
}

/** Crea un mapa Leaflet con una capa base clara (CARTO Voyager, estilo limpio). */
export function createMap(el: HTMLElement, center: [number, number] = SANTIAGO, zoom = 14): L.Map {
  const map = L.map(el, { zoomControl: true, attributionControl: true }).setView(center, zoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '© OpenStreetMap · © CARTO',
  }).addTo(map);
  return map;
}
