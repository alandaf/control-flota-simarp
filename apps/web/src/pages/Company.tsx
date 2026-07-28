import { useEffect, useState } from 'react';
import { api, es } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo, LogOut, Receipt, Printer } from '../components/Icons';

const cl = (n: number) => Number(n || 0).toLocaleString('es-CL');
const money0 = (n: number) => '$' + cl(Math.round(n || 0));
const esBilling = (s: string) => (s === 'paid' ? 'Pagado' : s === 'void' ? 'Anulado' : 'Pendiente');

export default function Company() {
  const { user, logout } = useAuth();
  const [company, setCompany] = useState<string | null>(null);
  const [totals, setTotals] = useState<any>({ services: 0, total: 0, paid: 0, pending: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const s = qs.toString();
    api<{ company: string | null; totals: any }>(`/api/company/summary?${s}`)
      .then((d) => { setCompany(d.company); setTotals(d.totals); }).catch(() => {});
    api<{ trips: any[] }>(`/api/company/trips?${s}`).then((d) => setTrips(d.trips)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  function exportCSV() {
    const head = ['Folio', 'Fecha', 'Pasajero', 'Origen', 'Destino', 'Km', 'Tarifa', 'Estado', 'Facturación'];
    const rows = trips.map((t) => [
      t.folio ?? '', String(t.requested_at || '').slice(0, 16).replace('T', ' '),
      t.passenger_name || '', t.origin_address || '', t.dest_address || '',
      t.distance_km ?? '', t.fare ?? '', es(t.status),
      t.status === 'completed' ? esBilling(t.billing_status) : '',
    ]);
    const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `mis_servicios_${from || 'todo'}_${to || 'hoy'}.csv`;
    a.click();
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="mark"><Logo /></span> Control Flota</div>
        <div className="topbar-actions">
          <span className="who">{company || user?.name}</span>
          <button className="icon-btn" onClick={logout} title="Salir"><LogOut /></button>
        </div>
      </div>

      <div className="scroll">
        <div className="between mb">
          <h3 className="row" style={{ gap: 8, alignItems: 'center', margin: 0 }}><Receipt /> Mis servicios{company ? ` · ${company}` : ''}</h3>
        </div>

        {!company && (
          <div className="card"><p className="muted center" style={{ padding: 16 }}>
            Tu usuario aún no tiene una empresa asignada. Contacta al administrador.
          </p></div>
        )}

        <div className="filters no-print">
          <div className="f"><label>Desde</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="f"><label>Hasta</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {(from || to) && <button className="btn small ghost" onClick={() => { setFrom(''); setTo(''); }}>Limpiar</button>}
          <button className="btn small secondary" onClick={() => window.print()}><Printer /> Imprimir / PDF</button>
          <button className="btn small" onClick={exportCSV}>⬇ CSV</button>
        </div>

        <div className="report-print">
          <div className="print-head">
            <div className="brand" style={{ fontSize: 16 }}><span className="mark"><Logo /></span> {company || 'Mis servicios'}</div>
            <div className="muted">Período: {from || 'inicio'} a {to || 'hoy'} · Generado {new Date().toLocaleDateString('es-CL')}</div>
          </div>

          <div className="report-tot">
            <div className="t">Servicios<b>{cl(totals.services)}</b></div>
            <div className="t">Total<b>{money0(totals.total)}</b></div>
            <div className="t">Pagado<b>{money0(totals.paid)}</b></div>
            <div className="t">Pendiente<b style={{ color: totals.pending > 0 ? 'var(--warn)' : undefined }}>{money0(totals.pending)}</b></div>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Folio</th><th>Fecha</th><th>Pasajero</th><th>Origen</th><th>Destino</th><th>Km</th><th>Tarifa</th><th>Estado</th><th>Facturación</th></tr></thead>
                <tbody>
                  {trips.length === 0 ? <tr><td colSpan={9} className="muted center" style={{ padding: 24 }}>Sin servicios en el período.</td></tr> :
                    trips.map((t) => (
                      <tr key={t.id}>
                        <td className="tnum">{t.folio ? String(t.folio).padStart(5, '0') : '—'}</td>
                        <td className="muted">{String(t.requested_at || '').slice(0, 16).replace('T', ' ')}</td>
                        <td>{t.passenger_name}</td>
                        <td className="muted">{t.origin_address || '—'}</td>
                        <td className="muted">{t.dest_address || '—'}</td>
                        <td>{t.distance_km ?? '—'}</td>
                        <td className="tnum">{money0(t.fare || 0)}</td>
                        <td><span className={`badge ${t.status}`}>{es(t.status)}</span></td>
                        <td>{t.status === 'completed'
                          ? <span className={`badge ${t.billing_status === 'paid' ? 'completed' : 'requested'}`}>{esBilling(t.billing_status)}</span>
                          : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
