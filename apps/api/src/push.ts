import webpush from 'web-push';
import { env } from './env.js';
import { query } from './db.js';

// Web Push: activo solo si hay llaves VAPID configuradas (si no, no hace nada).
let enabled = false;
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    enabled = true;
    console.log('[push] Web Push activo');
  } catch (e) {
    console.warn('[push] llaves VAPID inválidas, push desactivado');
  }
} else {
  console.log('[push] sin llaves VAPID, notificaciones push desactivadas');
}

export const pushEnabled = (): boolean => enabled;

interface SubJSON { endpoint: string; keys: { p256dh: string; auth: string } }

export async function saveSubscription(userId: number, sub: SubJSON): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
  );
}

export interface PushPayload { title: string; body: string; url?: string; tag?: string }

/** Envía una notificación a todos los dispositivos de un usuario. Limpia suscripciones muertas. */
export async function sendToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!enabled) return;
  const subs = await query<any>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId]
  );
  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
    } catch (e: any) {
      // 404/410 = suscripción caducada -> se elimina
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await query(`DELETE FROM push_subscriptions WHERE id = $1`, [s.id]).catch(() => {});
      }
    }
  }));
}

/** Envía una notificación a todos los conductores disponibles (con app en línea o no). */
export async function sendToAvailableDrivers(payload: PushPayload): Promise<void> {
  if (!enabled) return;
  const rows = await query<{ user_id: number }>(
    `SELECT user_id FROM drivers WHERE status = 'available'`
  );
  await Promise.all(rows.map((r) => sendToUser(r.user_id, payload)));
}
