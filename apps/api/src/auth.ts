import bcrypt from 'bcryptjs';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin' | 'company';
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * preHandler que exige autenticación y, opcionalmente, un rol específico.
 * Uso: fastify.get('/x', { preHandler: authGuard('driver') }, handler)
 */
export function authGuard(role?: AuthUser['role']) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ ok: false, error: 'No autenticado' });
    }
    const user = req.user as AuthUser;
    if (role && user.role !== role) {
      return reply.code(403).send({ ok: false, error: 'Sin permisos para esta acción' });
    }
  };
}
