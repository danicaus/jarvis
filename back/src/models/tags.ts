import { db } from '../infra/database';
import type { Tag } from '../types';

const COLUNAS = 'id, nome, criado_em';

export async function list(): Promise<Tag[]> {
  const result = await db.query<Tag>(`SELECT ${COLUNAS} FROM tags ORDER BY criado_em ASC`);
  return result.rows;
}

export async function create(nome: string): Promise<Tag> {
  const result = await db.query<Tag>(`INSERT INTO tags (nome) VALUES ($1) RETURNING ${COLUNAS}`, [nome]);
  return result.rows[0];
}

// Troca o nome no catálogo e propaga pros itens do inbox que já usam o nome
// antigo — sem isso, `inbox.tags` (TEXT[] livre, sem FK) ficaria dessincronizado.
export async function rename(id: number, novoNome: string): Promise<Tag | undefined> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const atual = await client.query<Pick<Tag, 'nome'>>('SELECT nome FROM tags WHERE id = $1 FOR UPDATE', [id]);
    const nomeAntigo = atual.rows[0]?.nome;
    if (!nomeAntigo) {
      await client.query('ROLLBACK');
      return undefined;
    }

    const atualizado = await client.query<Tag>(`UPDATE tags SET nome = $1 WHERE id = $2 RETURNING ${COLUNAS}`, [
      novoNome,
      id,
    ]);
    await client.query('UPDATE inbox SET tags = array_replace(tags, $1, $2) WHERE $1 = ANY(tags)', [
      nomeAntigo,
      novoNome,
    ]);
    await client.query('COMMIT');
    return atualizado.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Só tira do catálogo — itens já capturados mantêm a tag antiga (ver handoff:
// remover não deve mexer em itens já salvos).
export async function remove(id: number): Promise<boolean> {
  const result = await db.query('DELETE FROM tags WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
