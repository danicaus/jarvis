import type { NextFunction, Request, Response } from 'express';
import { ValidationError, UnauthorizedError, ForbiddenError, InternalServerError } from '../infra/errors';

// Assinatura com 4 parâmetros é como o Express reconhece um error handler — não dá
// pra remover nenhum, mesmo os não usados, senão isso vira um middleware normal e é
// ignorado silenciosamente.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError || err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    res.status(err.statusCode).json(err);
    return;
  }

  const internalError = new InternalServerError({ cause: err });
  console.error(internalError);
  res.status(internalError.statusCode).json(internalError);
}
