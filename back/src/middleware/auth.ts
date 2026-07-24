import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../infra/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    throw new UnauthorizedError({ message: 'não autenticado' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (cause) {
    throw new UnauthorizedError({ message: 'sessão inválida', cause });
  }

  if (typeof payload === 'string' || !payload.sub) {
    throw new UnauthorizedError({ message: 'sessão inválida' });
  }

  req.userId = Number(payload.sub);
  next();
}