import { db } from '../infra/database';
import type { InboxItem, Origem } from '../types';

const insertStatement = db.prepare(`INSERT INTO inbox (conteudo, timestamp, origem) VALUES (?, ?, ?)`);
const listStatement = db.prepare(`SELECT id, conteudo, timestamp, origem FROM inbox ORDER BY id DESC`);

export function list(): InboxItem[] {
  return listStatement.all() as InboxItem[];
}

export function add(conteudo: string, origem: Origem): InboxItem {
  const timestamp = new Date().toISOString();
  const result = insertStatement.run(conteudo, timestamp, origem);
  return { id: Number(result.lastInsertRowid), conteudo, timestamp, origem };
}