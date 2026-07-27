import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createMap, driverMarkerIcon, SANTIAGO } from '../lib/mapkit';
import { api, es, initials, money } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../lib/auth';
import { Logo, LogOut, Grid, Map as MapIcon, Route, Wheel, Truck, Users as UsersIcon, Plus, Trash, Star, Clock, CheckCircle, Building, Settings, Printer } from '../components/Icons';
import { TrendChart, Bars, Donut } from '../components/Charts';

type View = 'dashboard' | 'map' | 'trips' | 'drivers' | 'vehicles' | 'users' | 'companies' | 'settings';

// Formateadores
const cl = (n: number) => Number(n || 0).toLocaleString('es-CL');
const money0 = (n: number) => '$' + cl(Math.round(n || 0));
const moneyK = (n: number) => (n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + cl(Math.round(n)));

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
          ['dashboard', 'Dashboard', <Grid />], ['map', 'Mapa en vivo', <MapIcon />], ['trips', 'Reportes', <Route />],
          ['drivers', 'Conductores', <Wheel />], ['vehicles', 'Vehículos', <Truck />], ['users', 'Usuarios', <UsersIcon />],
          ['companies', 'Empresas', <Building />], ['settings', 'Tarifas', <Settings />],
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
          {view === 'companies' && <Companies />}
          {view === 'settings' && <SettingsTab />}
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981', cancelled: '#e5484d', requested: '#f59e0b',
  accepted: '#3b82f6', arrived: '#3b82f6', in_progress: '#635bff',
};

function fillDaily(daily: any[], days: number) {
  const map = new Map(daily.map((d) => [d.date, d]));
  const out: any[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(today.getDate() - i);
    const key = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD local
    out.push(map.get(key) || { date: key, services: 0, completed: 0, revenue: 0, km: 0 });
  }
  return out;
}
const fmtDay = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

function Dashboard({ onGo }: { onGo: (v: View) => void }) {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  useEffect(() => {
    let alive = true;
    const load = () => api<any>(`/api/admin/analytics?days=${days}`).then((d) => { if (alive) setData(d); }).catch(() => {});
    load(); const iv = setInterval(load, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, [days]);

  if (!data) return <div className="spinner center" />;
  const k = data.kpis;
  const daily = fillDaily(data.daily, data.days);
  const completionRate = k.services_total ? Math.round((k.completed / k.services_total) * 100) : 0;

  const hours = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: data.by_hour.find((x: any) => x.hour === h)?.count || 0 }));
  const week = Array.from({ length: 7 }, (_, d) => ({ label: WEEKDAYS[d], value: data.by_weekday.find((x: any) => x.dow === d)?.count || 0 }));
  const statusSlices = data.by_status.map((s: any) => ({ label: es(s.status), value: s.count, color: STATUS_COLORS[s.status] || '#a1a1aa' }));

  const kpi = (v: string, l: string, icon?: JSX.Element, cls = '') => (
    <div className="kpi"><div className={`kv ${cls}`}>{v}</div><div className="kl">{icon}{l}</div></div>
  );

  return (
    <>
      <div className="between mb">
        <div className="row" style={{ gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} className={`chiptab ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d} días</button>
          ))}
        </div>
        <button className="btn small secondary" onClick={() => onGo('trips')}>📄 Reporte</button>
      </div>

      {/* KPIs de negocio */}
      <div className="kpi-grid">
        {kpi(cl(k.completed), 'Servicios completados', <CheckCircle />, 'go')}
        {kpi(money0(k.revenue_total), 'Ingresos totales', <Route />, 'brand')}
        {kpi(money0(k.revenue_month), 'Ingresos del mes')}
        {kpi(cl(Math.round(k.distance_total)) + ' km', 'Distancia recorrida')}
        {kpi(money0(k.avg_fare), 'Tarifa promedio')}
        {kpi(Math.round(k.avg_duration) + ' min', 'Duración promedio', <Clock />)}
        {kpi(completionRate + '%', 'Tasa de completación')}
        {kpi(k.avg_rating.toFixed(2), 'Calificación promedio', <Star />, 'warn')}
        {kpi(cl(k.active), 'Servicios activos ahora')}
        {kpi(cl(k.drivers_online) + '/' + cl(k.drivers), 'Conductores en línea')}
      </div>

      {/* Tendencia de servicios */}
      <div className="chart-card">
        <div className="chart-head">
          <h4>Servicios por día</h4>
          <div><div className="big">{cl(daily.reduce((s, d) => s + d.services, 0))}</div><div className="sub">últimos {data.days} días</div></div>
        </div>
        <TrendChart data={daily.map((d) => ({ label: d.date, value: d.services }))} color="#635bff" />
        <div className="chart-x"><span>{fmtDay(daily[0].date)}</span><span>{fmtDay(daily[daily.length - 1].date)}</span></div>
      </div>

      {/* Tendencia de ingresos */}
      <div className="chart-card">
        <div className="chart-head">
          <h4>Ingresos por día</h4>
          <div><div className="big">{money0(daily.reduce((s, d) => s + d.revenue, 0))}</div><div className="sub">completados</div></div>
        </div>
        <TrendChart data={daily.map((d) => ({ label: d.date, value: d.revenue }))} color="#10b981" />
        <div className="chart-x"><span>{fmtDay(daily[0].date)}</span><span>{fmtDay(daily[daily.length - 1].date)}</span></div>
      </div>

      {/* Estado de los servicios */}
      <div className="chart-card">
        <div className="chart-head"><h4>Estado de los servicios</h4></div>
        <Donut slices={statusSlices} centerTop={cl(k.services_total)} centerSub="total" />
      </div>

      {/* Horas pico */}
      <div className="chart-card">
        <div className="chart-head"><h4>Demanda por hora</h4><div className="sub">hora del día</div></div>
        <Bars data={hours} color="#635bff" fmt={(n) => `${n} servicios`} />
      </div>

      {/* Día de la semana */}
      <div className="chart-card">
        <div className="chart-head"><h4>Servicios por día de la semana</h4></div>
        <Bars data={week} color="#3b82f6" fmt={(n) => `${n} servicios`} />
      </div>

      {/* Ranking de conductores */}
      <div className="chart-card">
        <div className="chart-head"><h4>Ranking de conductores</h4><div className="sub">por servicios</div></div>
        {data.top_drivers.length === 0 ? <p className="muted">Aún no hay servicios completados.</p> :
          data.top_drivers.map((d: any, i: number) => (
            <div className="rank" key={i}>
              <div className={`pos ${i === 0 ? 'top' : ''}`}>{i + 1}</div>
              <div className="grow">
                <div className="rname">{d.name}</div>
                <div className="rsub">{cl(Math.round(d.km))} km · ⭐ {Number(d.rating).toFixed(1)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="rval tnum">{cl(d.trips)}</div>
                <div className="rsub">{money0(d.revenue)}</div>
              </div>
            </div>
          ))}
      </div>

      {/* Ingresos por empresa cliente */}
      {data.by_company && data.by_company.length > 0 && (
        <div className="chart-card">
          <div className="chart-head"><h4>Ingresos por empresa</h4><div className="sub">facturable</div></div>
          {data.by_company.map((c: any, i: number) => (
            <div className="rank" key={i}>
              <div className={`pos ${i === 0 ? 'top' : ''}`}>{i + 1}</div>
              <div className="grow">
                <div className="rname">{c.name}</div>
                <div className="rsub">{cl(c.services)} servicios · {cl(Math.round(c.km))} km</div>
              </div>
              <div className="rval tnum">{money0(c.revenue)}</div>
            </div>
          ))}
        </div>
      )}
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
  const [drivers, setDrivers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    api<{ users: any[] }>('/api/admin/users?role=driver').then((d) => setDrivers(d.users)).catch(() => {});
    api<{ companies: any[] }>('/api/admin/companies').then((d) => setCompanies(d.companies)).catch(() => {});
  }, []);

  const load = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    if (driverId) qs.set('driver_id', driverId);
    if (companyId) qs.set('company_id', companyId);
    api<{ trips: any[] }>(`/api/admin/trips?${qs.toString()}`).then((d) => setTrips(d.trips)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to, status, driverId, companyId]);

  const completed = trips.filter((t) => t.status === 'completed');
  const totalRevenue = completed.reduce((s, t) => s + (t.fare || 0), 0);
  const totalKm = completed.reduce((s, t) => s + Number(t.distance_km || 0), 0);

  const hasFilter = from || to || status || driverId || companyId;
  const companyName = companies.find((c) => String(c.id) === companyId)?.name;
  const driverName = drivers.find((d) => String(d.id) === driverId)?.name;

  function exportCSV() {
    const head = ['ID', 'Fecha', 'Empresa', 'Pasajero', 'Conductor', 'Patente', 'Origen', 'Destino', 'Km', 'Tarifa', 'Estado'];
    const rows = trips.map((t) => [
      t.id, String(t.requested_at || '').slice(0, 16).replace('T', ' '), t.company_name || '',
      t.passenger_name || '', t.driver_name || '', t.plate || '',
      t.origin_address || '', t.dest_address || '', t.distance_km ?? '', t.fare ?? '', es(t.status),
    ]);
    const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `servicios_${from || 'todo'}_${to || 'hoy'}.csv`;
    a.click();
  }

  return (
    <>
      <div className="filters no-print">
        <div className="f"><label>Desde</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="f"><label>Hasta</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="f"><label>Empresa</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Todas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="f"><label>Conductor</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Todos</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="f"><label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
            <option value="in_progress">En viaje</option>
            <option value="requested">Solicitado</option>
          </select>
        </div>
        {hasFilter && <button className="btn small ghost" onClick={() => { setFrom(''); setTo(''); setStatus(''); setDriverId(''); setCompanyId(''); }}>Limpiar</button>}
        <button className="btn small secondary" onClick={() => window.print()}><Printer /> Imprimir / PDF</button>
        <button className="btn small" onClick={exportCSV}>⬇ CSV</button>
      </div>

      <div className="report-print">
        <div className="print-head">
          <div className="brand" style={{ fontSize: 16 }}><span className="mark"><Logo /></span> Reporte de servicios</div>
          <div className="muted">
            {companyName ? `Empresa: ${companyName} · ` : ''}{driverName ? `Conductor: ${driverName} · ` : ''}
            Período: {from || 'inicio'} a {to || 'hoy'} · Generado {new Date().toLocaleDateString('es-CL')}
          </div>
        </div>

        <div className="report-tot">
          <div className="t">Servicios<b>{cl(trips.length)}</b></div>
          <div className="t">Completados<b>{cl(completed.length)}</b></div>
          <div className="t">Total facturable<b>{money0(totalRevenue)}</b></div>
          <div className="t">Distancia<b>{cl(Math.round(totalKm))} km</b></div>
        </div>

        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>#</th><th>Fecha</th><th>Empresa</th><th>Pasajero</th><th>Conductor</th><th>Patente</th><th>Km</th><th>Tarifa</th><th>Estado</th></tr></thead>
              <tbody>
                {trips.length === 0 ? <tr><td colSpan={9} className="muted center" style={{ padding: 24 }}>Sin servicios en el período.</td></tr> :
                  trips.map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td className="muted">{String(t.requested_at || '').slice(0, 16).replace('T', ' ')}</td>
                      <td>{t.company_name || '—'}</td>
                      <td>{t.passenger_name}</td>
                      <td>{t.driver_name || '—'}</td>
                      <td className="muted">{t.plate || '—'}</td>
                      <td>{t.distance_km ?? '—'}</td>
                      <td className="tnum">{money0(t.fare || 0)}</td>
                      <td><span className={`badge ${t.status}`}>{es(t.status)}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
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
  const [companies, setCompanies] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<any | null>(null);
  const load = () => api<{ users: any[] }>('/api/admin/users').then((d) => setUsers(d.users)).catch(() => {});
  useEffect(() => {
    load();
    api<{ companies: any[] }>('/api/admin/companies').then((d) => setCompanies(d.companies)).catch(() => {});
  }, []);

  async function toggle(id: number) {
    try { await api('/api/admin/toggle_user', { id }); load(); } catch (e: any) { alert(e.message); }
  }
  async function save() {
    if (!edit.name || !edit.email) { alert('Nombre y email son obligatorios'); return; }
    try {
      await api('/api/admin/user_save', {
        id: Number(edit.id) || 0, name: edit.name.trim(), email: edit.email.trim(),
        phone: edit.phone || '', role: edit.role, status: edit.status, password: edit.password || '',
        company_id: edit.role === 'passenger' && edit.company_id ? Number(edit.company_id) : null,
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
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Empresa</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b><br /><span className="muted">{u.phone || ''}</span></td>
                  <td className="muted">{u.email}</td>
                  <td><span className={`badge ${u.role === 'driver' ? 'busy' : u.role === 'admin' ? 'in_progress' : 'completed'}`}>{ROLE_ES[u.role]}</span></td>
                  <td className="muted">{u.company_name || '—'}</td>
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
            {edit.role === 'passenger' && (
              <>
                <label>Empresa cliente <span className="muted">(opcional)</span></label>
                <select value={edit.company_id || ''} onChange={(e) => setEdit({ ...edit, company_id: e.target.value })}>
                  <option value="">Sin empresa (particular)</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
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

// =================== EMPRESAS CLIENTE ===================
const emptyCompany = { id: 0, name: '', rut: '', contact_name: '', contact_email: '', contact_phone: '', address: '', fare_base: '', fare_per_km: '', fare_per_min: '', fare_minimum: '', active: true };

function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const load = () => api<{ companies: any[] }>('/api/admin/companies').then((d) => setCompanies(d.companies)).catch(() => {});
  useEffect(() => { load(); }, []);

  const numOrNull = (v: any) => (v === '' || v == null ? null : Number(v));
  async function save() {
    if (!edit.name || edit.name.length < 2) { alert('El nombre de la empresa es obligatorio'); return; }
    try {
      await api('/api/admin/company_save', {
        id: Number(edit.id) || 0, name: edit.name.trim(), rut: edit.rut, contact_name: edit.contact_name,
        contact_email: edit.contact_email, contact_phone: edit.contact_phone, address: edit.address,
        fare_base: numOrNull(edit.fare_base), fare_per_km: numOrNull(edit.fare_per_km),
        fare_per_min: numOrNull(edit.fare_per_min), fare_minimum: numOrNull(edit.fare_minimum),
        active: edit.active !== false,
      });
      setEdit(null); load();
    } catch (e: any) { alert(e.message); }
  }
  async function del(c: any) {
    if (!confirm(`¿Eliminar la empresa ${c.name}?`)) return;
    try { await api('/api/admin/company_delete', { id: c.id }); load(); } catch (e: any) { alert(e.message); }
  }

  return (
    <>
      <button className="btn small mb" onClick={() => setEdit({ ...emptyCompany })}><Plus /> Nueva empresa</button>
      {companies.length === 0 && <div className="empty"><Building /><p>Aún no hay empresas cliente.<br />Créalas para separar y facturar servicios por contrato.</p></div>}
      {companies.map((c) => (
        <div className="card" key={c.id}>
          <div className="between">
            <div>
              <b>{c.name}</b> {!c.active && <span className="badge inactive">Inactiva</span>}
              {(c.fare_base != null) && <span className="badge accepted" style={{ marginLeft: 6 }}>Tarifa propia</span>}
              <div className="muted" style={{ marginTop: 3 }}>{c.rut ? `RUT ${c.rut} · ` : ''}{c.contact_name || ''}{c.contact_phone ? ' · ' + c.contact_phone : ''}</div>
              <div className="muted">{cl(c.services || 0)} servicios · {money0(c.revenue || 0)} facturado · {cl(c.passengers || 0)} pasajeros</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small secondary" onClick={() => setEdit({ ...c, fare_base: c.fare_base ?? '', fare_per_km: c.fare_per_km ?? '', fare_per_min: c.fare_per_min ?? '', fare_minimum: c.fare_minimum ?? '' })}>Editar</button>
              <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => del(c)} title="Eliminar"><Trash /></button>
            </div>
          </div>
        </div>
      ))}

      {edit && (
        <div className="modal-bg">
          <div className="modal">
            <h3>{edit.id ? 'Editar empresa' : 'Nueva empresa'}</h3>
            <label>Nombre de la empresa</label>
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Empresa S.A." />
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>RUT</label><input value={edit.rut} onChange={(e) => setEdit({ ...edit, rut: e.target.value })} placeholder="76.123.456-7" /></div>
              <div className="grow"><label>Contacto</label><input value={edit.contact_name} onChange={(e) => setEdit({ ...edit, contact_name: e.target.value })} /></div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Email</label><input value={edit.contact_email} onChange={(e) => setEdit({ ...edit, contact_email: e.target.value })} /></div>
              <div className="grow"><label>Teléfono</label><input value={edit.contact_phone} onChange={(e) => setEdit({ ...edit, contact_phone: e.target.value })} /></div>
            </div>
            <label>Dirección</label>
            <input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />

            <div className="seg-title">Tarifa negociada (opcional — en blanco usa la global)</div>
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Base</label><input type="number" value={edit.fare_base} onChange={(e) => setEdit({ ...edit, fare_base: e.target.value })} placeholder="global" /></div>
              <div className="grow"><label>Por km</label><input type="number" value={edit.fare_per_km} onChange={(e) => setEdit({ ...edit, fare_per_km: e.target.value })} placeholder="global" /></div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div className="grow"><label>Por min</label><input type="number" value={edit.fare_per_min} onChange={(e) => setEdit({ ...edit, fare_per_min: e.target.value })} placeholder="global" /></div>
              <div className="grow"><label>Mínima</label><input type="number" value={edit.fare_minimum} onChange={(e) => setEdit({ ...edit, fare_minimum: e.target.value })} placeholder="global" /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Empresa activa
            </label>
            <button className="btn" onClick={save}>Guardar</button>
            <button className="btn ghost small mt" style={{ width: '100%' }} onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

// =================== TARIFAS GLOBALES ===================
function SettingsTab() {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api<{ settings: any }>('/api/admin/settings').then((d) => setS(d.settings)).catch(() => {}); }, []);
  if (!s) return <div className="spinner center" />;

  async function save() {
    try {
      const d = await api<{ settings: any }>('/api/admin/settings_save', {
        fare_base: Number(s.fare_base), fare_per_km: Number(s.fare_per_km),
        fare_per_min: Number(s.fare_per_min), fare_minimum: Number(s.fare_minimum),
      });
      setS(d.settings); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message); }
  }
  const km = 5, min = 12;
  const preview = Math.max(s.fare_minimum, Math.round((s.fare_base + km * s.fare_per_km + min * s.fare_per_min) / 50) * 50);

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h4>Tarifas globales</h4>
      <p className="dim mb">Se aplican a todos los servicios, salvo empresas con tarifa propia.</p>
      <label>Tarifa base (banderazo)</label>
      <input type="number" value={s.fare_base} onChange={(e) => setS({ ...s, fare_base: e.target.value })} />
      <div className="row" style={{ gap: 10 }}>
        <div className="grow"><label>Costo por km</label><input type="number" value={s.fare_per_km} onChange={(e) => setS({ ...s, fare_per_km: e.target.value })} /></div>
        <div className="grow"><label>Costo por minuto</label><input type="number" value={s.fare_per_min} onChange={(e) => setS({ ...s, fare_per_min: e.target.value })} /></div>
      </div>
      <label>Tarifa mínima</label>
      <input type="number" value={s.fare_minimum} onChange={(e) => setS({ ...s, fare_minimum: e.target.value })} />

      <div className="report-tot mt">
        <div className="t">Ejemplo (5 km, 12 min)<b>{money0(preview)}</b></div>
      </div>
      <button className="btn" onClick={save}>{saved ? '✓ Guardado' : 'Guardar tarifas'}</button>
    </div>
  );
}
