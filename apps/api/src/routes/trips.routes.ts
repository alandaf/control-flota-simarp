import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../db.js';
import { authGuard, type AuthUser } from '../auth.js';
import { estimateFare } from '../fare.js';
import { getRoute } from '../routing.js';
import { emitTo, room } from '../events.js';
import { env } from '../env.js';

const point = { lat: z.number(), lng: z.number() };

const estimateSchema = z.object({
  origin_lat: z.number(), origin_lng: z.number(),
  dest_lat: z.number(), dest_lng: z.number(),
});
const requestSchema = estimateSchema.extend({
  origin_address: z.string().optional().default(''),
  dest_address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// SELECT que expone lat/lng desde las columnas GEOGRAPHY
const TRIP_SELECT = `
  t.id, t.passenger_id, t.driver_id, t.status, t.distance_km, t.fare, t.notes,
  t.origin_address, t.dest_address,
  ST_Y(t.origin::geometry)      AS origin_lat,  ST_X(t.origin::geometry)      AS origin_lng,
  ST_Y(t.destination::geometry) AS dest_lat,    ST_X(t.destination::geometry) AS dest_lng,
  t.requested_at, t.accepted_at, t.started_at, t.completed_at`;

export async function tripRoutes(app: FastifyInstance) {
  // ---- Estimar tarifa (con ruta real por calle) ----
  app.post('/estimate', { preHandler: authGuard() }, async (req, reply) => {
    const p = estimateSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Coordenadas inválidas' });
    const { origin_lat, origin_lng, dest_lat, dest_lng } = p.data;
    const route = await getRoute(origin_lat, origin_lng, dest_lat, dest_lng);
    return {
      ok: true,
      distance_km: route.distanceKm,
      minutes: route.durationMin,
      fare: estimateFare(route.distanceKm, route.durationMin),
      geometry: route.geometry,
      routed: route.source === 'osrm',
    };
  });

  // ---- Geometría de la ruta más corta entre dos puntos ----
  // Con { steps: true } incluye las maniobras giro a giro (navegación).
  app.post('/route', { preHandler: authGuard() }, async (req, reply) => {
    const p = estimateSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Coordenadas inválidas' });
    const { origin_lat, origin_lng, dest_lat, dest_lng } = p.data;
    const withSteps = Boolean((req.body as any)?.steps);
    const route = await getRoute(origin_lat, origin_lng, dest_lat, dest_lng, withSteps);
    return {
      ok: true,
      geometry: route.geometry,
      distance_km: route.distanceKm,
      minutes: route.durationMin,
      routed: route.source === 'osrm',
      steps: route.steps ?? [],
    };
  });

  // ---- Solicitar viaje (pasajero) ----
  app.post('/request', { preHandler: authGuard('passenger') }, async (req, reply) => {
    const p = requestSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const user = req.user as AuthUser;
    const d = p.data;

    const active = await one(
      `SELECT id FROM trips WHERE passenger_id = $1
       AND status IN ('requested','accepted','arrived','in_progress')`,
      [user.id]
    );
    if (active) return reply.code(409).send({ ok: false, error: 'Ya tienes un viaje en curso' });

    const route = await getRoute(d.origin_lat, d.origin_lng, d.dest_lat, d.dest_lng);
    const km = route.distanceKm;
    const fare = estimateFare(km, route.durationMin);

    const trip = await one<any>(
      `INSERT INTO trips
         (passenger_id, origin, destination, origin_address, dest_address, distance_km, fare, notes, status)
       VALUES ($1,
         ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
         ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,
         $6, $7, $8, $9, $10, 'requested')
       RETURNING id`,
      [user.id, d.origin_lng, d.origin_lat, d.dest_lng, d.dest_lat,
       d.origin_address, d.dest_address, km, fare, d.notes]
    );

    // Notificar a conductores conectados (los cercanos verán la solicitud primero)
    emitTo(room.driversOnline, 'trip:new', {
      id: trip!.id, origin_lat: d.origin_lat, origin_lng: d.origin_lng,
      dest_lat: d.dest_lat, dest_lng: d.dest_lng,
      origin_address: d.origin_address, dest_address: d.dest_address,
      distance_km: km, fare, passenger_name: user.name,
    });
    emitTo(room.admins, 'admin:refresh', { reason: 'trip:new' });

    return { ok: true, trip_id: trip!.id, fare, distance_km: km };
  });

  // ---- Viaje activo del pasajero (con conductor y su ubicación) ----
  app.get('/active', { preHandler: authGuard('passenger') }, async (req) => {
    const user = req.user as AuthUser;
    const trip = await one<any>(
      `SELECT ${TRIP_SELECT},
        u.name AS driver_name, u.phone AS driver_phone,
        d.rating_avg AS driver_rating,
        ST_Y(d.location::geometry) AS driver_lat, ST_X(d.location::geometry) AS driver_lng,
        v.plate, v.brand, v.model, v.color
      FROM trips t
      LEFT JOIN users u   ON u.id = t.driver_id
      LEFT JOIN drivers d ON d.user_id = t.driver_id
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE t.passenger_id = $1
        AND t.status IN ('requested','accepted','arrived','in_progress')
      ORDER BY t.id DESC LIMIT 1`,
      [user.id]
    );
    return { ok: true, trip };
  });

  // ---- Cancelar (pasajero) ----
  app.post('/cancel', { preHandler: authGuard('passenger') }, async (req, reply) => {
    const user = req.user as AuthUser;
    const tripId = Number((req.body as any)?.trip_id ?? 0);
    const trip = await one<any>('SELECT * FROM trips WHERE id = $1 AND passenger_id = $2', [tripId, user.id]);
    if (!trip) return reply.code(404).send({ ok: false, error: 'Viaje no encontrado' });
    if (['completed', 'cancelled'].includes(trip.status))
      return reply.code(400).send({ ok: false, error: 'El viaje ya finalizó' });

    await query(`UPDATE trips SET status = 'cancelled' WHERE id = $1`, [tripId]);
    if (trip.driver_id) {
      await query(`UPDATE drivers SET status = 'available' WHERE user_id = $1`, [trip.driver_id]);
      emitTo(room.user(trip.driver_id), 'trip:update', { trip_id: tripId, status: 'cancelled' });
    }
    emitTo(room.admins, 'admin:refresh', { reason: 'trip:cancel' });
    return { ok: true };
  });

  // ---- Historial (pasajero) ----
  app.get('/history', { preHandler: authGuard('passenger') }, async (req) => {
    const user = req.user as AuthUser;
    const trips = await query(
      `SELECT ${TRIP_SELECT}, u.name AS driver_name
       FROM trips t LEFT JOIN users u ON u.id = t.driver_id
       WHERE t.passenger_id = $1 ORDER BY t.id DESC LIMIT 30`,
      [user.id]
    );
    return { ok: true, trips };
  });

  // ---- Calificar ----
  app.post('/rate', { preHandler: authGuard() }, async (req, reply) => {
    const user = req.user as AuthUser;
    const b = req.body as any;
    const tripId = Number(b?.trip_id ?? 0);
    const score = Math.max(1, Math.min(5, Number(b?.score ?? 5)));
    const trip = await one<any>(`SELECT * FROM trips WHERE id = $1 AND status = 'completed'`, [tripId]);
    if (!trip) return reply.code(404).send({ ok: false, error: 'Viaje no válido' });

    const to = user.id === trip.passenger_id ? trip.driver_id : trip.passenger_id;
    if (!to) return reply.code(400).send({ ok: false, error: 'No hay a quién calificar' });

    await query(
      `INSERT INTO ratings (trip_id, from_user_id, to_user_id, score, comment) VALUES ($1,$2,$3,$4,$5)`,
      [tripId, user.id, to, score, String(b?.comment ?? '')]
    );
    if (to === trip.driver_id) {
      const avg = await one<{ avg: number }>(
        `SELECT AVG(score)::numeric(3,2) AS avg FROM ratings WHERE to_user_id = $1`, [to]
      );
      await query(`UPDATE drivers SET rating_avg = $1 WHERE user_id = $2`, [avg?.avg ?? 5, to]);
    }
    return { ok: true };
  });

  // ================= CONDUCTOR =================

  // ---- Viajes pendientes cercanos (PostGIS) ----
  app.get('/pending', { preHandler: authGuard('driver') }, async (req) => {
    const user = req.user as AuthUser;
    const trips = await query(
      `SELECT ${TRIP_SELECT}, u.name AS passenger_name,
        ROUND((ST_Distance(t.origin, d.location) / 1000)::numeric, 2) AS pickup_km
      FROM trips t
      JOIN users u ON u.id = t.passenger_id
      JOIN drivers d ON d.user_id = $1
      WHERE t.status = 'requested'
        AND (d.location IS NULL OR ST_DWithin(t.origin, d.location, $2))
      ORDER BY pickup_km NULLS LAST, t.requested_at ASC
      LIMIT 20`,
      [user.id, env.SEARCH_RADIUS_M]
    );
    return { ok: true, trips };
  });

  // ---- Aceptar (conductor) — atómico ----
  app.post('/accept', { preHandler: authGuard('driver') }, async (req, reply) => {
    const user = req.user as AuthUser;
    const tripId = Number((req.body as any)?.trip_id ?? 0);

    const busy = await one(
      `SELECT id FROM trips WHERE driver_id = $1 AND status IN ('accepted','arrived','in_progress')`,
      [user.id]
    );
    if (busy) return reply.code(409).send({ ok: false, error: 'Ya tienes un viaje asignado' });

    const updated = await one<any>(
      `UPDATE trips SET driver_id = $1, status = 'accepted', accepted_at = now()
       WHERE id = $2 AND status = 'requested' RETURNING passenger_id`,
      [user.id, tripId]
    );
    if (!updated) return reply.code(409).send({ ok: false, error: 'El viaje ya no está disponible' });

    await query(`UPDATE drivers SET status = 'busy' WHERE user_id = $1`, [user.id]);
    emitTo(room.user(updated.passenger_id), 'trip:update', { trip_id: tripId, status: 'accepted' });
    emitTo(room.admins, 'admin:refresh', { reason: 'trip:accept' });
    return { ok: true, trip_id: tripId };
  });

  // ---- Cambiar estado (conductor) ----
  app.post('/status', { preHandler: authGuard('driver') }, async (req, reply) => {
    const user = req.user as AuthUser;
    const b = req.body as any;
    const tripId = Number(b?.trip_id ?? 0);
    const next = String(b?.status ?? '');
    if (!['arrived', 'in_progress', 'completed', 'cancelled'].includes(next))
      return reply.code(400).send({ ok: false, error: 'Estado inválido' });

    const trip = await one<any>('SELECT * FROM trips WHERE id = $1 AND driver_id = $2', [tripId, user.id]);
    if (!trip) return reply.code(404).send({ ok: false, error: 'Viaje no encontrado' });

    const stamp =
      next === 'in_progress' ? ', started_at = now()' :
      next === 'completed' ? ', completed_at = now()' : '';
    await query(`UPDATE trips SET status = $1 ${stamp} WHERE id = $2`, [next, tripId]);

    if (['completed', 'cancelled'].includes(next)) {
      await query(
        `UPDATE drivers SET status = 'available', trips_count = trips_count + $1 WHERE user_id = $2`,
        [next === 'completed' ? 1 : 0, user.id]
      );
    }
    emitTo(room.user(trip.passenger_id), 'trip:update', { trip_id: tripId, status: next });
    emitTo(room.admins, 'admin:refresh', { reason: 'trip:status' });
    return { ok: true, status: next };
  });

  // ---- Viaje actual (conductor) ----
  app.get('/current', { preHandler: authGuard('driver') }, async (req) => {
    const user = req.user as AuthUser;
    const trip = await one<any>(
      `SELECT ${TRIP_SELECT}, u.name AS passenger_name, u.phone AS passenger_phone
       FROM trips t JOIN users u ON u.id = t.passenger_id
       WHERE t.driver_id = $1 AND t.status IN ('accepted','arrived','in_progress')
       ORDER BY t.id DESC LIMIT 1`,
      [user.id]
    );
    return { ok: true, trip };
  });
}
