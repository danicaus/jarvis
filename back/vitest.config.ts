import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testes truncam as mesmas tabelas — rodar arquivos em paralelo causaria um
    // beforeEach de um arquivo apagando dados no meio de um teste de outro.
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
  },
});
