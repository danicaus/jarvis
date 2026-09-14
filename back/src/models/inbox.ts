import { db } from '../infra/database';
import type { InboxItem, Tipo } from '../types';

// `timestamp` volta do driver `pg` como `Date`, não `string` — mas res.json() já
// serializa Date como ISO automaticamente, então o formato na API não muda.
//
// Os blobs (audio_blob/imagem_blob) nunca são selecionados aqui — só o `sync/`
// (fora deste repo) lê/escreve eles direto no Postgres. Devolver binário em toda
// listagem/edição infla a resposta à toa.

const COLUNAS = 'id, tipo, conteudo, tags, timestamp, status, vault_path';

export interface NovoItem {
  tipo: Tipo;
  conteudo: string | null;
  tags: string[];
  audioBlob?: Buffer;
  imagemBlob?: Buffer;
}

export async function list(): Promise<InboxItem[]> {
  const result = await db.query<InboxItem>(
    `SELECT ${COLUNAS} FROM inbox WHERE status = 'pendente' ORDER BY id DESC`,
  );
  return result.rows;
}

export async function findById(id: number): Promise<InboxItem | undefined> {
  const result = await db.query<InboxItem>(`SELECT ${COLUNAS} FROM inbox WHERE id = $1`, [id]);
  return result.rows[0];
}

export async function add(item: NovoItem): Promise<InboxItem> {
  const result = await db.query<InboxItem>(
    `INSERT INTO inbox (tipo, conteudo, tags, audio_blob, imagem_blob)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUNAS}`,
    [item.tipo, item.conteudo, item.tags, item.audioBlob ?? null, item.imagemBlob ?? null],
  );
  return result.rows[0];
}

// Só atualiza item ainda `pendente` — se o `sync/` já pegou pra processar
// (`processando`) ou já terminou (`processada`), a query não acha linha e
// devolve undefined; a rota decide se isso é 404 (id não existe) ou 409 (existe,
// mas não está mais editável), consultando `findById` antes.
export async function update(
  id: number,
  dados: { conteudo?: string; tags?: string[] },
): Promise<InboxItem | undefined> {
  const result = await db.query<InboxItem>(
    `UPDATE inbox SET
       conteudo = COALESCE($1, conteudo),
       tags = COALESCE($2, tags)
     WHERE id = $3 AND status = 'pendente'
     RETURNING ${COLUNAS}`,
    [dados.conteudo ?? null, dados.tags ?? null, id],
  );
  return result.rows[0];
}

// Mesma lógica de `update`: só remove se ainda `pendente`.
export async function remove(id: number): Promise<boolean> {
  const result = await db.query("DELETE FROM inbox WHERE id = $1 AND status = 'pendente'", [id]);
  return (result.rowCount ?? 0) > 0;
}
