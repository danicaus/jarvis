import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name} (veja .env.example)`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  googleClientId: required('GOOGLE_CLIENT_ID'),
  allowedEmails: new Set(
    required('ALLOWED_EMAILS')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
  databaseUrl: required('DATABASE_URL'),
};