import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../db/schema.js';
import { dbContext } from '../db/client.js';
import fs from 'fs';
import path from 'path';

export async function setupTestDb(testName: string) {
  const storageDir = path.resolve(process.cwd(), 'storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const dbFile = `test-${testName}.db`;
  const dbPath = path.join(storageDir, dbFile);

  // Try to remove old test db file to start clean
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {
      // ignore if locked
    }
  }

  const client = createClient({ url: `file:${dbPath}` });
  const testDb = drizzle(client, { schema });

  // Run migrations
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  await migrate(testDb, { migrationsFolder });

  return { testDb, client };
}

export { dbContext };
