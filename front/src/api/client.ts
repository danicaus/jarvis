// Em produção, sem VITE_API_URL definida, cai pra caminho relativo — o vercel.json
// do front faz o proxy reverso pro back same-origin (necessário pro cookie de sessão).
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

export type Tipo = 'texto' | 'audio' | 'imagem';
export type StatusInbox = 'pendente' | 'processando' | 'processada';

export interface InboxItem {
  id: number;
  tipo: Tipo;
  conteudo: string | null;
  tags: string[];
  timestamp: string;
  status: StatusInbox;
  vault_path: string | null;
}

// O blob (áudio/foto) vai como base64 dentro do JSON — sem multipart, mais simples
// de montar no front. Ver back/src/app.ts pro limite de tamanho do corpo aceito.
export type NovoItem =
  | { tipo: 'texto'; conteudo: string; tags: string[] }
  | { tipo: 'audio'; audio: string; conteudo?: string; tags: string[] }
  | { tipo: 'imagem'; imagem: string; conteudo?: string; tags: string[] };

interface Me {
  email: string;
  name: string;
}

// Guarda o status HTTP (além da mensagem) pra quem chama poder reagir a um caso
// específico — ex.: 409 quando o `sync/` já pegou o item pra processar.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    // Erros das rotas do back vêm como { message, action, status_code, ... }
    // (ver back/src/infra/errors.ts) — usa a mensagem de verdade quando dá.
    const corpo = await response.json().catch(() => null);
    throw new ApiError(corpo?.message ?? `Erro ${response.status} em ${path}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getMe(): Promise<Me> {
  return request('/auth/me');
}

export function loginWithGoogle(idToken: string): Promise<Me> {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export function getInbox(): Promise<InboxItem[]> {
  return request('/api/inbox');
}

export function addInboxItem(item: NovoItem): Promise<InboxItem> {
  return request('/api/inbox', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export function updateInboxItem(
  id: number,
  dados: { conteudo?: string; tags?: string[] },
): Promise<InboxItem> {
  return request(`/api/inbox/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  });
}

export function deleteInboxItem(id: number): Promise<void> {
  return request(`/api/inbox/${id}`, { method: 'DELETE' });
}
