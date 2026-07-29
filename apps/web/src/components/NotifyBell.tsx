import { useEffect, useState } from 'react';
import { Bell } from './Icons';
import { enablePush, pushSupported, pushPermission } from '../lib/push';

// Botón para activar notificaciones push. Se oculta si el navegador no las
// soporta. Muestra el estado y pide permiso al tocar (requiere gesto del usuario).
export default function NotifyBell() {
  const [state, setState] = useState<'idle' | 'on' | 'blocked' | 'busy'>('idle');

  useEffect(() => {
    if (!pushSupported()) return;
    if (pushPermission() === 'granted') setState('on');
    else if (pushPermission() === 'denied') setState('blocked');
  }, []);

  if (!pushSupported()) return null;

  async function activate() {
    setState('busy');
    const r = await enablePush();
    if (r === 'ok') setState('on');
    else if (r === 'denied') { setState('blocked'); alert('Permiso de notificaciones denegado. Actívalo en los ajustes del navegador.'); }
    else if (r === 'disabled') { setState('idle'); alert('Las notificaciones aún no están configuradas en el servidor.'); }
    else if (r === 'unsupported') setState('idle');
    else { setState('idle'); alert('No se pudo activar. En iPhone, primero instala la app en la pantalla de inicio.'); }
  }

  const title =
    state === 'on' ? 'Notificaciones activas'
    : state === 'blocked' ? 'Notificaciones bloqueadas (actívalas en el navegador)'
    : 'Activar notificaciones';

  return (
    <button
      className="icon-btn"
      onClick={state === 'on' || state === 'busy' ? undefined : activate}
      title={title}
      style={state === 'on' ? { color: 'var(--go)' } : state === 'blocked' ? { color: 'var(--muted)' } : undefined}
      aria-label={title}
    >
      <Bell />
    </button>
  );
}
