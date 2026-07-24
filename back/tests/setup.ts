import { beforeAll, beforeEach, afterAll } from 'vitest';
import { db, ensureSchema } from '../src/infra/database';

async function waitForDatabase(retries = 10, delayMs = 500): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

beforeAll(async () => {
  await waitForDatabase();
  await ensureSchema();
});

beforeEach(async () => {
  await db.query('TRUNCATE inbox, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await db.end();
});
