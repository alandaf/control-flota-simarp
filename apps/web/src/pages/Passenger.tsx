import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { createMap, icons, SANTIAGO } from '../lib/mapkit';
import { api, es, money, reverseGeocode, initials } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../lib/auth';
import { Logo, User, LogOut, Pin, Flag, Phone, Car, CheckCircle, Route, Star, StarOutline, Clock } from '../components/Icons';

type Pt = { lat: number; lng: number; address?: string };

export default function Passenger() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const oMarker = useRef<L.Marker | null>(null);
  const dMarker = useRef<L.Marker | null>(null);
  const carMarker = useRef<L.Marker | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const joinedTrip = useRef<number | null>(null);
  const routeKey = useRef<string>(''); // ruta REAL ya dibujada para este viaje+estado

  const [origin, setOrigin] = useState<Pt | null>(null);
  const [dest, setDest] = useState<Pt | null>(null);
  const [pickMode, setPickMode] = useState<'origin' | 'dest'>('origin');
  const [fare, setFare] = useState<{ fare: number; distance_km: number; minutes: number; geometry?: [number, number][]; routed?: boolean } | null>(null);
  const [trip, setTrip] = useState<any>(null);
  const [rating, setRating] = useState<{ tripId: number; driver: string } | null>(null);
  const [score, setScore] = useState(5);

  // refs "en vivo" para usar dentro de callbacks
  const originRef = useRef<Pt | null>(null); originRef.current = origin;
  const destRef = useRef<Pt | null>(null); destRef.current = dest;
  const tripRef = useRef<any>(null); tripRef.current = trip;

  // ---- Inicializar mapa (una sola vez) ----
  useEffect(() => {
    if (map.current || !mapDiv.current) return;
    const m = createMap(mapDiv.current, SANTIAGO, 14);
    map.current = m;

    m.on('click', (e: L.LeafletMouseEvent) => {
      if (tripRef.current) return;
      if (pickModeRef.current === 'origin') placeOrigin(e.latlng.lat, e.latlng.lng);
      else placeDest(e.latlng.lat, e.latlng.lng);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { m.setView([pos.coords.latitude, pos.coords.longitude], 15); placeOrigin(pos.coords.latitude, pos.coords.longitude); },
        () => {}, { enableHighAccuracy: true, timeout: 6000 }
      );
    }
    setTimeout(() => m.invalidateSize(), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickModeRef = useRef(pickMode); pickModeRef.current = pickMode;

  // ---- Socket + polling de viaje activo ----
  useEffect(() => {
    const s = getSocket();
    const onUpdate = () => refresh();
    const onDriverLoc = (p: { lat: number; lng: number }) => moveCar(p.lat, p.lng);
    s.on('trip:update', onUpdate);
    s.on('driver:location', onDriverLoc);

    refresh();
    const iv = setInterval(refresh, 5000);
    return () => { s.off('trip:update', onUpdate); s.off('driver:location', onDriverLoc); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const { trip: t } = await api<{ trip: any }>('/api/trips/active');
      const prev = tripRef.current;
      if (!t && prev && ['requested', 'accepted', 'arrived', 'in_progress'].includes(prev.status) && prev.driver_id) {
        setRating({ tripId: prev.id, driver: prev.driver_name || 'tu conductor' });
      }
      setTrip(t);
      if (t) {
        // unirse a la sala del viaje para recibir ubicación del conductor
        if (joinedTrip.current !== t.id) {
          getSocket().emit('trip:join', { trip_id: t.id });
          joinedTrip.current = t.id;
        }
        ensureTripRoute(t);
        if (t.driver_lat) moveCar(Number(t.driver_lat), Number(t.driver_lng));
      } else if (joinedTrip.current) {
        getSocket().emit('trip:leave', { trip_id: joinedTrip.current });
        joinedTrip.current = null;
        routeKey.current = '';
        removeCar();
      }
    } catch { /* ignore */ }
  }

  // ---- Markers de origen / destino ----
  async function placeOrigin(lat: number, lng: number) {
    const m = map.current!;
    if (oMarker.current) oMarker.current.setLatLng([lat, lng]);
    else {
      oMarker.current = L.marker([lat, lng], { icon: icons.origin, draggable: true }).addTo(m);
      oMarker.current.on('dragend', (ev) => { const p = (ev.target as L.Marker).getLatLng(); placeOrigin(p.lat, p.lng); });
    }
    const address = await reverseGeocode(lat, lng);
    setOrigin({ lat, lng, address });
    setPickMode('dest');
  }
  async function placeDest(lat: number, lng: number) {
    const m = map.current!;
    if (dMarker.current) dMarker.current.setLatLng([lat, lng]);
    else {
      dMarker.current = L.marker([lat, lng], { icon: icons.dest, draggable: true }).addTo(m);
      dMarker.current.on('dragend', (ev) => { const p = (ev.target as L.Marker).getLatLng(); placeDest(p.lat, p.lng); });
    }
    const address = await reverseGeocode(lat, lng);
    setDest({ lat, lng, address });
  }

  // ---- Estimación + ruta real cuando hay origen y destino ----
  useEffect(() => {
    if (!origin || !dest || trip) { setFare(null); return; }
    let cancelled = false;
    (async () => {
      // Reintenta hasta 3 veces si OSRM no devolvió una ruta real
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const r = await api<any>('/api/trips/estimate', {
            origin_lat: origin.lat, origin_lng: origin.lng, dest_lat: dest.lat, dest_lng: dest.lng,
          });
          if (cancelled) return;
          setFare(r);
          if (r.geometry) drawRoute(r.geometry, r.routed);
          if (r.routed) return; // ruta real lograda
        } catch { /* reintenta */ }
        await new Promise((res) => setTimeout(res, 1200));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, dest, trip]);

  // ---- Ruta del viaje activo (origen → destino, siguiendo calles) ----
  // Reintenta en cada refresco hasta obtener la ruta real (OSRM puede fallar).
  async function ensureTripRoute(t: any) {
    const key = `${t.id}:route`;
    if (routeKey.current === key) return;
    const firstDraw = routeKey.current !== key && !line.current;
    try {
      const r = await api<any>('/api/trips/route', {
        origin_lat: Number(t.origin_lat), origin_lng: Number(t.origin_lng),
        dest_lat: Number(t.dest_lat), dest_lng: Number(t.dest_lng),
      });
      if (r.geometry && r.routed) {
        drawRoute(r.geometry, true, firstDraw);
        routeKey.current = key; // éxito: dejar de reintentar
        return;
      }
    } catch { /* reintenta en el próximo refresco */ }
    if (!line.current) drawRoute([[Number(t.origin_lat), Number(t.origin_lng)], [Number(t.dest_lat), Number(t.dest_lng)]], false, true);
  }

  function drawRoute(coords: [number, number][], routed = true, fit = true) {
    const m = map.current!;
    if (line.current) m.removeLayer(line.current);
    line.current = L.polyline(coords, {
      color: '#4f46e5', weight: 5, opacity: 0.85,
      dashArray: routed ? undefined : '6 8', // punteada si no hubo ruteo real
    }).addTo(m);
    if (fit && coords.length) m.fitBounds(line.current.getBounds(), { padding: [60, 60] });
  }

  function moveCar(lat: number, lng: number) {
    const m = map.current!;
    if (carMarker.current) carMarker.current.setLatLng([lat, lng]);
    else carMarker.current = L.marker([lat, lng], { icon: icons.car }).addTo(m);
  }
  function removeCar() { if (carMarker.current) { map.current?.removeLayer(carMarker.current); carMarker.current = null; } }

  async function requestTrip() {
    if (!origin || !dest) return;
    try {
      await api('/api/trips/request', {
        origin_lat: origin.lat, origin_lng: origin.lng, origin_address: origin.address,
        dest_lat: dest.lat, dest_lng: dest.lng, dest_address: dest.address,
      });
      await refresh();
    } catch (e: any) { alert(e.message); }
  }

  async function cancelTrip() {
    if (!trip || !confirm('¿Cancelar el viaje?')) return;
    try { await api('/api/trips/cancel', { trip_id: trip.id }); setTrip(null); await refresh(); }
    catch (e: any) { alert(e.message); }
  }

  async function submitRating() {
    if (!rating) return;
    try { await api('/api/trips/rate', { trip_id: rating.tripId, score }); } catch {}
    setRating(null); setScore(5);
  }

  const firstName = user?.name.split(' ')[0];

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="mark"><Logo /></span> Control Flota</div>
        <div className="topbar-actions">
          <span className="who"><User /> {firstName}</span>
          <button className="icon-btn" onClick={logout} title="Salir"><LogOut /></button>
        </div>
      </div>

      <div className="map-wrap"><div className="map" ref={mapDiv} /></div>

      <div className="sheet">
        <div className="grip" />
        {!trip ? (
          <>
            <h3>¿A dónde vamos?</h3>
            <p className="dim" style={{ margin: '2px 0 12px' }}>Toca el mapa para fijar los puntos.</p>
            <div className="field-mode">
              <button className={pickMode === 'origin' ? 'active' : ''} onClick={() => setPickMode('origin')}><Pin /> Origen</button>
              <button className={pickMode === 'dest' ? 'active' : ''} onClick={() => setPickMode('dest')}><Flag /> Destino</button>
            </div>
            <div className={`addr${origin ? '' : ' placeholder'}`}><span className="adot o" /> <b>{origin?.address || 'Punto de partida'}</b></div>
            <div className={`addr${dest ? '' : ' placeholder'}`}><span className="adot d" /> <b>{dest?.address || 'Destino'}</b></div>
            {fare && (
              <div className="fare-box">
                <div><div className="amt tnum">{money(fare.fare)}</div><div className="meta">Tarifa estimada</div></div>
                <div className="center"><div className="amt tnum" style={{ fontSize: 16 }}>{fare.distance_km} km</div><div className="meta">{fare.routed ? 'por calle' : 'aprox.'} · ~{fare.minutes} min</div></div>
              </div>
            )}
            <button className="btn" disabled={!origin || !dest} onClick={requestTrip}>
              {origin && dest ? 'Solicitar viaje' : 'Elige origen y destino'}
            </button>
            <button className="btn ghost small mt" style={{ width: '100%' }} onClick={() => nav('/history')}>
              <Clock /> Historial de viajes
            </button>
          </>
        ) : (
          <ActiveTrip trip={trip} onCancel={cancelTrip} />
        )}
      </div>

      {rating && (
        <div className="modal-bg">
          <div className="modal center">
            <h3>¿Cómo estuvo tu viaje?</h3>
            <p className="muted mt">Con {rating.driver}</p>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} className={i <= score ? 'on' : ''} onClick={() => setScore(i)}>
                  {i <= score ? <Star /> : <StarOutline />}
                </button>
              ))}
            </div>
            <button className="btn accent" onClick={submitRating}>Enviar calificación</button>
            <button className="btn ghost small mt" style={{ width: '100%' }} onClick={() => setRating(null)}>Ahora no</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveTrip({ trip, onCancel }: { trip: any; onCancel: () => void }) {
  const color = ({ requested: 'off', accepted: 'busy', arrived: 'busy', in_progress: 'on' } as any)[trip.status] || 'off';

  if (trip.status === 'requested') {
    return (
      <>
        <div className="row">
          <div className="spinner" style={{ margin: 0 }} />
          <div><h3 style={{ margin: 0 }}>Buscando conductor…</h3><div className="muted">Te avisamos apenas alguien acepte</div></div>
        </div>
        <div className="fare-box mt">
          <div><div className="amt">{money(trip.fare)}</div><div className="meta">{trip.distance_km} km</div></div>
          <span className={`chip ${color}`}>{es(trip.status)}</span>
        </div>
        <button className="btn danger" onClick={onCancel}>Cancelar solicitud</button>
      </>
    );
  }

  return (
    <>
      <div className="row mb">
        <div className="avatar">{initials(trip.driver_name)}</div>
        <div className="grow">
          <h3 style={{ margin: 0 }}>{trip.driver_name || 'Conductor'}</h3>
          <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="rating"><Star /> {Number(trip.driver_rating || 5).toFixed(1)}</span> · {trip.brand} {trip.model} {trip.color ? '· ' + trip.color : ''}
          </div>
          <div className="muted"><b>{trip.plate}</b></div>
        </div>
        <span className={`chip ${color}`}>{es(trip.status)}</span>
      </div>
      {trip.status === 'accepted' && <div className="banner info"><Car /> El conductor va en camino a recogerte.</div>}
      {trip.status === 'arrived' && <div className="banner warn"><CheckCircle /> Tu conductor llegó al punto de encuentro.</div>}
      {trip.status === 'in_progress' && <div className="banner accent"><Route /> En viaje hacia tu destino.</div>}
      <div className="fare-box">
        <div><div className="amt tnum">{money(trip.fare)}</div><div className="meta">{trip.distance_km} km</div></div>
        {trip.driver_phone && <a className="btn accent small" href={`tel:${trip.driver_phone}`}><Phone /> Llamar</a>}
      </div>
      {trip.status !== 'in_progress' && <button className="btn secondary" onClick={onCancel}>Cancelar viaje</button>}
    </>
  );
}
