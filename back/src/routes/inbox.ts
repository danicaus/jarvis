import { Router } from 'express';
import * as inboxRepository from '../models/inbox';
import type { Tipo } from '../types';
import { ValidationError, NotFoundError, ConflictError } from '../infra/errors';

export const inboxRouter = Router();

const TIPOS_VALIDOS: Tipo[] = ['texto', 'audio', 'imagem'];

function parseTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new ValidationError({ message: 'tags deve ser um array' });
  }
  const tags = input
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length === 0) {
    throw new ValidationError({ message: 'ao menos uma tag é obrigatória' });
  }
  return tags;
}

function parseBlob(input: unknown, campo: string): Buffer | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string' || !input) {
    throw new ValidationError({ message: `${campo} deve ser uma string base64` });
  }
  return Buffer.from(input, 'base64');
}

inboxRouter.get('/', async (_req, res) => {
  res.json(await inboxRepository.list());
});

inboxRouter.post('/', async (req, res) => {
  const tipo = req.body?.tipo;
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new ValidationError({ message: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const tags = parseTags(req.body?.tags);
  const conteudoBruto = typeof req.body?.conteudo === 'string' ? req.body.conteudo.trim() : '';

  if (tipo === 'texto' && !conteudoBruto) {
    throw new ValidationError({ message: 'conteudo obrigatório pra tipo texto' });
  }

  const audioBlob = tipo === 'audio' ? parseBlob(req.body?.audio, 'audio') : undefined;
  if (tipo === 'audio' && !audioBlob) {
    throw new ValidationError({ message: 'audio (base64) obrigatório pra tipo audio' });
  }

  const imagemBlob = tipo === 'imagem' ? parseBlob(req.body?.imagem, 'imagem') : undefined;
  if (tipo === 'imagem' && !imagemBlob) {
    throw new ValidationError({ message: 'imagem (base64) obrigatória pra tipo imagem' });
  }

  const item = await inboxRepository.add({
    tipo,
    conteudo: conteudoBruto || null,
    tags,
    audioBlob,
    imagemBlob,
  });
  res.status(201).json(item);
});

inboxRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw new ValidationError({ message: 'id inválido' });
  }

  const temConteudo = typeof req.body?.conteudo === 'string';
  const temTags = req.body?.tags !== undefined;
  if (!temConteudo && !temTags) {
    throw new ValidationError({ message: 'informe conteudo e/ou tags pra editar' });
  }

  const conteudo = temConteudo ? req.body.conteudo.trim() : undefined;
  if (temConteudo && !conteudo) {
    throw new ValidationError({ message: 'conteudo não pode ficar vazio' });
  }
  const tags = temTags ? parseTags(req.body.tags) : undefined;

  const existente = await inboxRepository.findById(id);
  if (!existente) {
    throw new NotFoundError({ message: 'item não encontrado no inbox' });
  }
  if (existente.status !== 'pendente') {
    throw new ConflictError({ message: `item já está '${existente.status}', não pode mais ser editado` });
  }

  const item = await inboxRepository.update(id, { conteudo, tags });
  res.json(item);
});

inboxRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw new ValidationError({ message: 'id inválido' });
  }

  const existente = await inboxRepository.findById(id);
  if (!existente) {
    throw new NotFoundError({ message: 'item não encontrado no inbox' });
  }
  if (existente.status !== 'pendente') {
    throw new ConflictError({ message: `item já está '${existente.status}', não pode mais ser excluído` });
  }

  await inboxRepository.remove(id);
  res.status(204).end();
});
