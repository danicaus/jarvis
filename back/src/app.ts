import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { inboxRouter } from './routes/inbox';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(cookieParser());
// Limite bem acima do default (100kb) — POST /api/inbox manda áudio/imagem como
// base64 dentro do JSON. O teto real não é esse limite, e sim o da própria Vercel
// pra corpo de Serverless Function (~4.5MB) — o front já limita duração de
// gravação e redimensiona imagem pra caber nisso; ver front/src/pages/Captura.tsx.
app.use(express.json({ limit: '8mb' }));

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/api/inbox', requireAuth, inboxRouter);

// Precisa ser o último app.use — Express só reconhece como error handler pela posição
// (depois de todas as rotas) e pela assinatura de 4 parâmetros.
app.use(errorHandler);

// Export default exigido pela Vercel: ela escaneia src/app.ts antes de src/index.ts
// e espera um default export (ou app.listen) nesse arquivo especificamente.
export default app;