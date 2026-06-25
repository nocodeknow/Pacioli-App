/**
 * init-local-db.ts
 *
 * Applies Drizzle migrations and seeds ALL local Wrangler D1 SQLite files.
 *
 * Run this AFTER `pnpm dev` has been started once (to create the local DB file),
 * then kill the dev server, run this script, and restart.
 *
 * Usage: pnpm tsx scripts/init-local-db.ts
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../api/db/schema.js';
import { seedDatabase } from './seed.js';
import fs from 'fs';
import path from 'path';

const MIGRATION_DIR = path.resolve('drizzle');
const D1_DIR = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

function readSqlFile(filename: string): string {
  const filePath = path.join(MIGRATION_DIR, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

function splitSqlStatements(sql: string): string[] {
  // Drizzle uses `--> statement-breakpoint` as separator
  return sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean);
}

async function applyMigrationsToFile(dbPath: string): Promise<boolean> {
  const client = createClient({ url: `file:${dbPath}` });

  try {
    // Check if accounts table already exists
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
    );

    if (result.rows.length > 0) {
      console.log(`  ✅ Already migrated, skipping: ${path.basename(dbPath)}`);
      return true;
    }

    console.log(`  📦 Applying migrations to: ${path.basename(dbPath)}`);

    // Read and apply all migration files in order
    const migrationFiles = fs
      .readdirSync(MIGRATION_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sql = readSqlFile(file);
      const statements = splitSqlStatements(sql);
      console.log(`    → Applying ${file} (${statements.length} statements)`);
      for (const stmt of statements) {
        if (stmt) {
          await client.execute(stmt);
        }
      }
    }

    console.log(`  ✅ Migrations applied to: ${path.basename(dbPath)}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error applying migrations to ${path.basename(dbPath)}:`, err);
    return false;
  } finally {
    client.close();
  }
}

async function seedFile(dbPath: string): Promise<void> {
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });

  try {
    await db.select().from(schema.accounts).limit(1);
    console.log(`  🌱 Seeding: ${path.basename(dbPath)}`);
    await seedDatabase(db);
    console.log(`  ✅ Seeding complete: ${path.basename(dbPath)}`);
  } catch (err) {
    console.error(`  ❌ Seeding failed for ${path.basename(dbPath)}:`, err);
  } finally {
    client.close();
  }
}

async function main() {
  if (!fs.existsSync(D1_DIR)) {
    console.log('⚠️  No local D1 state found. Please start `pnpm dev` once first to create the database file, then kill it and re-run this script.');
    process.exit(1);
  }

  const sqliteFiles = fs.readdirSync(D1_DIR).filter(f => f.endsWith('.sqlite'));

  if (sqliteFiles.length === 0) {
    console.log('⚠️  No SQLite files found in D1 state. Please start `pnpm dev` once first.');
    process.exit(1);
  }

  console.log(`\n🔍 Found ${sqliteFiles.length} local D1 SQLite file(s):\n`);

  for (const file of sqliteFiles) {
    const dbPath = path.join(D1_DIR, file);
    const stats = fs.statSync(dbPath);
    console.log(`📁 ${file} (${stats.size} bytes)`);

    const migrated = await applyMigrationsToFile(dbPath);
    if (migrated) {
      await seedFile(dbPath);
    }
    console.log();
  }

  console.log('🎉 All local D1 databases initialized!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
