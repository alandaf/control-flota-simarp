import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, es, money } from '../lib/api';
import { ChevronLeft, Clock } from '../components/Icons';

export default function History() {
  const nav = useNavigate();
  const [trips, setTrips] = useState<any[] | null>(null);
  useEffect(() => { api<{ trips: any[] }>('/api/trips/history').then((d) => setTrips(d.trips)).catch(() => setTrips([])); }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div className="row" style={{ gap: 10 }}>
          <button className="icon-btn" onClick={() => nav('/passenger')} title="Volver"><ChevronLeft /></button>
          <div className="brand" style={{ fontSize: 15.5 }}>Mis viajes</div>
        </div>
      </div>
      <div className="scroll">
        {trips === null ? <div className="spinner center" /> :
          trips.length === 0 ? <div className="empty"><Clock /><p>Aún no tienes viajes.</p></div> :
          trips.map((t) => (
            <div className="card" key={t.id}>
              <div className="between">
                <span className={`badge ${t.status}`}>{es(t.status)}</span>
                <b className="tnum">{money(t.fare)}</b>
              </div>
              <div className="addr" style={{ margin: '10px 0 4px' }}><span className="adot o" /> {t.origin_address || 'Origen'}</div>
              <div className="addr" style={{ margin: '4px 0' }}><span className="adot d" /> {t.dest_address || 'Destino'}</div>
              <div className="muted mt">
                {String(t.requested_at || '').slice(0, 16).replace('T', ' ')} · {t.distance_km ?? '—'} km · {t.driver_name ? 'Conductor: ' + t.driver_name : 'Sin conductor'}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
