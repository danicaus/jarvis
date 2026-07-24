import { db } from '../infra/database';
import type { User } from '../types';
import type { GoogleProfile } from '../services/auth';

const upsertFromGoogleStatement = db.prepare(`
  INSERT INTO users (email, google_sub, name)
  VALUES (@email, @googleSub, @name)
  ON CONFLICT(email) DO UPDATE SET google_sub = excluded.google_sub, name = excluded.name
`);
const findByEmailStatement = db.prepare(`SELECT * FROM users WHERE email = ?`);
const findByIdStatement = db.prepare(`SELECT * FROM users WHERE id = ?`);

export function upsertFromGoogleProfile(profile: GoogleProfile): User {
  upsertFromGoogleStatement.run({
    email: profile.email,
    googleSub: profile.googleSub,
    name: profile.name,
  });
  return findByEmailStatement.get(profile.email) as User;
}

export function findById(id: number): User | undefined {
  return findByIdStatement.get(id) as User | undefined;
}