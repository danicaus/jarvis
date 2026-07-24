import { Router } from 'express';
import * as inboxRepository from '../models/inbox';
import type { Origem } from '../types';
import { ValidationError } from '../infra/errors';

export const inboxRouter = Router();

const ORIGENS_VALIDAS: Origem[] = ['texto', 'voz', 'foto'];

inboxRouter.get('/', (_req, res) => {
  res.json(inboxRepository.list());
});

inboxRouter.post('/', (req, res) => {
  const conteudo = typeof req.body?.conteudo === 'string' ? req.body.conteudo.trim() : '';
  if (!conteudo) {
    throw new ValidationError({ message: 'conteudo obrigatório' });
  }

  const origem = req.body?.origem ?? 'texto';
  if (!ORIGENS_VALIDAS.includes(origem)) {
    throw new ValidationError({ message: `origem deve ser um de: ${ORIGENS_VALIDAS.join(', ')}` });
  }

  res.status(201).json(inboxRepository.add(conteudo, origem));
});