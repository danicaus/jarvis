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
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/api/inbox', requireAuth, inboxRouter);

// Precisa ser o último app.use — Express só reconhece como error handler pela posição
// (depois de todas as rotas) e pela assinatura de 4 parâmetros.
app.use(errorHandler);