import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { config } from '../config';

// rejectUnauthorized: false evita atrito com a cadeia de certificado do Neon —
// prática comum ao conectar via `pg` a Postgres gerenciado (Neon, Supabase etc.)
export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

export function ensureSchema(): Promise<unknown> {
  return db.query(schema);
}