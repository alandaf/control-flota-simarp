export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgres://flota:flota_pass@localhost:5432/control_flota',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
  // Parámetros de tarifa (CLP)
  FARE_BASE: 800,
  FARE_PER_KM: 550,
  FARE_PER_MIN: 90,
  FARE_MINIMUM: 1500,
  // Radio de búsqueda de conductores (metros)
  SEARCH_RADIUS_M: 8000,
  // Motor de ruteo: 'osrm' (OpenStreetMap, gratis) o 'google' (Directions API).
  ROUTING_PROVIDER: (process.env.ROUTING_PROVIDER ?? 'osrm').toLowerCase(),
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
  // Vías a evitar en Google (coma-separado): 'highways' | 'tolls' | 'ferries'.
  // Ej. 'highways' para preferir caminos como La Pólvora en vez de la autopista.
  ROUTING_AVOID: (process.env.ROUTING_AVOID ?? '').trim(),
  // Notificaciones push (Web Push / VAPID). Generar con: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? 'mailto:contacto@simarp.net',
  OSRM_URL: process.env.OSRM_URL ?? 'https://router.project-osrm.org',
  OSRM_TIMEOUT_MS: Number(process.env.OSRM_TIMEOUT_MS ?? 6000),
  // Radio máx. (m) para encajar un punto a la red vial; fuera de eso -> sin ruta
  OSRM_SNAP_RADIUS_M: Number(process.env.OSRM_SNAP_RADIUS_M ?? 3000),
};
