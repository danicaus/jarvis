import { db } from '../infra/database';
import type { InboxItem, Origem } from '../types';

// `timestamp` volta do driver `pg` como `Date`, não `string` — mas res.json() já
// serializa Date como ISO automaticamente, então o formato na API não muda.

export async function list(): Promise<InboxItem[]> {
  const result = await db.query<InboxItem>(
    'SELECT id, conteudo, timestamp, origem FROM inbox ORDER BY id DESC',
  );
  return result.rows;
}

export async function findById(id: number): Promise<InboxItem | undefined> {
  const result = await db.query<InboxItem>(
    'SELECT id, conteudo, timestamp, origem FROM inbox WHERE id = $1',
    [id],
  );
  return result.rows[0];
}

export async function add(conteudo: string, origem: Origem): Promise<InboxItem> {
  const timestamp = new Date().toISOString();
  const result = await db.query<InboxItem>(
    `INSERT INTO inbox (conteudo, timestamp, origem)
     VALUES ($1, $2, $3)
     RETURNING id, conteudo, timestamp, origem`,
    [conteudo, timestamp, origem],
  );
  return result.rows[0];
}

export async function update(id: number, conteudo: string): Promise<InboxItem | undefined> {
  const result = await db.query<InboxItem>(
    `UPDATE inbox SET conteudo = $1 WHERE id = $2
     RETURNING id, conteudo, timestamp, origem`,
    [conteudo, id],
  );
  return result.rows[0];
}

export async function remove(id: number): Promise<boolean> {
  const result = await db.query('DELETE FROM inbox WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
