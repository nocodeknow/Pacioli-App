import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { logger } from '../logger.js';
import { seedDatabase } from './seed.js';


// Resolve database file path
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

const client = createClient({ 
  url: dbPath,
  authToken: isLocal ? undefined : env.DATABASE_AUTH_TOKEN
});
export const db = drizzle(client, { schema });

try {
  logger.info('⏳ Running database migrations...');
  let migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  
  // Check if we are running from monorepo root
  if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
    migrationsFolder = path.resolve(process.cwd(), 'apps/api/drizzle');
  }
  // Check if we are running from compiled dist/db folder
  if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    migrationsFolder = path.resolve(__dirname, '../../drizzle');
  }
  // Check if we are running from src/db folder (fallback)
  if (!fs.existsSync(path.resolve(migrationsFolder, 'meta/_journal.json'))) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    migrationsFolder = path.resolve(__dirname, '../../../drizzle');
  }
  
  await migrate(db, { migrationsFolder });
  logger.info('✅ Database migrations applied successfully!');
  await seedDatabase();
} catch (error) {
  logger.error(error, '❌ Failed to run database migrations/seeding');
}
