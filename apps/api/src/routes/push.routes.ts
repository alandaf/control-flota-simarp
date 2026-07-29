import type { FastifyInstance } from 'fastify';
import { authGuard, type AuthUser } from '../auth.js';
import { env } from '../env.js';
import { saveSubscription, pushEnabled } from '../push.js';

export async function pushRoutes(app: FastifyInstance) {
  // Llave pública VAPID que el navegador necesita para suscribirse
  app.get('/key', { preHandler: authGuard() }, async () => ({
    ok: true, enabled: pushEnabled(), key: env.VAPID_PUBLIC_KEY || '',
  }));

  // Guarda la suscripción del dispositivo del usuario
  app.post('/subscribe', { preHandler: authGuard() }, async (req, reply) => {
    const u = req.user as AuthUser;
    const b = req.body as any;
    if (!b?.endpoint || !b?.keys?.p256dh || !b?.keys?.auth) {
      return reply.code(400).send({ ok: false, error: 'Suscripción inválida' });
    }
    await saveSubscription(u.id, b);
    return { ok: true };
  });
}
