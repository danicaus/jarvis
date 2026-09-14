import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/infra/database';
import { authCookie } from './helpers';

describe('/api/inbox', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/api/inbox');
    expect(response.status).toBe(401);
  });

  it('cria, lista, edita e deleta um item de texto', async () => {
    const cookie = authCookie();

    const create = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: 'teste', tags: ['pessoal'] });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('pendente');
    expect(create.body.tags).toEqual(['pessoal']);
    const id = create.body.id;

    const list = await request(app).get('/api/inbox').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);

    const edit = await request(app)
      .patch(`/api/inbox/${id}`)
      .set('Cookie', cookie)
      .send({ conteudo: 'editado', tags: ['trabalho'] });
    expect(edit.status).toBe(200);
    expect(edit.body.conteudo).toBe('editado');
    expect(edit.body.tags).toEqual(['trabalho']);

    const del = await request(app).delete(`/api/inbox/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('cria um item de áudio com blob em base64', async () => {
    const cookie = authCookie();
    const audioBase64 = Buffer.from('conteudo-de-audio-fake').toString('base64');

    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'audio', tags: ['ideia'], audio: audioBase64 });
    expect(response.status).toBe(201);
    expect(response.body.tipo).toBe('audio');
    expect(response.body.conteudo).toBeNull();
  });

  it('cria um item de imagem com blob em base64', async () => {
    const cookie = authCookie();
    const imagemBase64 = Buffer.from('conteudo-de-imagem-fake').toString('base64');

    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'imagem', tags: ['referencia'], imagem: imagemBase64 });
    expect(response.status).toBe(201);
    expect(response.body.tipo).toBe('imagem');
  });

  it('rejeita tipo inválido', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'video', conteudo: 'x', tags: ['pessoal'] });
    expect(response.status).toBe(400);
  });

  it('rejeita conteudo vazio pra tipo texto (400)', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: '  ', tags: ['pessoal'] });
    expect(response.status).toBe(400);
  });

  it('rejeita ausência de tags (400)', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: 'teste', tags: [] });
    expect(response.status).toBe(400);
  });

  it('rejeita audio ausente pra tipo audio (400)', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'audio', tags: ['pessoal'] });
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

  it('não lista, edita ou exclui item que já saiu de pendente', async () => {
    const cookie = authCookie();

    const create = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: 'sendo processado', tags: ['pessoal'] });
    const id = create.body.id;

    // Simula o `sync/` pegando o item pra processar — ele mexe direto no
    // Postgres, sem passar pela API deste back.
    await db.query("UPDATE inbox SET status = 'processando' WHERE id = $1", [id]);

    const list = await request(app).get('/api/inbox').set('Cookie', cookie);
    expect(list.body).toHaveLength(0);

    const edit = await request(app)
      .patch(`/api/inbox/${id}`)
      .set('Cookie', cookie)
      .send({ conteudo: 'tentando editar' });
    expect(edit.status).toBe(409);

    const del = await request(app).delete(`/api/inbox/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(409);
  });
});
