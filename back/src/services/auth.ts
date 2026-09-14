import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

const client = new OAuth2Client(config.googleClientId);

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('token do Google sem sub/email');
  }
  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
  };
}

export function isEmailAllowed(email: string): boolean {
  return config.allowedEmails.has(email.toLowerCase());
}