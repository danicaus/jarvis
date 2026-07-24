import { db } from '../infra/database';
import type { User } from '../types';
import type { GoogleProfile } from '../services/auth';

export async function upsertFromGoogleProfile(profile: GoogleProfile): Promise<User> {
  const result = await db.query<User>(
    `INSERT INTO users (email, google_sub, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET google_sub = excluded.google_sub, name = excluded.name
     RETURNING *`,
    [profile.email, profile.googleSub, profile.name],
  );
  return result.rows[0];
}

export async function findById(id: number): Promise<User | undefined> {
  const result = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
