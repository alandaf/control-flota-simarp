import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { env } from './env.js';
import { waitForDb, migrate, pool } from './db.js';
import { pubClient, subClient } from './redis.js';
import { seed } from './seed.js';
import { loadSettings } from './tariffs.js';
import { setIo } from './events.js';
import { setupSockets } from './sockets.js';
import { authRoutes } from './routes/auth.routes.js';
import { tripRoutes } from './routes/trips.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { geoRoutes } from './routes/geo.routes.js';

const originList = env.CORS_ORIGIN.split(',').map((s) => s.trim());
// '*' => reflejar cualquier origen (útil para túneles / IP de red en pruebas)
const origins = originList.includes('*') ? true : originList;

async function main() {
  const app = Fastify({ logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' } });

  await app.register(cors, { origin: origins, credentials: true });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/health', async () => ({ ok: true, service: 'control-flota-api' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(tripRoutes, { prefix: '/api/trips' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(geoRoutes, { prefix: '/api/geo' });

  // Preparar base de datos
  await waitForDb();
  await migrate();
  await seed();
  await loadSettings();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`API escuchando en :${env.PORT}`);

  // Socket.IO sobre el mismo servidor HTTP, escalable con Redis
  const io = new Server(app.server, {
    cors: { origin: origins, credentials: true },
    path: '/socket.io',
  });
  io.adapter(createAdapter(pubClient, subClient));
  setIo(io);
  setupSockets(io, app);
  app.log.info('Socket.IO listo');

  // Apagado limpio
  const shutdown = async () => {
    app.log.info('Cerrando...');
    await io.close();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fallo al iniciar la API:', err);
  process.exit(1);
});
