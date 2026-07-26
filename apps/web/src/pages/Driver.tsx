import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createMap, icons, SANTIAGO } from '../lib/mapkit';
import { api, es, money, initials } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../lib/auth';
import { Wheel, LogOut, Power, Pin, Flag, Phone, Navigation, Check, Play, CheckCircle, Search } from '../components/Icons';

export default function Driver() {
  const { logout } = useAuth();
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const meMarker = useRef<L.Marker | null>(null);
  const oMarker = useRef<L.Marker | null>(null);
  const dMarker = useRef<L.Marker | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const myPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastPush = useRef(0);
  const onlineRef = useRef(false);
  const tripRef = useRef<any>(null);
  const routeKey = useRef<string>('');   // ruta REAL ya dibujada para este viaje+estado
  const markerKey = useRef<string>('');  // marcadores origen/destino ya puestos

  const [status, setStatus] = useState<'offline' | 'available' | 'busy'>('offline');
  const [trip, setTrip] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  tripRef.current = trip;

  // ---- Mapa + geolocalización ----
  useEffect(() => {
    if (map.current || !mapDiv.current) return;
    const m = createMap(mapDiv.current, SANTIAGO, 14);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);

    let watchId = 0;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        myPos.current = p;
        if (meMarker.current) meMarker.current.setLatLng([p.lat, p.lng]);
        else { meMarker.current = L.marker([p.lat, p.lng], { icon: icons.taxi }).addTo(m); m.setView([p.lat, p.lng], 15); }
        if (onlineRef.current && Date.now() - lastPush.current > 3000) {
          lastPush.current = Date.now();
          getSocket().emit('driver:location', { lat: p.lat, lng: p.lng, heading: pos.coords.heading ?? undefined });
        }
      }, () => {}, { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 });
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Socket + polling ----
  useEffect(() => {
    const s = getSocket();
    const onNew = () => { if (onlineRef.current && !tripRef.current) loadPending(); };
    const onStatus = (p: { status: any }) => setStatus(p.status);
    s.on('trip:new', onNew);
    s.on('driver:status', onStatus);
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => { s.off('trip:new', onNew); s.off('driver:status', onStatus); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const { trip: t } = await api<{ trip: any }>('/api/trips/current');
      setTrip(t);
      if (t) { ensureRoute(t); getSocket().emit('trip:join', { trip_id: t.id }); }
      else if (onlineRef.current) { routeKey.current = ''; markerKey.current = ''; clearRoute(); loadPending(); }
    } catch {}
  }

  async function loadPending() {
    try { const { trips } = await api<{ trips: any[] }>('/api/trips/pending'); setPending(trips); } catch {}
  }

  function toggleOnline() {
    const next = !onlineRef.current;
    onlineRef.current = next;
    getSocket().emit('driver:online', { online: next });
    if (next && myPos.current) getSocket().emit('driver:location', { lat: myPos.current.lat, lng: myPos.current.lng });
    setStatus(next ? 'available' : 'offline');
    if (next) loadPending(); else setPending([]);
  }

  async function accept(id: number) {
    try { await api('/api/trips/accept', { trip_id: id }); await refresh(); }
    catch (e: any) { alert(e.message); refresh(); }
  }

  async function setTripStatus(id: number, st: string) {
    if (st === 'cancelled' && !confirm('¿Cancelar el viaje?')) return;
    try {
      await api('/api/trips/status', { trip_id: id, status: st });
      if (st === 'completed') alert('Viaje finalizado ✔');
      await refresh();
    } catch (e: any) { alert(e.message); }
  }

  // Dibuja la ruta real. Reintenta en cada refresco hasta lograrla (el OSRM
  // público puede fallar de forma intermitente); solo deja de intentar cuando
  // obtiene una ruta real, para no quedarse pegado en la línea recta.
  async function ensureRoute(t: any) {
    const key = String(t.id); // la ruta origen→destino no cambia con el estado
    const m = map.current!;

    // Marcadores origen/destino: una vez por viaje+estado
    if (markerKey.current !== key) {
      markerKey.current = key;
      routeKey.current = '';
      clearRoute();
      oMarker.current = L.marker([t.origin_lat, t.origin_lng], { icon: icons.origin }).addTo(m);
      dMarker.current = L.marker([t.dest_lat, t.dest_lng], { icon: icons.dest }).addTo(m);
      m.fitBounds(L.latLngBounds([[t.origin_lat, t.origin_lng], [t.dest_lat, t.dest_lng]]), { padding: [70, 70] });
    }

    if (routeKey.current === key) return; // ya tenemos la ruta real

    // Ruta del viaje (origen → destino), siguiendo las calles.
    const origin = { lat: Number(t.origin_lat), lng: Number(t.origin_lng) };
    const dest = { lat: Number(t.dest_lat), lng: Number(t.dest_lng) };

    try {
      const r = await api<any>('/api/trips/route', {
        origin_lat: origin.lat, origin_lng: origin.lng, dest_lat: dest.lat, dest_lng: dest.lng,
      });
      if (r.geometry && r.routed) {
        if (line.current) m.removeLayer(line.current);
        line.current = L.polyline(r.geometry, { color: '#4f46e5', weight: 5, opacity: 0.9 }).addTo(m);
        m.fitBounds(line.current.getBounds(), { padding: [70, 70] });
        routeKey.current = key; // éxito: dejar de reintentar
        return;
      }
    } catch { /* reintenta en el próximo refresco */ }

    // Provisional (aún sin ruta real): línea recta punteada, seguirá reintentando
    if (!line.current) {
      line.current = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]],
        { color: '#94a3b8', weight: 4, opacity: 0.7, dashArray: '6 8' }).addTo(m);
    }
  }
  function clearRoute() {
    [oMarker, dMarker, line].forEach((r) => { if (r.current) { map.current?.removeLayer(r.current); r.current = null; } });
  }

  const next = ({
    accepted: { label: 'Llegué al punto', icon: <Check />, status: 'arrived' },
    arrived: { label: 'Iniciar viaje', icon: <Play />, status: 'in_progress' },
    in_progress: { label: 'Finalizar viaje', icon: <CheckCircle />, status: 'completed' },
  } as any)[trip?.status];

  const navTo = trip
    ? (trip.status === 'in_progress' ? `${trip.dest_lat},${trip.dest_lng}` : `${trip.origin_lat},${trip.origin_lng}`)
    : '';

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="mark"><Wheel /></span> Conductor</div>
        <div className="topbar-actions">
          <span className={`chip ${status === 'available' ? 'on' : status === 'busy' ? 'busy' : 'off'}`}>{es(status)}</span>
          <button className="icon-btn" onClick={logout} title="Salir"><LogOut /></button>
        </div>
      </div>

      <div className="map-wrap"><div className="map" ref={mapDiv} /></div>

      <div className="sheet">
        <div className="grip" />
        {trip ? (
          <>
            <div className="row mb">
              <div className="avatar">{initials(trip.passenger_name)}</div>
              <div className="grow"><h3 style={{ margin: 0 }}>{trip.passenger_name}</h3><div className="muted">{es(trip.status)}</div></div>
              {trip.passenger_phone && <a className="icon-btn" style={{ width: 40, height: 40, background: 'var(--go)', color: '#fff', borderColor: 'transparent' }} href={`tel:${trip.passenger_phone}`}><Phone /></a>}
            </div>
            <div className="addr"><span className="adot o" /> <b>{trip.origin_address || 'Origen'}</b></div>
            <div className="addr"><span className="adot d" /> <b>{trip.dest_address || 'Destino'}</b></div>
            <div className="fare-box">
              <div><div className="amt tnum">{money(trip.fare)}</div><div className="meta">{trip.distance_km} km</div></div>
              <a className="btn secondary small" target="_blank" rel="noreferrer"
                 href={`https://www.openstreetmap.org/directions?from=${myPos.current ? myPos.current.lat + ',' + myPos.current.lng : ''}&to=${navTo}`}><Navigation /> Navegar</a>
            </div>
            {next && <button className="btn accent" onClick={() => setTripStatus(trip.id, next.status)}>{next.icon} {next.label}</button>}
            {trip.status !== 'in_progress' && <button className="btn ghost small mt" style={{ width: '100%' }} onClick={() => setTripStatus(trip.id, 'cancelled')}>Cancelar viaje</button>}
          </>
        ) : status === 'offline' ? (
          <div className="center" style={{ padding: '8px 0 4px' }}>
            <h3>Estás desconectado</h3>
            <p className="muted mt" style={{ marginBottom: 4 }}>Conéctate para recibir solicitudes de viaje cercanas.</p>
            <button className="btn accent mt" onClick={toggleOnline}><Power /> Conectarme</button>
          </div>
        ) : (
          <>
            <div className="between mb">
              <h3 style={{ margin: 0 }}>Solicitudes {pending.length ? `· ${pending.length}` : ''}</h3>
              <button className="btn ghost small" onClick={toggleOnline}><Power /> Desconectarme</button>
            </div>
            {pending.length === 0 ? (
              <div className="empty"><Search /><p>Sin solicitudes por ahora.<br />Te avisamos apenas llegue una. <span className="pulse-dot" /></p></div>
            ) : pending.map((t) => (
              <div className="card" key={t.id}>
                <div className="between">
                  <b>{t.passenger_name}</b><span className="amt tnum">{money(t.fare)}</span>
                </div>
                <div className="addr" style={{ margin: '10px 0 4px' }}><span className="adot o" /> {t.origin_address || 'Origen'}</div>
                <div className="addr" style={{ margin: '4px 0' }}><span className="adot d" /> {t.dest_address || 'Destino'}</div>
                <div className="between" style={{ marginTop: 10 }}>
                  <span className="muted">{t.distance_km} km{t.pickup_km != null ? ` · a ${t.pickup_km} km` : ''}</span>
                  <button className="btn small" onClick={() => accept(t.id)}>Aceptar</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
