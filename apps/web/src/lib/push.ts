import { api } from './api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

/**
 * Pide permiso y registra la suscripción push del dispositivo.
 * Debe llamarse desde un gesto del usuario (click). Devuelve un estado.
 */
export async function enablePush(): Promise<'ok' | 'denied' | 'unsupported' | 'disabled' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  try {
    const { enabled, key } = await api<{ enabled: boolean; key: string }>('/api/push/key');
    if (!enabled || !key) return 'disabled';

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    }
    await api('/api/push/subscribe', sub.toJSON());
    return 'ok';
  } catch {
    return 'error';
  }
}
