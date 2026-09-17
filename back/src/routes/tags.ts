import { Router } from 'express';
import * as tagsRepository from '../models/tags';
import { ValidationError, NotFoundError, ConflictError } from '../infra/errors';

export const tagsRouter = Router();

function parseNome(input: unknown): string {
  if (typeof input !== 'string') {
    throw new ValidationError({ message: 'nome deve ser uma string' });
  }
  const nome = input.trim();
  if (!nome) {
    throw new ValidationError({ message: 'nome não pode ficar vazio' });
  }
  return nome;
}

function isViolacaoDeUnicidade(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

tagsRouter.get('/', async (_req, res) => {
  res.json(await tagsRepository.list());
});

tagsRouter.post('/', async (req, res) => {
  const nome = parseNome(req.body?.nome);
  try {
    const tag = await tagsRepository.create(nome);
    res.status(201).json(tag);
  } catch (err) {
    if (isViolacaoDeUnicidade(err)) {
      throw new ConflictError({ message: `já existe uma tag chamada '${nome}'` });
    }
    throw err;
  }
});

tagsRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw new ValidationError({ message: 'id inválido' });
  }
  const nome = parseNome(req.body?.nome);

  try {
    const tag = await tagsRepository.rename(id, nome);
    if (!tag) {
      throw new NotFoundError({ message: 'tag não encontrada' });
    }
    res.json(tag);
  } catch (err) {
    if (isViolacaoDeUnicidade(err)) {
      throw new ConflictError({ message: `já existe uma tag chamada '${nome}'` });
    }
    throw err;
  }
});

tagsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw new ValidationError({ message: 'id inválido' });
  }

  const removida = await tagsRepository.remove(id);
  if (!removida) {
    throw new NotFoundError({ message: 'tag não encontrada' });
  }
  res.status(204).end();
});
