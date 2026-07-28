import { Redis } from 'ioredis';
import { env } from './env.js';

/** Cliente principal (comandos) + dos para el adaptador de Socket.IO. */
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const pubClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const subClient = pubClient.duplicate();

// Clave del set geoespacial de conductores en vivo (Redis GEO)
export const DRIVERS_GEO = 'drivers:geo';

// Sorted set de desvíos de ruta recientes (score = timestamp ms; auto-expira por TTL)
export const NAV_OFFROUTE = 'nav:offroute';
