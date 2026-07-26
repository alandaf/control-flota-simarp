import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../db.js';
import { hashPassword, verifyPassword, authGuard, type AuthUser } from '../auth.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  password: z.string().min(6),
  role: z.enum(['passenger', 'driver']).default('passenger'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // ---- Registro ----
  app.post('/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const { name, email, phone, password, role } = parsed.data;

    const exists = await one('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists) return reply.code(409).send({ ok: false, error: 'Ese email ya está registrado' });

    const hash = await hashPassword(password);
    const user = await one<{ id: number }>(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email.toLowerCase(), phone, hash, role]
    );

    if (role === 'driver') {
      await query(`INSERT INTO drivers (user_id, status) VALUES ($1, 'offline')`, [user!.id]);
    }

    const payload: AuthUser = { id: user!.id, name, email: email.toLowerCase(), role };
    const token = app.jwt.sign(payload, { expiresIn: '30d' });
    return reply.send({ ok: true, token, user: payload });
  });

  // ---- Login ----
  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: 'Datos inválidos' });
    const { email, password } = parsed.data;

    const user = await one<any>(
      `SELECT * FROM users WHERE email = $1 AND status = 'active'`,
      [email.toLowerCase()]
    );
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return reply.code(401).send({ ok: false, error: 'Credenciales incorrectas' });
    }

    const payload: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = app.jwt.sign(payload, { expiresIn: '30d' });
    return reply.send({ ok: true, token, user: payload });
  });

  // ---- Usuario actual ----
  app.get('/me', { preHandler: authGuard() }, async (req) => {
    return { ok: true, user: req.user as AuthUser };
  });
}
