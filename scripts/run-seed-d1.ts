import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../api/db/schema.js';
import { seedDatabase } from './seed.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(dir)) {
    console.error('❌ Local wrangler state directory not found. Please run migrations first.');
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sqlite'));
  if (files.length === 0) {
    console.error('❌ No SQLite files found.');
    return;
  }

  for (const file of files) {
    const dbPath = path.resolve(dir, file);
    const client = createClient({ url: `file:${dbPath}` });
    const db = drizzle(client, { schema });

    // Check if the accounts table exists
    try {
      await db.select().from(schema.accounts).limit(1);
      console.log(`🌱 Seeding database: ${file}...`);
      await seedDatabase(db);
      console.log(`✅ Seeding completed for ${file}!`);
      client.close();
      return;
    } catch (e) {
      // Table doesn't exist, skip this file
      client.close();
    }
  }

  console.error('❌ Could not find a migrated database file to seed.');
}

main().catch(console.error);
