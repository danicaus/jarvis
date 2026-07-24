export type Origem = 'texto' | 'voz' | 'foto';

export interface InboxItem {
  id: number;
  conteudo: string;
  timestamp: string;
  origem: Origem;
}

export interface User {
  id: number;
  email: string;
  google_sub: string;
  name: string;
  created_at: string;
}