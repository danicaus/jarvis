import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { authCookie } from './helpers';

describe('/api/inbox', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/api/inbox');
    expect(response.status).toBe(401);
  });

  it('cria, lista, edita e deleta um item', async () => {
    const cookie = authCookie();

    const create = await request(app).post('/api/inbox').set('Cookie', cookie).send({ conteudo: 'teste' });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const list = await request(app).get('/api/inbox').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);

    const edit = await request(app)
      .patch(`/api/inbox/${id}`)
      .set('Cookie', cookie)
      .send({ conteudo: 'editado' });
    expect(edit.status).toBe(200);
    expect(edit.body.conteudo).toBe('editado');

    const del = await request(app).delete(`/api/inbox/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('rejeita conteudo vazio (400)', async () => {
    const cookie = authCookie();
    const response = await request(app).post('/api/inbox').set('Cookie', cookie).send({ conteudo: '  ' });
    expect(response.status).toBe(400);
  });

  it('retorna 404 ao editar id inexistente', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .patch('/api/inbox/999999')
      .set('Cookie', cookie)
      .send({ conteudo: 'x' });
    expect(response.status).toBe(404);
  });

  it('retorna 400 pra id inválido', async () => {
    const cookie = authCookie();
    const response = await request(app).patch('/api/inbox/abc').set('Cookie', cookie).send({ conteudo: 'x' });
    expect(response.status).toBe(400);
  });
});
