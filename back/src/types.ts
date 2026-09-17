export type Tipo = 'texto' | 'audio' | 'imagem';
export type StatusInbox = 'pendente' | 'processando' | 'processada';

// Sem os blobs — `list`/`findById` não trazem os binários de volta (ver
// models/inbox.ts), só o suficiente pra exibir a lista e permitir editar/excluir.
export interface InboxItem {
  id: number;
  tipo: Tipo;
  conteudo: string | null;
  tags: string[];
  timestamp: string;
  status: StatusInbox;
  vault_path: string | null;
}

export interface Tag {
  id: number;
  nome: string;
  criado_em: string;
}

export interface User {
  id: number;
  email: string;
  google_sub: string;
  name: string;
  created_at: string;
}