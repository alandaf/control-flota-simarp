import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from './env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// pg devuelve NUMERIC como string por defecto: lo convertimos a número.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Espera a que la base de datos acepte conexiones (arranque de contenedores). */
export async function waitForDb(retries = 20, delayMs = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[db] esperando a PostgreSQL... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('No se pudo conectar a la base de datos');
}

/** Ejecuta los archivos .sql de /migrations en orden (idempotentes). */
export async function migrate(): Promise<void> {
  const dir = join(__dirname, '..', 'migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`[db] migración aplicada: ${file}`);
  }
}
