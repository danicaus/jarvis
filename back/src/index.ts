import { app } from './app';
import { config } from './config';
import { ensureSchema } from './infra/database';

ensureSchema()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`jarvis back rodando em http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao aplicar schema.sql:', err);
    process.exit(1);
  });
