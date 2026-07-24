import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import * as googleAuth from '../src/services/auth';

vi.mock('../src/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/auth')>();
  return { ...actual, verifyGoogleIdToken: vi.fn() };
});

describe('POST /auth/google', () => {
  it('exige idToken', async () => {
    const response = await request(app).post('/auth/google').send({});
    expect(response.status).toBe(400);
  });

  it('rejeita token do Google inválido', async () => {
    vi.mocked(googleAuth.verifyGoogleIdToken).mockRejectedValueOnce(new Error('token inválido'));
    const response = await request(app).post('/auth/google').send({ idToken: 'qualquer' });
    expect(response.status).toBe(401);
  });

  it('rejeita email fora do allow-list', async () => {
    vi.mocked(googleAuth.verifyGoogleIdToken).mockResolvedValueOnce({
      email: 'naoautorizado@example.com',
      googleSub: 'sub-1',
      name: 'Alguém',
    });
    const response = await request(app).post('/auth/google').send({ idToken: 'qualquer' });
    expect(response.status).toBe(403);
  });

  it('loga com sucesso e seta cookie pra email autorizado', async () => {
    vi.mocked(googleAuth.verifyGoogleIdToken).mockResolvedValueOnce({
      email: 'teste@example.com',
      googleSub: 'sub-1',
      name: 'Teste',
    });
    const response = await request(app).post('/auth/google').send({ idToken: 'qualquer' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toMatch(/^token=/);
  });
});

describe('GET /auth/me', () => {
  it('retorna 401 sem cookie', async () => {
    const response = await request(app).get('/auth/me');
    expect(response.status).toBe(401);
  });

  it('retorna o usuário logado com cookie válido', async () => {
    vi.mocked(googleAuth.verifyGoogleIdToken).mockResolvedValueOnce({
      email: 'teste@example.com',
      googleSub: 'sub-1',
      name: 'Teste',
    });
    const login = await request(app).post('/auth/google').send({ idToken: 'qualquer' });
    const cookie = login.headers['set-cookie'];

    const response = await request(app).get('/auth/me').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('teste@example.com');
  });
});
