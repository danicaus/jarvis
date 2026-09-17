import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { authCookie } from './helpers';

describe('/api/tags', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/api/tags');
    expect(response.status).toBe(401);
  });

  it('lista as tags seedadas por padrão', async () => {
    const cookie = authCookie();
    const response = await request(app).get('/api/tags').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.map((tag: { nome: string }) => tag.nome)).toEqual([
      'pessoal',
      'trabalho',
      'ideia',
      'compra',
      'saúde',
    ]);
  });

  it('cria uma tag nova', async () => {
    const cookie = authCookie();
    const response = await request(app).post('/api/tags').set('Cookie', cookie).send({ nome: 'estudo' });
    expect(response.status).toBe(201);
    expect(response.body.nome).toBe('estudo');
  });

  it('rejeita nome vazio (400)', async () => {
    const cookie = authCookie();
    const response = await request(app).post('/api/tags').set('Cookie', cookie).send({ nome: '   ' });
    expect(response.status).toBe(400);
  });

  it('rejeita nome duplicado (409)', async () => {
    const cookie = authCookie();
    const response = await request(app).post('/api/tags').set('Cookie', cookie).send({ nome: 'pessoal' });
    expect(response.status).toBe(409);
  });

  it('renomeia uma tag e propaga pros itens que já usam ela', async () => {
    const cookie = authCookie();

    const item = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: 'teste', tags: ['ideia'] });

    const listaAntes = await request(app).get('/api/tags').set('Cookie', cookie);
    const idIdeia = listaAntes.body.find((tag: { nome: string }) => tag.nome === 'ideia').id;

    const rename = await request(app)
      .patch(`/api/tags/${idIdeia}`)
      .set('Cookie', cookie)
      .send({ nome: 'ideias' });
    expect(rename.status).toBe(200);
    expect(rename.body.nome).toBe('ideias');

    const itemAtualizado = await request(app).get('/api/inbox').set('Cookie', cookie);
    expect(itemAtualizado.body.find((i: { id: number }) => i.id === item.body.id).tags).toEqual(['ideias']);
  });

  it('retorna 404 ao renomear id inexistente', async () => {
    const cookie = authCookie();
    const response = await request(app)
      .patch('/api/tags/999999')
      .set('Cookie', cookie)
      .send({ nome: 'x' });
    expect(response.status).toBe(404);
  });

  it('remove uma tag do catálogo sem mexer nos itens já capturados', async () => {
    const cookie = authCookie();

    const item = await request(app)
      .post('/api/inbox')
      .set('Cookie', cookie)
      .send({ tipo: 'texto', conteudo: 'teste', tags: ['compra'] });

    const lista = await request(app).get('/api/tags').set('Cookie', cookie);
    const idCompra = lista.body.find((tag: { nome: string }) => tag.nome === 'compra').id;

    const del = await request(app).delete(`/api/tags/${idCompra}`).set('Cookie', cookie);
    expect(del.status).toBe(204);

    const listaDepois = await request(app).get('/api/tags').set('Cookie', cookie);
    expect(listaDepois.body.some((tag: { nome: string }) => tag.nome === 'compra')).toBe(false);

    const itemDepois = await request(app).get('/api/inbox').set('Cookie', cookie);
    expect(itemDepois.body.find((i: { id: number }) => i.id === item.body.id).tags).toEqual(['compra']);
  });

  it('retorna 404 ao remover id inexistente', async () => {
    const cookie = authCookie();
    const response = await request(app).delete('/api/tags/999999').set('Cookie', cookie);
    expect(response.status).toBe(404);
  });
});
