import { db } from '../infra/database';
import type { InboxItem, Origem } from '../types';

const insertStatement = db.prepare(`INSERT INTO inbox (conteudo, timestamp, origem) VALUES (?, ?, ?)`);
const listStatement = db.prepare(`SELECT id, conteudo, timestamp, origem FROM inbox ORDER BY id DESC`);
const findByIdStatement = db.prepare(`SELECT id, conteudo, timestamp, origem FROM inbox WHERE id = ?`);
const updateStatement = db.prepare(`UPDATE inbox SET conteudo = ? WHERE id = ?`);
const removeStatement = db.prepare(`DELETE FROM inbox WHERE id = ?`);

export function list(): InboxItem[] {
  return listStatement.all() as InboxItem[];
}

export function findById(id: number): InboxItem | undefined {
  return findByIdStatement.get(id) as InboxItem | undefined;
}

export function add(conteudo: string, origem: Origem): InboxItem {
  const timestamp = new Date().toISOString();
  const result = insertStatement.run(conteudo, timestamp, origem);
  return { id: Number(result.lastInsertRowid), conteudo, timestamp, origem };
}

export function update(id: number, conteudo: string): InboxItem | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  updateStatement.run(conteudo, id);
  return { ...existing, conteudo };
}

export function remove(id: number): boolean {
  const result = removeStatement.run(id);
  return result.changes > 0;
}
