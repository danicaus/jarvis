const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type Origem = 'texto' | 'voz' | 'foto';

export interface InboxItem {
  id: number;
  conteudo: string;
  timestamp: string;
  origem: Origem;
}

interface Me {
  email: string;
  name: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} em ${path}`);
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

export function addInboxItem(conteudo: string): Promise<InboxItem> {
  return request('/api/inbox', {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  });
}

export function updateInboxItem(id: number, conteudo: string): Promise<InboxItem> {
  return request(`/api/inbox/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ conteudo }),
  });
}

export function deleteInboxItem(id: number): Promise<void> {
  return request(`/api/inbox/${id}`, { method: 'DELETE' });
}