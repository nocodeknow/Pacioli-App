/**
 * migrate-journal.ts
 *
 * Wipes the D1 database tables and migrates historical journal entries from
 * `backup/old.journal` into the local D1 databases.
 *
 * Usage: pnpm tsx scripts/migrate-journal.ts
 */

import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const JOURNAL_PATH = path.resolve('backup/old.journal');
const D1_DIR = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const OPENING_BALANCES_ID = '00000000-0000-0000-0000-000000000000';

interface RawPosting {
  accountPath: string;
  amount: number | null;
}

interface RawTransaction {
  id: string;
  date: string;
  description: string;
  notes: string | null;
  postings: RawPosting[];
}

function parseJournalFile(): { accountsDeclared: Set<string>; transactions: RawTransaction[] } {
  console.log(`📖 Parsing journal file: ${JOURNAL_PATH}...`);
  const content = fs.readFileSync(JOURNAL_PATH, 'utf-8');
  const lines = content.split(/\r?\n/);

  const accountsDeclared = new Set<string>();
  const transactions: RawTransaction[] = [];
  let currentTransaction: RawTransaction | null = null;

  // Match: YYYY-MM-DD [code] Description [; tx_id:uuid]
  const txHeaderRegex = /^(\d{4}-\d{2}-\d{2})\s+([\*!])?\s*([^;]+)(?:;\s*(.*))?$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // 1. Parse account declarations
    if (line.startsWith('account ')) {
      const accountPath = line.split(';')[0].slice(8).trim();
      if (accountPath) {
        accountsDeclared.add(accountPath);
      }
      continue;
    }

    // 2. Skip commodity / default directives
    if (line.startsWith('commodity ') || line.startsWith('default ')) {
      continue;
    }

    // 3. Skip standalone comments
    if ((line.startsWith(';') || line.startsWith('#')) && !currentTransaction) {
      continue;
    }

    // 4. Parse transaction header
    const headerMatch = line.match(txHeaderRegex);
    if (headerMatch) {
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      const date = headerMatch[1];
      const description = headerMatch[3].trim();
      const comment = headerMatch[4] ? headerMatch[4].trim() : '';

      let id = randomUUID();
      let notes: string | null = null;

      if (comment) {
        const txIdMatch = comment.match(/tx_id:\s*([a-fA-F0-9-]+)/);
        if (txIdMatch) {
          id = txIdMatch[1];
        } else {
          notes = comment;
        }
      }

      currentTransaction = {
        id,
        date,
        description,
        notes,
        postings: []
      };
      continue;
    }

    // 5. Parse posting lines inside a transaction
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (!currentTransaction) continue;

      if (trimmed.startsWith(';')) {
        // Append posting/tx comments to transaction notes
        const commentText = trimmed.slice(1).trim();
        currentTransaction.notes = currentTransaction.notes
          ? `${currentTransaction.notes}; ${commentText}`
          : commentText;
        continue;
      }

      const parts = trimmed.split(/\s{2,}/);
      const accountPath = parts[0].trim();
      if (!accountPath) continue;

      let amount: number | null = null;
      if (parts.length > 1) {
        const amountPart = parts[1].trim();
        const numMatch = amountPart.match(/^(-?\d+(?:\.\d+)?)/);
        if (numMatch) {
          amount = parseFloat(numMatch[1]);
        }
      }

      currentTransaction.postings.push({
        accountPath,
        amount
      });
    }
  }

  // Add the final transaction
  if (currentTransaction) {
    transactions.push(currentTransaction);
  }

  console.log(`✅ Parsed ${accountsDeclared.size} accounts and ${transactions.length} transactions.`);
  return { accountsDeclared, transactions };
}

async function migrateDatabase(dbPath: string, accountsDeclared: Set<string>, transactions: RawTransaction[]) {
  console.log(`\n💾 Migrating database file: ${path.basename(dbPath)}...`);
  const client = createClient({ url: `file:${dbPath}` });

  try {
    // Check if accounts table already exists, if not apply schema migrations
    const tableCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
    );

    if (tableCheck.rows.length === 0) {
      console.log(`  📦 Applying schema migrations to: ${path.basename(dbPath)}`);
      const migrationDir = path.resolve('drizzle');
      const migrationFiles = fs
        .readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
        const statements = sql
          .split('--> statement-breakpoint')
          .map(s => s.trim())
          .filter(Boolean);

        console.log(`    → Applying ${file} (${statements.length} statements)`);
        for (const stmt of statements) {
          if (stmt) {
            await client.execute(stmt);
          }
        }
      }
    }

    // 1. Wipe all existing transactional and configuration data in correct order
    console.log('  🗑️  Clearing existing records...');
    await client.execute('DELETE FROM postings');
    await client.execute('DELETE FROM transactions');
    await client.execute('DELETE FROM transaction_candidates');
    await client.execute('DELETE FROM accounts');
    await client.execute('DELETE FROM source_records');
    await client.execute('DELETE FROM connectors');

    // 2. Collect all unique account paths (only those referenced in postings)
    const uniquePaths = new Set<string>();

    for (const tx of transactions) {
      for (const p of tx.postings) {
        uniquePaths.add(p.accountPath);
      }
    }

    // 3. Expand all paths to include their ancestors (parents/grandparents)
    const expandedPaths = new Set<string>();
    for (const fullPath of uniquePaths) {
      const parts = fullPath.split(':');
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? `${currentPath}:${parts[i]}` : parts[i];
        expandedPaths.add(currentPath);
      }
    }

    // Convert to array
    const pathsArray = Array.from(expandedPaths);

    // 4. Build account entities and determine parent relationships
    const pathToId = new Map<string, string>();
    const accountsToInsert: any[] = [];

    // Assign IDs first (using static ID for Opening Balances)
    for (const p of pathsArray) {
      if (p.toLowerCase() === 'equity:opening balances') {
        pathToId.set(p, OPENING_BALANCES_ID);
      } else {
        pathToId.set(p, randomUUID());
      }
    }

    for (const p of pathsArray) {
      const parts = p.split(':');
      const name = parts[parts.length - 1];
      const depth = parts.length - 1;

      // Determine parent ID
      let parentId: string | null = null;
      if (depth > 0) {
        const parentPath = parts.slice(0, -1).join(':');
        parentId = pathToId.get(parentPath) || null;
      }

      // Determine type based on case-insensitive root component
      const rootComponent = parts[0].toLowerCase();
      let type = 'Asset';
      if (rootComponent === 'assets') type = 'Asset';
      else if (rootComponent === 'liabilities') type = 'Liability';
      else if (rootComponent === 'income') type = 'Income';
      else if (rootComponent === 'expenses') type = 'Expense';
      else if (rootComponent === 'equity') type = 'Equity';

      // Check if this account has children (meaning it's a group account)
      const hasChildren = pathsArray.some(otherPath => otherPath.startsWith(`${p}:`));

      accountsToInsert.push({
        id: pathToId.get(p)!,
        name,
        type,
        isGroup: hasChildren ? 1 : 0,
        parentId,
        path: p,
        depth
      });
    }

    // Sort by depth (parents first) so parent records are inserted before child records
    accountsToInsert.sort((a, b) => a.depth - b.depth);

    console.log(`  📂 Inserting ${accountsToInsert.length} account hierarchy nodes...`);
    for (const acc of accountsToInsert) {
      await client.execute({
        sql: 'INSERT INTO accounts (id, name, type, is_group, parent_id, path, archived) VALUES (?, ?, ?, ?, ?, ?, 0)',
        args: [acc.id, acc.name, acc.type, acc.isGroup, acc.parentId, acc.path]
      });
    }

    // 5. Insert transactions and postings
    console.log(`  📝 Inserting transactions and postings...`);
    let txCount = 0;
    let postingCount = 0;

    for (const tx of transactions) {
      // Balance the transaction if there is a missing amount
      const missingAmountPostings = tx.postings.filter(p => p.amount === null);
      if (missingAmountPostings.length === 1) {
        const sumOthers = tx.postings
          .filter(p => p.amount !== null)
          .reduce((sum, p) => sum + p.amount!, 0);
        // Balance it to exactly zero
        missingAmountPostings[0].amount = parseFloat((-sumOthers).toFixed(2));
      } else if (missingAmountPostings.length > 1) {
        console.warn(`    ⚠️ Transaction on ${tx.date} "${tx.description}" has > 1 missing amount. Skipping.`);
        continue;
      }

      // Insert transaction header
      await client.execute({
        sql: 'INSERT INTO transactions (id, date, description, notes) VALUES (?, ?, ?, ?)',
        args: [tx.id, tx.date, tx.description, tx.notes]
      });
      txCount++;

      // Insert postings
      for (const post of tx.postings) {
        const accountId = pathToId.get(post.accountPath);
        if (!accountId) {
          console.warn(`    ⚠️ Could not find account ID for path: ${post.accountPath}. Skipping posting.`);
          continue;
        }

        const amount = post.amount !== null ? post.amount : 0;

        await client.execute({
          sql: 'INSERT INTO postings (id, transaction_id, account_id, amount) VALUES (?, ?, ?, ?)',
          args: [randomUUID(), tx.id, accountId, amount]
        });
        postingCount++;
      }
    }

    // 6. Generate consolidated SQL file for remote D1 deployment
    const sqlStatements: string[] = [];
    const escapeStr = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return 'NULL';
      return `'${val.replace(/'/g, "''")}'`;
    };

    sqlStatements.push('DELETE FROM postings;');
    sqlStatements.push('DELETE FROM transactions;');
    sqlStatements.push('DELETE FROM transaction_candidates;');
    sqlStatements.push('DELETE FROM accounts;');
    sqlStatements.push('DELETE FROM source_records;');
    sqlStatements.push('DELETE FROM connectors;');

    for (const acc of accountsToInsert) {
      sqlStatements.push(
        `INSERT INTO accounts (id, name, type, is_group, parent_id, path, archived) VALUES (${escapeStr(acc.id)}, ${escapeStr(acc.name)}, ${escapeStr(acc.type)}, ${acc.isGroup}, ${escapeStr(acc.parentId)}, ${escapeStr(acc.path)}, 0);`
      );
    }

    for (const tx of transactions) {
      sqlStatements.push(
        `INSERT INTO transactions (id, date, description, notes) VALUES (${escapeStr(tx.id)}, ${escapeStr(tx.date)}, ${escapeStr(tx.description)}, ${escapeStr(tx.notes)});`
      );

      for (const post of tx.postings) {
        const accountId = pathToId.get(post.accountPath);
        if (!accountId) continue;
        const amount = post.amount !== null ? post.amount : 0;
        sqlStatements.push(
          `INSERT INTO postings (id, transaction_id, account_id, amount) VALUES (${escapeStr(randomUUID())}, ${escapeStr(tx.id)}, ${escapeStr(accountId)}, ${amount});`
        );
      }
    }

    const distDir = path.resolve('dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(path.join(distDir, 'migrate.sql'), sqlStatements.join('\n'), 'utf-8');
    console.log(`  💾 Consolidated SQL saved to: dist/migrate.sql`);

    console.log(`  ✅ Successfully migrated: ${txCount} transactions and ${postingCount} postings.`);
  } catch (err) {
    console.error(`  ❌ Migration failed:`, err);
  } finally {
    client.close();
  }
}

async function main() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    console.error(`❌ Journal backup file not found at: ${JOURNAL_PATH}`);
    process.exit(1);
  }

  const { accountsDeclared, transactions } = parseJournalFile();

  if (!fs.existsSync(D1_DIR)) {
    console.error('❌ Local wrangler D1 state directory not found.');
    process.exit(1);
  }

  const sqliteFiles = fs.readdirSync(D1_DIR).filter(f => f.endsWith('.sqlite'));
  if (sqliteFiles.length === 0) {
    console.error('❌ No SQLite database files found.');
    process.exit(1);
  }

  console.log(`🔍 Found ${sqliteFiles.length} local D1 databases to update.`);

  for (const file of sqliteFiles) {
    const dbPath = path.join(D1_DIR, file);
    await migrateDatabase(dbPath, accountsDeclared, transactions);
  }

  console.log('\n🎉 Journal migration completed successfully for all local databases!');
}

main().catch(err => {
  console.error('Fatal error running migration:', err);
  process.exit(1);
});
