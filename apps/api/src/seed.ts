import { one, query } from './db.js';
import { hashPassword } from './auth.js';

/** Inserta datos de ejemplo solo si la tabla de usuarios está vacía. */
export async function seed(): Promise<void> {
  const existing = await one<{ count: string }>('SELECT COUNT(*) AS count FROM users');
  if (Number(existing?.count ?? 0) > 0) {
    console.log('[seed] ya existen usuarios, se omite');
    return;
  }

  const hash = await hashPassword('123456');

  await query(`INSERT INTO users (name,email,phone,password_hash,role) VALUES
    ($1,$2,$3,$4,'admin')`, ['Administrador', 'admin@flota.cl', '+56900000000', hash]);
  await query(`INSERT INTO users (name,email,phone,password_hash,role) VALUES
    ($1,$2,$3,$4,'passenger')`, ['Pasajero Demo', 'pasajero@flota.cl', '+56911111111', hash]);

  const v1 = await one<{ id: number }>(
    `INSERT INTO vehicles (plate,brand,model,color,year,capacity) VALUES ('GJKL-45','Toyota','Corolla','Blanco',2021,4) RETURNING id`);
  const v2 = await one<{ id: number }>(
    `INSERT INTO vehicles (plate,brand,model,color,year,capacity) VALUES ('HXYZ-88','Hyundai','Accent','Gris',2020,4) RETURNING id`);

  // Conductores demo con posición inicial en Santiago
  const drivers = [
    { name: 'Carlos Conductor', email: 'conductor@flota.cl', phone: '+56922222222', lat: -33.4489, lng: -70.6693, veh: v1!.id },
    { name: 'Marta Conductora', email: 'marta@flota.cl', phone: '+56933333333', lat: -33.4372, lng: -70.6506, veh: v2!.id },
  ];
  for (const d of drivers) {
    const u = await one<{ id: number }>(
      `INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,'driver') RETURNING id`,
      [d.name, d.email, d.phone, hash]
    );
    await query(
      `INSERT INTO drivers (user_id, license, vehicle_id, status, location)
       VALUES ($1, 'A2-000000', $2, 'available', ST_SetSRID(ST_MakePoint($3,$4),4326)::geography)`,
      [u!.id, d.veh, d.lng, d.lat]
    );
  }

  console.log('[seed] datos de ejemplo insertados');
  console.log('[seed] cuentas (clave 123456): admin@flota.cl, pasajero@flota.cl, conductor@flota.cl, marta@flota.cl');
}

// Permite ejecutarlo directamente:  npm run seed
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
