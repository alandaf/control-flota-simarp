import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createMap, driverMarkerIcon, SANTIAGO } from '../lib/mapkit';
import { api, es, initials, money } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../lib/auth';
import { Logo, LogOut, Grid, Map as MapIcon, Route, Wheel, Truck, Users as UsersIcon, Plus, Trash, Star } from '../components/Icons';

type View = 'dashboard' | 'map' | 'trips' | 'drivers' | 'vehicles' | 'users';

export default function Admin() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="mark"><Logo /></span> Control Flota</div>
        <div className="topbar-actions">
          <span className="who">{user?.name}</span>
          <button className="icon-btn" onClick={logout} title="Salir"><LogOut /></button>
        </div>
      </div>

      <div className="adminnav">
        {([
          ['dashboard', 'Dashboard', <Grid />], ['map', 'Mapa en vivo', <MapIcon />], ['trips', 'Viajes', <Route />],
          ['drivers', 'Conductores', <Wheel />], ['vehicles', 'Vehículos', <Truck />], ['users', 'Usuarios', <UsersIcon />],
        ] as [View, string, JSX.Element][]).map(([v, label, icon]) => (
          <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{icon} {label}</button>
        ))}
      </div>

      {view === 'map' ? <LiveMap /> : (
        <div className="scroll">
          {view === 'dashboard' && <Dashboard onGo={setView} />}
          {view === 'trips' && <Trips />}
          {view === 'drivers' && <Drivers />}
          {view === 'vehicles' && <Vehicles />}
          {view === 'users' && <Users />}
        </div>
      )}
    </div>
  );
}

function Dashboard({ onGo }: { onGo: (v: View) => void }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    const load = () => api<{ stats: any }>('/api/admin/stats').then((d) => setStats(d.stats)).catch(() => {});
    load(); const iv = setInterval(load, 5000); return () => clearInterval(iv);
  }, []);
  if (!stats) return <div className="spinner center" />;
  const cell = (n: any, l: string, cls = '') => (
    <div className="stat"><div className={`n tnum ${cls}`}>{n}</div><div className="l">{l}</div></div>
  );
  return (
    <>
      <div className="stat-grid">
        {cell(stats.trips_today, 'Viajes hoy', 'brand')}
        {cell(stats.trips_active, 'Viajes activos')}
        {cell(money(stats.revenue_today), 'Ingresos hoy')}
        {cell(stats.trips_total, 'Viajes totales')}
        {cell(stats.drivers_online, 'Conductores en línea', 'go')}
        {cell(stats.drivers_total, 'Conductores')}
        {cell(stats.passengers, 'Pasajeros')}
        {cell(stats.vehicles, 'Vehículos')}
      </div>
      <div className="card mt">
        <h4>Accesos rápidos</h4>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn small" onClick={() => onGo('map')}>Ver mapa en vivo</button>
          <button className="btn small secondary" onClick={() => onGo('trips')}>Viajes recientes</button>
          <button className="btn small secondary" onClick={() => onGo('vehicles')}>Gestionar flota</button>
        </div>
      </div>
    </>
  );
}

function LiveMap() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<number, L.Marker>>({});

  useEffect(() => {
    if (!map.current && mapDiv.current) {
      map.current = createMap(mapDiv.current, SANTIAGO, 13);
      setTimeout(() => map.current?.invalidateSize(), 200);
    }
    const draw = async () => {
      try {
        const { drivers } = await api<{ drivers: any[] }>('/api/admin/drivers_map');
        drivers.forEach((d) => {
          if (!d.lat || !d.lng) return;
          const color = d.status === 'available' ? '#10b981' : d.status === 'busy' ? '#f59e0b' : '#a1a1aa';
          const icon = driverMarkerIcon(color);
          const popup = `<b>${d.name}</b><br>${es(d.status)} · ★ ${Number(d.rating_avg).toFixed(1)}<br>${d.plate ? d.brand + ' ' + d.model + ' (' + d.plate + ')' : 'Sin vehículo'}<br>${d.trips_count} viajes`;
          const m = markers.current[d.user_id];
          if (m) m.setLatLng([d.lat, d.lng]).setIcon(icon).setPopupContent(popup);
          else markers.current[d.user_id] = L.marker([d.lat, d.lng], { icon }).addTo(map.current!).bindPopup(popup);
        });
      } catch {}
    };
    draw();
    const s = getSocket();
    const onLoc = (p: { user_id: number; lat: number; lng: number }) => {
      const m = markers.current[p.user_id];
      if (m) m.setLatLng([p.lat, p.lng]);
    };
    s.on('admin:driver_location', onLoc);
    const iv = setInterval(draw, 5000);
    return () => { s.off('admin:driver_location', onLoc); clearInterval(iv); };
  }, []);

  return <div className="map-wrap"><div className="map" ref={mapDiv} /></div>;
}

function Trips() {
  const [trips, setTrips] = useState<any[]>([]);
  useEffect(() => { api<{ trips: any[] }>('/api/admin/trips').then((d) => setTrips(d.trips)).catch(() => {}); }, []);
  return (
    <div className="card">
      <h4>Viajes ({trips.length})</h4>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>#</th><th>Pasajero</th><th>Conductor</th><th>Estado</th><th>Km</th><th>Tarifa</th><th>Fecha</th></tr></thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td><td>{t.passenger_name}</td><td>{t.driver_name || '—'}</td>
                <td><span className={`badge ${t.status}`}>{es(t.status)}</span></td>
                <td>{t.distance_km ?? '—'}</td><td>{money(t.fare)}</td>
                <td className="muted">{String(t.requested_at || '').slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const load = () => Promise.all([
    api<{ drivers: any[] }>('/api/admin/drivers_map'),
    api<{ vehicles: any[] }>('/api/admin/vehicles'),
  ]).then(([a, b]) => { setDrivers(a.drivers); setVehicles(b.vehicles); }).catch(() => {});
  useEffect(() => { load(); }, []);

  async function assign(driverUserId: number, vehicleId: string) {
    try { await api('/api/admin/assign_vehicle', { driver_user_id: driverUserId, vehicle_id: Number(vehicleId) || null }); load(); }
    catch (e: any) { alert(e.message); }
  }

  if (!drivers.length) return <div className="empty"><Wheel /><p>Aún no hay conductores registrados.</p></div>;
  return (
    <>
      {drivers.map((d) => (
        <div className="card driver-card" key={d.user_id}>
          <div className="avatar">{initials(d.name)}</div>
          <div className="grow">
            <b>{d.name}</b> <span className={`badge ${d.status}`}>{es(d.status)}</span>
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span className="rating"><Star /> {Number(d.rating_avg).toFixed(1)}</span> · {d.trips_count} viajes{d.phone ? ' · ' + d.phone : ''}</div>
            <div className="mt">
              <select value={d.vehicle_id || ''} onChange={(e) => assign(d.user_id, e.target.value)}>
                <option value="">Sin vehículo</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

const emptyVehicle = { id: 0, plate: '', brand: '', model: '', color: '', year: '', capacity: 4, status: 'available' };

function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const load = () => api<{ vehicles: any[] }>('/api/admin/vehicles').then((d) => setVehicles(d.vehicles)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function save() {
    try {
      await api('/api/admin/vehicle_save', {
        id: Number(edit.id) || 0, plate: edit.plate, brand: edit.brand, model: edit.model,
        color: edit.color, year: Number(edit.year) || null, capacity: Number(edit.capacity) || 4, status: edit.status,
      });
      setEdit(null); load();
    } catch (e: any) { alert(e.message); }
  }
  async function del(id: number) {
    if (!confirm('¿Eliminar vehículo?')) return;
    try { await api('/api/admin/vehicle_delete', { id }); load(); } catch (e: any) { alert(e.message); }
  }

  return (
    <>
      <button className="btn small mb" onClick={() => setEdit({ ...emptyVehicle })}><Plus /> Nuevo vehículo</button>
      {vehicles.map((v) => (
        <div className="card" key={v.id}>
          <div className="between">
            <div>
              <b>{v.plate}</b> · {v.brand} {v.model} <span className={`badge ${v.status}`}>{es(v.status)}</span>
              <div className="muted" style={{ marginTop: 3 }}>{v.color || ''} {v.year || ''} · {v.capacity} plazas · {v.driver_name ? 'Asignado a ' + v.driver_name : 'Sin conductor'}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small secondary" onClick={() => setEdit({ ...v, year: v.year || '' })}>Editar</button>
              <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => del(v.id)} title="Eliminar"><Trash /></button>
            </div>
          </div>
        </div>
      ))}

      {edit && (
        <div className="modal-bg">
          <div className="modal">
            <h3>{edit.id ? 'Editar vehículo' : 'Nuevo vehículo'}</h3>
            <label>Patente</label>
            <input value={edit.plate} onChange={(e) => setEdit({ ...edit, plate: e.target.value })} placeholder="GJKL-45" />
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Marca</label><input value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} /></div>
              <div className="grow"><label>Modelo</label><input value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} /></div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Color</label><input value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></div>
              <div className="grow"><label>Año</label><input type="number" value={edit.year} onChange={(e) => setEdit({ ...edit, year: e.target.value })} /></div>
              <div><label>Cap.</label><input type="number" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: e.target.value })} style={{ width: 70 }} /></div>
            </div>
            <label>Estado</label>
            <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="available">Disponible</option>
              <option value="in_use">En uso</option>
              <option value="maintenance">Mantención</option>
            </select>
            <button className="btn" onClick={save}>Guardar</button>
            <button className="btn ghost small mt" onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

const emptyUser = { id: 0, name: '', email: '', phone: '', role: 'passenger', status: 'active', password: '' };
const ROLE_ES: Record<string, string> = { passenger: 'Pasajero', driver: 'Conductor', admin: 'Administrador' };

function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<any | null>(null);
  const load = () => api<{ users: any[] }>('/api/admin/users').then((d) => setUsers(d.users)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function toggle(id: number) {
    try { await api('/api/admin/toggle_user', { id }); load(); } catch (e: any) { alert(e.message); }
  }
  async function save() {
    if (!edit.name || !edit.email) { alert('Nombre y email son obligatorios'); return; }
    try {
      await api('/api/admin/user_save', {
        id: Number(edit.id) || 0, name: edit.name.trim(), email: edit.email.trim(),
        phone: edit.phone || '', role: edit.role, status: edit.status, password: edit.password || '',
      });
      setEdit(null); load();
    } catch (e: any) { alert(e.message); }
  }
  async function del(u: any) {
    if (!confirm(`¿Eliminar a ${u.name}? Se borrarán también sus viajes asociados.`)) return;
    try { await api('/api/admin/user_delete', { id: u.id }); load(); } catch (e: any) { alert(e.message); }
  }

  const shown = filter ? users.filter((u) => u.role === filter) : users;

  return (
    <>
      <div className="between mb">
        <div className="row" style={{ gap: 6 }}>
          {['', 'passenger', 'driver', 'admin'].map((r) => (
            <button key={r} className={`chiptab ${filter === r ? 'active' : ''}`} onClick={() => setFilter(r)}>
              {r === '' ? 'Todos' : ROLE_ES[r]}
            </button>
          ))}
        </div>
        <button className="btn small" onClick={() => setEdit({ ...emptyUser })}><Plus /> Nuevo</button>
      </div>

      <div className="card">
        <h4>Usuarios ({shown.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b><br /><span className="muted">{u.phone || ''}</span></td>
                  <td className="muted">{u.email}</td>
                  <td><span className={`badge ${u.role === 'driver' ? 'busy' : u.role === 'admin' ? 'in_progress' : 'completed'}`}>{ROLE_ES[u.role]}</span></td>
                  <td><span className={`badge ${u.status}`}>{es(u.status)}</span></td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn small secondary" onClick={() => setEdit({ ...u, password: '' })}>Editar</button>
                      {u.role !== 'admin' && <button className="btn small ghost" onClick={() => toggle(u.id)}>{u.status === 'active' ? 'Desactivar' : 'Activar'}</button>}
                      {me?.id !== u.id && <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => del(u)} title="Eliminar"><Trash /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="modal-bg">
          <div className="modal">
            <h3>{edit.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <label>Nombre completo</label>
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre y apellido" />
            <label>Email</label>
            <input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="correo@correo.cl" />
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Teléfono</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div className="grow"><label>Rol</label>
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                  <option value="passenger">Pasajero</option>
                  <option value="driver">Conductor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <label>Estado</label>
            <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            <label>Contraseña {edit.id ? <span className="muted">(en blanco = no cambiar)</span> : ''}</label>
            <input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder={edit.id ? '••••••' : 'mínimo 6 caracteres'} />
            <button className="btn" onClick={save}>Guardar</button>
            <button className="btn ghost small mt" style={{ width: '100%' }} onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
