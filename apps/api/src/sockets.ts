import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { query } from './db.js';
import { redis, DRIVERS_GEO } from './redis.js';
import { room } from './events.js';
import type { AuthUser } from './auth.js';

interface SocketUser extends AuthUser {}

export function setupSockets(io: Server, app: FastifyInstance): void {
  // ---- Autenticación por JWT en el handshake ----
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Sin token'));
    try {
      const user = app.jwt.verify(token) as SocketUser;
      (socket.data as any).user = user;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket.data as any).user as SocketUser;
    socket.join(room.user(user.id));
    if (user.role === 'admin') socket.join(room.admins);

    // ---- El conductor entra/sale de disponibilidad ----
    socket.on('driver:online', async (payload: { online: boolean }) => {
      if (user.role !== 'driver') return;
      // No pasar a offline si está en un viaje
      const busy = await query(
        `SELECT 1 FROM trips WHERE driver_id = $1 AND status IN ('accepted','arrived','in_progress')`,
        [user.id]
      );
      const status = busy.length ? 'busy' : payload.online ? 'available' : 'offline';
      await query(`UPDATE drivers SET status = $1 WHERE user_id = $2`, [status, user.id]);
      if (status === 'offline') {
        socket.leave(room.driversOnline);
        await redis.zrem(DRIVERS_GEO, String(user.id));
      } else {
        socket.join(room.driversOnline);
      }
      socket.emit('driver:status', { status });
    });

    // ---- El conductor reporta su ubicación ----
    socket.on('driver:location', async (p: { lat: number; lng: number; heading?: number }) => {
      if (user.role !== 'driver' || !p?.lat || !p?.lng) return;

      // Persistir posición (PostGIS) + índice geoespacial en vivo (Redis GEO)
      await query(
        `UPDATE drivers
         SET location = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
             heading = $3, updated_at = now()
         WHERE user_id = $4`,
        [p.lng, p.lat, p.heading ?? null, user.id]
      );
      redis.geoadd(DRIVERS_GEO, p.lng, p.lat, String(user.id)).catch(() => {});

      // Reenviar a las salas de viaje donde participa el conductor (para el pasajero)
      for (const r of socket.rooms) {
        if (typeof r === 'string' && r.startsWith('trip:')) {
          socket.to(r).emit('driver:location', { lat: p.lat, lng: p.lng, heading: p.heading });
        }
      }
      // Y al panel de administración
      socket.to(room.admins).emit('admin:driver_location', {
        user_id: user.id, lat: p.lat, lng: p.lng, status: 'busy',
      });
    });

    // ---- Unirse a la sala de un viaje (pasajero y conductor) ----
    socket.on('trip:join', (p: { trip_id: number }) => {
      if (p?.trip_id) socket.join(room.trip(p.trip_id));
    });
    socket.on('trip:leave', (p: { trip_id: number }) => {
      if (p?.trip_id) socket.leave(room.trip(p.trip_id));
    });

    // ---- Desconexión: liberar conductor si no está en viaje ----
    socket.on('disconnect', async () => {
      if (user.role !== 'driver') return;
      const busy = await query(
        `SELECT 1 FROM trips WHERE driver_id = $1 AND status IN ('accepted','arrived','in_progress')`,
        [user.id]
      );
      if (!busy.length) {
        await query(`UPDATE drivers SET status = 'offline' WHERE user_id = $1`, [user.id]);
        await redis.zrem(DRIVERS_GEO, String(user.id)).catch(() => {});
      }
    });
  });
}
