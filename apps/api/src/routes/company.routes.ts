import type { FastifyInstance } from 'fastify';
import { one, query } from '../db.js';
import { authGuard, type AuthUser } from '../auth.js';

// Portal de autoservicio para la empresa cliente (solo lectura de SUS servicios).
export async function companyRoutes(app: FastifyInstance) {
  // Todo el grupo requiere rol 'company'
  app.addHook('preHandler', authGuard('company'));

  const TZ = 'America/Santiago';

  // Empresa a la que pertenece el usuario logueado
  async function companyOf(userId: number): Promise<{ id: number | null; name: string | null }> {
    const r = await one<any>(
      `SELECT co.id, co.name FROM users u LEFT JOIN companies co ON co.id = u.company_id WHERE u.id = $1`,
      [userId]
    );
    return { id: r?.id ?? null, name: r?.name ?? null };
  }

  function period(q: any, dateCol: string, cond: string[], params: any[]) {
    if (q?.from) { params.push(q.from); cond.push(`(${dateCol} AT TIME ZONE '${TZ}')::date >= $${params.length}::date`); }
    if (q?.to) { params.push(q.to); cond.push(`(${dateCol} AT TIME ZONE '${TZ}')::date <= $${params.length}::date`); }
  }

  // ---- Resumen de facturación de la empresa ----
  app.get('/summary', async (req) => {
    const me = req.user as AuthUser;
    const c = await companyOf(me.id);
    if (!c.id) return { ok: true, company: null, totals: { services: 0, total: 0, paid: 0, pending: 0 } };

    const cond = [`t.status = 'completed'`, `t.company_id = $1`];
    const params: any[] = [c.id];
    period(req.query as any, 't.completed_at', cond, params);

    const totals = await one<any>(`
      SELECT COUNT(*)::int AS services,
        COALESCE(SUM(fare), 0)::int AS total,
        COALESCE(SUM(fare) FILTER (WHERE billing_status = 'paid'), 0)::int AS paid,
        COALESCE(SUM(fare) FILTER (WHERE billing_status = 'pending'), 0)::int AS pending
      FROM trips t WHERE ${cond.join(' AND ')}`, params);
    return { ok: true, company: c.name, totals };
  });

  // ---- Servicios de la empresa ----
  app.get('/trips', async (req) => {
    const me = req.user as AuthUser;
    const c = await companyOf(me.id);
    if (!c.id) return { ok: true, trips: [] };

    const cond = [`t.company_id = $1`];
    const params: any[] = [c.id];
    period(req.query as any, 't.requested_at', cond, params);

    const trips = await query(`
      SELECT t.id, t.folio, t.status, t.billing_status, t.distance_km, t.fare,
        t.requested_at, t.completed_at, t.origin_address, t.dest_address,
        p.name AS passenger_name
      FROM trips t JOIN users p ON p.id = t.passenger_id
      WHERE ${cond.join(' AND ')}
      ORDER BY t.id DESC LIMIT 1000`, params);
    return { ok: true, trips };
  });
}
