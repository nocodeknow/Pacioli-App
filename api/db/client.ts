import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle as drizzleLibSql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { logger } from '../logger.js';
import { seedDatabase } from './seed.js';

// Context storage for requests
export const dbContext = new AsyncLocalStorage<any>();

// Initialize fallback database for local Node.js environments (development, tests, seeds)
let fallbackDb: any = null;

// Only initialize LibSQL if we are running in a Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  let dbPath = env.DATABASE_URL;
  if (env.NODE_ENV === 'test') {
    dbPath = 'storage/test.db';
  }
  const isLocal = !dbPath.startsWith('http:') && !dbPath.startsWith('https:') && !dbPath.startsWith('libsql:');

  if (isLocal && !dbPath.startsWith('file:')) {
    dbPath = `file:${dbPath}`;
  }

  // Ensure parent directories exist for local files
  if (isLocal && dbPath.startsWith('file:')) {
    const fileLocation = dbPath.substring(5);
    const dir = path.dirname(fileLocation);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  try {
    const client = createClient({ 
      url: dbPath,
      authToken: isLocal ? undefined : env.DATABASE_AUTH_TOKEN
    });
    fallbackDb = drizzleLibSql(client, { schema });

    // Run migrations/seeding automatically on local Node.js startup (development/test)
    if (env.NODE_ENV !== 'production') {
      logger.info('⏳ Running local database migrations...');
      let migrationsFolder = path.resolve(process.cwd(), 'drizzle');
      
      // Try resolving migrations from different relative directories
      if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
        migrationsFolder = path.resolve(process.cwd(), 'api/drizzle');
      }
      if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        migrationsFolder = path.resolve(__dirname, '../../drizzle');
      }
      if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        migrationsFolder = path.resolve(__dirname, '../../../drizzle');
      }
      
      if (fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
        await migrate(fallbackDb, { migrationsFolder });
        logger.info('✅ Local database migrations applied successfully!');
        await seedDatabase(fallbackDb);
      } else {
        logger.warn('⚠️ No migrations directory found. Skipping automatic migrations.');
      }
    }
  } catch (error) {
    logger.error(error, '❌ Failed to run local database migrations/seeding');
  }
}

// Export the db client proxy
export const db = new Proxy({} as any, {
  get(target, prop) {
    const store = dbContext.getStore();
    if (store) {
      return Reflect.get(store, prop);
    }
    if (fallbackDb) {
      return Reflect.get(fallbackDb, prop);
    }
    throw new Error('No database context or fallback client found. Are you running inside a request context?');
  }
});
