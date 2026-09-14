import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { verifyGoogleIdToken, isEmailAllowed } from '../services/auth';
import { requireAuth } from '../middleware/auth';
import { ValidationError, UnauthorizedError, ForbiddenError } from '../infra/errors';
import * as userModel from '../models/user';

export const authRouter = Router();

authRouter.post('/google', async (req, res) => {
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken) {
    throw new ValidationError({ message: 'idToken obrigatório' });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (cause) {
    throw new UnauthorizedError({ message: 'token do Google inválido', cause });
  }

  if (!isEmailAllowed(profile.email)) {
    throw new ForbiddenError({ message: 'email não autorizado' });
  }

  const user = await userModel.upsertFromGoogleProfile(profile);

  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ email: user.email, name: user.name });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await userModel.findById(req.userId!);
  if (!user) {
    throw new UnauthorizedError({ message: 'não autenticado' });
  }
  res.json({ email: user.email, name: user.name });
});
