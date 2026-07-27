import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../db.js';
import { authGuard, hashPassword, type AuthUser } from '../auth.js';

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
    const where = roles.includes(role) ? 'WHERE role = $1' : '';
    const params = roles.includes(role) ? [role] : [];
    const users = await query(
      `SELECT id, name, email, phone, role, status, created_at FROM users ${where} ORDER BY id DESC`,
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
    role: z.enum(['passenger', 'driver', 'admin']),
    status: z.enum(['active', 'inactive']).optional().default('active'),
    password: z.string().optional().default(''),
  });

  app.post('/user_save', async (req, reply) => {
    const p = userSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const u = p.data;
    const email = u.email.toLowerCase();

    const dup = await one('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, u.id]);
    if (dup) return reply.code(409).send({ ok: false, error: 'Ese email ya está en uso' });

    let userId = u.id;
    if (u.id > 0) {
      // Editar
      if (u.password) {
        if (u.password.length < 6) return reply.code(400).send({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' });
        const hash = await hashPassword(u.password);
        await query('UPDATE users SET name=$1,email=$2,phone=$3,role=$4,status=$5,password_hash=$6 WHERE id=$7',
          [u.name, email, u.phone, u.role, u.status, hash, u.id]);
      } else {
        await query('UPDATE users SET name=$1,email=$2,phone=$3,role=$4,status=$5 WHERE id=$6',
          [u.name, email, u.phone, u.role, u.status, u.id]);
      }
    } else {
      // Crear
      if (!u.password || u.password.length < 6) return reply.code(400).send({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' });
      const hash = await hashPassword(u.password);
      const row = await one<{ id: number }>(
        'INSERT INTO users (name,email,phone,password_hash,role,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [u.name, email, u.phone, hash, u.role, u.status]);
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

  // ---- Viajes ----
  app.get('/trips', async () => {
    const trips = await query(`
      SELECT t.id, t.status, t.distance_km, t.fare, t.requested_at,
        p.name AS passenger_name, d.name AS driver_name
      FROM trips t
      JOIN users p ON p.id = t.passenger_id
      LEFT JOIN users d ON d.id = t.driver_id
      ORDER BY t.id DESC LIMIT 100`);
    return { ok: true, trips };
  });
}
