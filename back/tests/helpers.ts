import jwt from 'jsonwebtoken';
import { config } from '../src/config';

export function authCookie(userId = 1): string {
  const token = jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '1h' });
  return `token=${token}`;
}
