import { randomBytes } from 'node:crypto';
import { one, query } from './db.js';
import { hashPassword } from './auth.js';
import { env } from './env.js';

const isProd = env.NODE_ENV === 'production';
const randomPassword = () => randomBytes(12).toString('base64url'); // ~16 chars fuerte

/**
 * Inserta datos iniciales solo si la tabla de usuarios está vacía.
 * - En producción NO se crean cuentas demo ni claves conocidas.
 *   El admin usa SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD; si no se definen,
 *   se genera una clave aleatoria que se imprime UNA vez en el log.
 * - En desarrollo se crean cuentas demo con clave 123456 por comodidad.
 */
export async function seed(): Promise<void> {
  const existing = await one<{ count: string }>('SELECT COUNT(*) AS count FROM users');
  if (Number(existing?.count ?? 0) > 0) {
    console.log('[seed] ya existen usuarios, se omite');
    return;
  }

  // ---- Administrador ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@flota.cl').toLowerCase();
  const generated = !process.env.SEED_ADMIN_PASSWORD && isProd;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? randomPassword() : '123456');
  await query(`INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,'admin')`,
    ['Administrador', adminEmail, '+56900000000', await hashPassword(adminPassword)]);

  if (generated) {
    console.log('════════════════════════════════════════════════════════════');
    console.log(`[seed] Admin creado: ${adminEmail}`);
    console.log(`[seed] Clave TEMPORAL (cámbiala al primer ingreso): ${adminPassword}`);
    console.log('════════════════════════════════════════════════════════════');
  }

  // ---- Datos demo: solo fuera de producción ----
  if (isProd) {
    console.log('[seed] producción: sin cuentas demo. Crea conductores/pasajeros desde el admin.');
    return;
  }

  const demoHash = await hashPassword('123456');
  await query(`INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,'passenger')`,
    ['Pasajero Demo', 'pasajero@flota.cl', '+56911111111', demoHash]);

  const v1 = await one<{ id: number }>(
    `INSERT INTO vehicles (plate,brand,model,color,year,capacity) VALUES ('GJKL-45','Toyota','Corolla','Blanco',2021,4) RETURNING id`);
  const v2 = await one<{ id: number }>(
    `INSERT INTO vehicles (plate,brand,model,color,year,capacity) VALUES ('HXYZ-88','Hyundai','Accent','Gris',2020,4) RETURNING id`);

  const drivers = [
    { name: 'Carlos Conductor', email: 'conductor@flota.cl', phone: '+56922222222', lat: -33.4489, lng: -70.6693, veh: v1!.id },
    { name: 'Marta Conductora', email: 'marta@flota.cl', phone: '+56933333333', lat: -33.4372, lng: -70.6506, veh: v2!.id },
  ];
  for (const d of drivers) {
    const u = await one<{ id: number }>(
      `INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,'driver') RETURNING id`,
      [d.name, d.email, d.phone, demoHash]
    );
    await query(
      `INSERT INTO drivers (user_id, license, vehicle_id, status, location)
       VALUES ($1, 'A2-000000', $2, 'available', ST_SetSRID(ST_MakePoint($3,$4),4326)::geography)`,
      [u!.id, d.veh, d.lng, d.lat]
    );
  }

  console.log('[seed] datos demo insertados (dev) — cuentas con clave 123456: admin@flota.cl, pasajero@flota.cl, conductor@flota.cl, marta@flota.cl');
}

// Permite ejecutarlo directamente:  npm run seed
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
