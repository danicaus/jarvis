import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`jarvis back rodando em http://localhost:${config.port}`);
});