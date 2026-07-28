import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../db.js';
import { authGuard, hashPassword, type AuthUser } from '../auth.js';
import { allSettings, loadSettings } from '../tariffs.js';
import { redis, NAV_OFFROUTE } from '../redis.js';

export async function adminRoutes(app: FastifyInstance) {
  // Todas las rutas requieren rol admin
  app.addHook('preHandler', authGuard('admin'));

  // ---- Indicadores ----
  app.get('/stats', async () => {
    const s = await one<any>(`
      SELECT
        (SELECT COUNT(*) FROM trips WHERE requested_at::date = CURRENT_DATE) AS trips_today,
        (SELECT COUNT(*) FROM trips WHERE status IN ('requested','accepted','arrived','in_progress')) AS trips_active,
        (SELECT COUNT(*) FROM trips) AS trips_total,
        (SELECT COUNT(*) FROM drivers WHERE status IN ('available','busy')) AS drivers_online,
        (SELECT COUNT(*) FROM users WHERE role = 'driver') AS drivers_total,
        (SELECT COUNT(*) FROM users WHERE role = 'passenger') AS passengers,
        (SELECT COUNT(*) FROM vehicles) AS vehicles,
        (SELECT COALESCE(SUM(fare),0) FROM trips WHERE status = 'completed' AND completed_at::date = CURRENT_DATE) AS revenue_today
    `);
    // pg devuelve COUNT como string (bigint): normalizamos a número
    const stats = Object.fromEntries(Object.entries(s ?? {}).map(([k, v]) => [k, Number(v)]));
    return { ok: true, stats };
  });

  // ---- Analítica de negocio (KPIs, series, distribuciones) ----
  app.get('/analytics', async (req) => {
    const days = Math.min(90, Math.max(7, Number((req.query as any)?.days ?? 30)));
    const TZ = 'America/Santiago';

    const kpis = await one<any>(`
      SELECT
        (SELECT COUNT(*) FROM trips)::int AS services_total,
        (SELECT COUNT(*) FROM trips WHERE status='completed')::int AS completed,
        (SELECT COUNT(*) FROM trips WHERE status='cancelled')::int AS cancelled,
        (SELECT COUNT(*) FROM trips WHERE status IN ('requested','accepted','arrived','in_progress'))::int AS active,
        (SELECT COALESCE(SUM(fare),0) FROM trips WHERE status='completed')::numeric AS revenue_total,
        (SELECT COALESCE(SUM(fare),0) FROM trips WHERE status='completed'
           AND (completed_at AT TIME ZONE '${TZ}') >= date_trunc('month', now() AT TIME ZONE '${TZ}'))::numeric AS revenue_month,
        (SELECT COALESCE(SUM(distance_km),0) FROM trips WHERE status='completed')::numeric AS distance_total,
        (SELECT COALESCE(AVG(fare),0) FROM trips WHERE status='completed')::numeric AS avg_fare,
        (SELECT COALESCE(AVG(distance_km),0) FROM trips WHERE status='completed')::numeric AS avg_distance,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at-started_at))/60),0) FROM trips
           WHERE status='completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL)::numeric AS avg_duration,
        (SELECT COUNT(*) FROM users WHERE role='passenger')::int AS passengers,
        (SELECT COUNT(*) FROM users WHERE role='driver')::int AS drivers,
        (SELECT COUNT(*) FROM drivers WHERE status IN ('available','busy'))::int AS drivers_online,
        (SELECT COUNT(*) FROM vehicles)::int AS vehicles,
        (SELECT COALESCE(AVG(rating_avg),0) FROM drivers)::numeric AS avg_rating
    `);

    const daily = await query(`
      SELECT (requested_at AT TIME ZONE '${TZ}')::date::text AS date,
        COUNT(*)::int AS services,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COALESCE(SUM(fare) FILTER (WHERE status='completed'),0)::numeric AS revenue,
        COALESCE(SUM(distance_km) FILTER (WHERE status='completed'),0)::numeric AS km
      FROM trips
      WHERE requested_at >= now() - make_interval(days => $1)
      GROUP BY 1 ORDER BY 1`, [days]);

    const byStatus = await query(`SELECT status, COUNT(*)::int AS count FROM trips GROUP BY status`);
    const byHour = await query(`
      SELECT EXTRACT(hour FROM (requested_at AT TIME ZONE '${TZ}'))::int AS hour, COUNT(*)::int AS count
      FROM trips GROUP BY 1 ORDER BY 1`);
    const byWeekday = await query(`
      SELECT EXTRACT(dow FROM (requested_at AT TIME ZONE '${TZ}'))::int AS dow, COUNT(*)::int AS count
      FROM trips GROUP BY 1 ORDER BY 1`);
    const topDrivers = await query(`
      SELECT u.name,
        COUNT(*)::int AS trips,
        COALESCE(SUM(t.fare),0)::numeric AS revenue,
        COALESCE(SUM(t.distance_km),0)::numeric AS km,
        COALESCE(d.rating_avg,5)::numeric AS rating
      FROM trips t JOIN users u ON u.id=t.driver_id LEFT JOIN drivers d ON d.user_id=u.id
      WHERE t.status='completed'
      GROUP BY u.id, u.name, d.rating_avg
      ORDER BY trips DESC LIMIT 8`);

    const byCompany = await query(`
      SELECT co.name,
        COUNT(*)::int AS services,
        COALESCE(SUM(t.fare),0)::numeric AS revenue,
        COALESCE(SUM(t.distance_km),0)::numeric AS km
      FROM trips t JOIN companies co ON co.id = t.company_id
      WHERE t.status='completed'
      GROUP BY co.id, co.name ORDER BY revenue DESC LIMIT 8`);

    // pg ya entrega números (casts ::int / ::numeric) y textos como texto.
    return {
      ok: true,
      days,
      kpis,
      daily,
      by_status: byStatus,
      by_hour: byHour,
      by_weekday: byWeekday,
      top_drivers: topDrivers,
      by_company: byCompany,
    };
  });

  // ---- Conductores para el mapa en vivo ----
  app.get('/drivers_map', async () => {
    const drivers = await query(`
      SELECT u.id AS user_id, u.name, u.phone, d.status,
        ST_Y(d.location::geometry) AS lat, ST_X(d.location::geometry) AS lng,
        d.rating_avg, d.trips_count, d.vehicle_id,
        v.plate, v.brand, v.model
      FROM users u
      JOIN drivers d ON d.user_id = u.id
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE u.role = 'driver'`);
    return { ok: true, drivers };
  });

  // ---- Usuarios ----
  app.get('/users', async (req) => {
    const role = (req.query as any)?.role;
    const roles = ['passenger', 'driver', 'admin'];
    const where = roles.includes(role) ? 'WHERE u.role = $1' : '';
    const params = roles.includes(role) ? [role] : [];
    const users = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
        u.company_id, c.name AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       ${where} ORDER BY u.id DESC`,
      params
    );
    return { ok: true, users };
  });

  app.post('/toggle_user', async (req) => {
    const id = Number((req.body as any)?.id ?? 0);
    await query(
      `UPDATE users SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END
       WHERE id = $1 AND role <> 'admin'`, [id]
    );
    return { ok: true };
  });

  // ---- Crear / editar usuario ----
  const userSchema = z.object({
    id: z.number().optional().default(0),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().default(''),
    role: z.enum(['passenger', 'driver', 'admin', 'company']),
    status: z.enum(['active', 'inactive']).optional().default('active'),
    password: z.string().optional().default(''),
    company_id: z.number().nullable().optional(),
  });

  app.post('/user_save', async (req, reply) => {
    const p = userSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const u = p.data;
    const email = u.email.toLowerCase();

    const dup = await one('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, u.id]);
    if (dup) return reply.code(409).send({ ok: false, error: 'Ese email ya está en uso' });

    // Empresa aplica a pasajeros (opcional) y a usuarios de portal 'company' (obligatoria)
    const companyId = (u.role === 'passenger' || u.role === 'company') ? (u.company_id ?? null) : null;
    if (u.role === 'company' && !companyId)
      return reply.code(400).send({ ok: false, error: 'Un usuario de empresa debe tener una empresa asignada' });
    let userId = u.id;
    if (u.id > 0) {
      // Editar
      if (u.password) {
        if (u.password.length < 6) return reply.code(400).send({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' });
        const hash = await hashPassword(u.password);
        await query('UPDATE users SET name=$1,email=$2,phone=$3,role=$4,status=$5,company_id=$6,password_hash=$7 WHERE id=$8',
          [u.name, email, u.phone, u.role, u.status, companyId, hash, u.id]);
      } else {
        await query('UPDATE users SET name=$1,email=$2,phone=$3,role=$4,status=$5,company_id=$6 WHERE id=$7',
          [u.name, email, u.phone, u.role, u.status, companyId, u.id]);
      }
    } else {
      // Crear
      if (!u.password || u.password.length < 6) return reply.code(400).send({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' });
      const hash = await hashPassword(u.password);
      const row = await one<{ id: number }>(
        'INSERT INTO users (name,email,phone,password_hash,role,status,company_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [u.name, email, u.phone, hash, u.role, u.status, companyId]);
      userId = row!.id;
    }
    // Si es conductor, asegurar su ficha
    if (u.role === 'driver') {
      await query(`INSERT INTO drivers (user_id, status) VALUES ($1,'offline') ON CONFLICT (user_id) DO NOTHING`, [userId]);
    }
    return { ok: true, id: userId };
  });

  // ---- Eliminar usuario ----
  app.post('/user_delete', async (req, reply) => {
    const me = req.user as AuthUser;
    const id = Number((req.body as any)?.id ?? 0);
    if (id === me.id) return reply.code(400).send({ ok: false, error: 'No puedes eliminar tu propia cuenta' });
    await query('DELETE FROM users WHERE id = $1', [id]);
    return { ok: true };
  });

  // ================= TARIFAS (settings) =================
  app.get('/settings', async () => ({ ok: true, settings: allSettings() }));

  app.post('/settings_save', async (req, reply) => {
    const b = req.body as any;
    const keys = ['fare_base', 'fare_per_km', 'fare_per_min', 'fare_minimum'];
    for (const k of keys) {
      const v = Math.max(0, Math.round(Number(b?.[k] ?? 0)));
      if (!Number.isFinite(v)) return reply.code(400).send({ ok: false, error: 'Valores inválidos' });
      await query(`INSERT INTO settings (key,value) VALUES ($1,$2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [k, String(v)]);
    }
    await loadSettings();
    return { ok: true, settings: allSettings() };
  });

  // ================= EMPRESAS CLIENTE =================
  app.get('/companies', async () => {
    const companies = await query(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS passengers,
        (SELECT COUNT(*)::int FROM trips t WHERE t.company_id = c.id AND t.status='completed') AS services,
        (SELECT COALESCE(SUM(t.fare),0)::numeric FROM trips t WHERE t.company_id = c.id AND t.status='completed') AS revenue
      FROM companies c ORDER BY c.name`);
    return { ok: true, companies };
  });

  const companySchema = z.object({
    id: z.number().optional().default(0),
    name: z.string().min(2),
    rut: z.string().optional().default(''),
    contact_name: z.string().optional().default(''),
    contact_email: z.string().optional().default(''),
    contact_phone: z.string().optional().default(''),
    address: z.string().optional().default(''),
    fare_base: z.number().nullable().optional(),
    fare_per_km: z.number().nullable().optional(),
    fare_per_min: z.number().nullable().optional(),
    fare_minimum: z.number().nullable().optional(),
    active: z.boolean().optional().default(true),
  });

  app.post('/company_save', async (req, reply) => {
    const p = companySchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const c = p.data;
    const vals = [c.name, c.rut, c.contact_name, c.contact_email, c.contact_phone, c.address,
      c.fare_base ?? null, c.fare_per_km ?? null, c.fare_per_min ?? null, c.fare_minimum ?? null, c.active];
    if (c.id > 0) {
      await query(`UPDATE companies SET name=$1,rut=$2,contact_name=$3,contact_email=$4,contact_phone=$5,
        address=$6,fare_base=$7,fare_per_km=$8,fare_per_min=$9,fare_minimum=$10,active=$11 WHERE id=$12`, [...vals, c.id]);
      return { ok: true, id: c.id };
    }
    const row = await one<{ id: number }>(`INSERT INTO companies
      (name,rut,contact_name,contact_email,contact_phone,address,fare_base,fare_per_km,fare_per_min,fare_minimum,active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, vals);
    return { ok: true, id: row!.id };
  });

  app.post('/company_delete', async (req) => {
    await query('DELETE FROM companies WHERE id = $1', [Number((req.body as any)?.id ?? 0)]);
    return { ok: true };
  });

  // ---- Vehículos ----
  app.get('/vehicles', async () => {
    const vehicles = await query(`
      SELECT v.*, u.name AS driver_name, u.id AS driver_user_id
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id
      LEFT JOIN users u ON u.id = d.user_id
      ORDER BY v.id DESC`);
    return { ok: true, vehicles };
  });

  const vehicleSchema = z.object({
    id: z.number().optional().default(0),
    plate: z.string().min(1),
    brand: z.string().min(1),
    model: z.string().min(1),
    color: z.string().optional().default(''),
    year: z.number().nullable().optional(),
    capacity: z.number().optional().default(4),
    status: z.enum(['available', 'in_use', 'maintenance']).optional().default('available'),
  });

  app.post('/vehicle_save', async (req, reply) => {
    const p = vehicleSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const v = p.data;
    const plate = v.plate.toUpperCase();
    if (v.id > 0) {
      await query(
        `UPDATE vehicles SET plate=$1, brand=$2, model=$3, color=$4, year=$5, capacity=$6, status=$7 WHERE id=$8`,
        [plate, v.brand, v.model, v.color, v.year ?? null, v.capacity, v.status, v.id]
      );
      return { ok: true, id: v.id };
    }
    const row = await one<{ id: number }>(
      `INSERT INTO vehicles (plate, brand, model, color, year, capacity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [plate, v.brand, v.model, v.color, v.year ?? null, v.capacity, v.status]
    );
    return { ok: true, id: row!.id };
  });

  app.post('/vehicle_delete', async (req) => {
    await query('DELETE FROM vehicles WHERE id = $1', [Number((req.body as any)?.id ?? 0)]);
    return { ok: true };
  });

  app.post('/assign_vehicle', async (req) => {
    const b = req.body as any;
    await query(`UPDATE drivers SET vehicle_id = $1 WHERE user_id = $2`,
      [Number(b?.vehicle_id) || null, Number(b?.driver_user_id ?? 0)]);
    return { ok: true };
  });

  // ---- Viajes / reporte de servicios (con filtros) ----
  app.get('/trips', async (req) => {
    const TZ = 'America/Santiago';
    const q = req.query as any;
    const cond: string[] = [];
    const params: any[] = [];
    if (q?.from) { params.push(q.from); cond.push(`(t.requested_at AT TIME ZONE '${TZ}')::date >= $${params.length}::date`); }
    if (q?.to) { params.push(q.to); cond.push(`(t.requested_at AT TIME ZONE '${TZ}')::date <= $${params.length}::date`); }
    if (['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'].includes(q?.status)) {
      params.push(q.status); cond.push(`t.status = $${params.length}`);
    }
    if (q?.driver_id) { params.push(Number(q.driver_id)); cond.push(`t.driver_id = $${params.length}`); }
    if (q?.company_id) { params.push(Number(q.company_id)); cond.push(`t.company_id = $${params.length}`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

    const trips = await query(`
      SELECT t.id, t.status, t.distance_km, t.fare, t.requested_at, t.completed_at,
        t.origin_address, t.dest_address, t.folio, t.billing_status, t.paid_at,
        p.name AS passenger_name, d.name AS driver_name, v.plate,
        co.name AS company_name
      FROM trips t
      JOIN users p ON p.id = t.passenger_id
      LEFT JOIN users d ON d.id = t.driver_id
      LEFT JOIN drivers dr ON dr.user_id = t.driver_id
      LEFT JOIN vehicles v ON v.id = dr.vehicle_id
      LEFT JOIN companies co ON co.id = t.company_id
      ${where}
      ORDER BY t.id DESC LIMIT 1000`, params);
    return { ok: true, trips };
  });

  // ---- Facturación: marcar un servicio como pagado / pendiente ----
  app.post('/trip_billing', async (req, reply) => {
    const b = req.body as any;
    const id = Number(b?.trip_id ?? 0);
    const st = String(b?.billing_status ?? '');
    if (!id || !['pending', 'paid', 'void'].includes(st))
      return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    await query(
      `UPDATE trips SET billing_status = $1, paid_at = CASE WHEN $1 = 'paid' THEN now() ELSE NULL END
       WHERE id = $2 AND status = 'completed'`,
      [st, id]
    );
    return { ok: true };
  });

  // ---- Facturación: resumen por empresa (servicios completados en el período) ----
  app.get('/billing', async (req) => {
    const TZ = 'America/Santiago';
    const q = req.query as any;
    const cond: string[] = [`t.status = 'completed'`];
    const params: any[] = [];
    if (q?.from) { params.push(q.from); cond.push(`(t.completed_at AT TIME ZONE '${TZ}')::date >= $${params.length}::date`); }
    if (q?.to) { params.push(q.to); cond.push(`(t.completed_at AT TIME ZONE '${TZ}')::date <= $${params.length}::date`); }
    const where = 'WHERE ' + cond.join(' AND ');

    const rows = await query(`
      SELECT
        co.id AS company_id,
        COALESCE(co.name, 'Sin empresa (particular)') AS company_name,
        COUNT(*)::int AS services,
        COALESCE(SUM(t.fare), 0)::int AS total,
        COALESCE(SUM(t.fare) FILTER (WHERE t.billing_status = 'paid'), 0)::int AS paid,
        COALESCE(SUM(t.fare) FILTER (WHERE t.billing_status = 'pending'), 0)::int AS pending,
        COUNT(*) FILTER (WHERE t.billing_status = 'pending')::int AS pending_count
      FROM trips t
      LEFT JOIN companies co ON co.id = t.company_id
      ${where}
      GROUP BY co.id, co.name
      ORDER BY pending DESC, total DESC`, params);

    const totals = rows.reduce(
      (a: any, r: any) => ({
        services: a.services + r.services, total: a.total + r.total,
        paid: a.paid + r.paid, pending: a.pending + r.pending,
      }),
      { services: 0, total: 0, paid: 0, pending: 0 }
    );
    return { ok: true, rows, totals };
  });

  // ---- Centro de operaciones: alertas en vivo (derivadas del estado actual) ----
  app.get('/alerts', async () => {
    const humanSecs = (s: number) => {
      s = Math.max(0, Math.round(s));
      if (s < 60) return `${s} s`;
      if (s < 3600) return `${Math.round(s / 60)} min`;
      return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
    };
    const alerts: any[] = [];

    // 1) Sin señal GPS: conductor en viaje (busy) sin actualizar posición hace > 90 s
    const gps = await query<any>(`
      SELECT u.id, u.name, EXTRACT(EPOCH FROM (now() - dr.updated_at))::int AS secs
      FROM drivers dr JOIN users u ON u.id = dr.user_id
      WHERE dr.status = 'busy' AND dr.updated_at < now() - interval '90 seconds'
      ORDER BY dr.updated_at ASC`);
    for (const d of gps) alerts.push({
      id: `gps-${d.id}`, type: 'gps', severity: 'danger',
      title: 'Sin señal GPS en viaje', detail: `${d.name} — sin actualizar hace ${humanSecs(d.secs)}`,
    });

    // 2) Solicitud sin conductor: viaje 'requested' hace > 3 min
    const unassigned = await query<any>(`
      SELECT t.id, EXTRACT(EPOCH FROM (now() - t.requested_at))::int AS secs
      FROM trips t WHERE t.status = 'requested' AND t.requested_at < now() - interval '3 minutes'
      ORDER BY t.requested_at ASC`);
    for (const t of unassigned) alerts.push({
      id: `unassigned-${t.id}`, type: 'unassigned', severity: 'warn',
      title: 'Solicitud sin conductor', detail: `Servicio #${t.id} esperando hace ${humanSecs(t.secs)}`,
    });

    // 3) Recogida demorada: aceptado/llegó pero sin iniciar hace > 15 min
    const pickup = await query<any>(`
      SELECT t.id, u.name AS driver, EXTRACT(EPOCH FROM (now() - t.accepted_at))::int AS secs
      FROM trips t LEFT JOIN users u ON u.id = t.driver_id
      WHERE t.status IN ('accepted', 'arrived') AND t.accepted_at < now() - interval '15 minutes'
      ORDER BY t.accepted_at ASC`);
    for (const t of pickup) alerts.push({
      id: `pickup-${t.id}`, type: 'pickup', severity: 'warn',
      title: 'Recogida demorada', detail: `Servicio #${t.id}${t.driver ? ` · ${t.driver}` : ''} sin iniciar hace ${humanSecs(t.secs)}`,
    });

    // 4) Viaje prolongado: en curso hace > 60 min
    const longtrip = await query<any>(`
      SELECT t.id, u.name AS driver, EXTRACT(EPOCH FROM (now() - t.started_at))::int AS secs
      FROM trips t LEFT JOIN users u ON u.id = t.driver_id
      WHERE t.status = 'in_progress' AND t.started_at < now() - interval '60 minutes'
      ORDER BY t.started_at ASC`);
    for (const t of longtrip) alerts.push({
      id: `long-${t.id}`, type: 'long', severity: 'info',
      title: 'Viaje prolongado', detail: `Servicio #${t.id}${t.driver ? ` · ${t.driver}` : ''} en curso hace ${humanSecs(t.secs)}`,
    });

    // 5) Desvío de ruta: eventos recientes reportados por el navegador del conductor (Redis, TTL 90 s)
    const OFFROUTE_TTL = 90_000;
    try {
      await redis.zremrangebyscore(NAV_OFFROUTE, 0, Date.now() - OFFROUTE_TTL);
      const off = await redis.zrange(NAV_OFFROUTE, 0, -1, 'WITHSCORES');
      for (let i = 0; i < off.length; i += 2) {
        const [driverId, tripId, name] = off[i].split('|');
        const secs = Math.round((Date.now() - Number(off[i + 1])) / 1000);
        alerts.push({
          id: `offroute-${driverId}`, type: 'offroute', severity: 'warn',
          title: 'Desvío de ruta',
          detail: `${name || 'Conductor'} se desvió de la ruta hace ${humanSecs(secs)}${tripId && tripId !== '0' ? ` · servicio #${tripId}` : ''}`,
        });
      }
    } catch { /* si Redis no responde, omitimos esta alerta */ }

    const rank: Record<string, number> = { danger: 0, warn: 1, info: 2 };
    alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return { ok: true, alerts, count: alerts.length };
  });
}
