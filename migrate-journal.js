import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

const JOURNAL_FILE = 'C:/Files/Finactic/aura.journal';
const DB_FILE = 'file:storage/pacioli.db';

async function main() {
  console.log(`📖 Reading journal file from ${JOURNAL_FILE}...`);
  if (!fs.existsSync(JOURNAL_FILE)) {
    console.error(`❌ Journal file not found at ${JOURNAL_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(JOURNAL_FILE, 'utf-8');
  const lines = content.split(/\r?\n/);

  // Parse accounts and transactions
  const accountsMap = new Map(); // path -> { name, type, isGroup, parentPath, notes }
  const transactionsList = [];

  let currentTx = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (line.startsWith('account ')) {
      const accountPath = line.substring(8).trim();
      let notes = '';
      // Read comments for description
      let j = i + 1;
      while (j < lines.length && (lines[j].startsWith(' ') || lines[j].startsWith('\t'))) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed.startsWith(';')) {
          notes += (notes ? '\n' : '') + nextTrimmed.substring(1).trim();
        }
        j++;
      }
      addAccount(accountPath, notes);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(line)) {
      // Header line
      // Format: YYYY-MM-DD [status] description [; comments]
      const parts = line.split(';');
      const headerPart = parts[0].trim();
      const commentPart = parts.slice(1).join(';').trim();

      const dateMatch = headerPart.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
      if (!dateMatch) continue;

      const date = dateMatch[1];
      let description = dateMatch[2].trim();
      // Remove status tag if present (* or !)
      if (description.startsWith('*') || description.startsWith('!')) {
        description = description.substring(1).trim();
      }

      let txId = null;
      // Extract id from comments
      const idMatch = commentPart.match(/id:([a-f0-9-]+)/i);
      if (idMatch) {
        txId = idMatch[1];
      } else {
        txId = crypto.randomUUID();
      }

      currentTx = {
        id: txId,
        date,
        description,
        notes: commentPart || null,
        postings: []
      };
      transactionsList.push(currentTx);
    } else if ((line.startsWith(' ') || line.startsWith('\t')) && currentTx) {
      if (trimmed === '' || trimmed.startsWith(';')) continue;
      
      // Parse posting line
      // Format: AccountName   Amount [Currency] [; comment]
      // Split by double spaces or tab to separate account path and amount
      const parts = trimmed.split(/  +|\t/);
      const accountPath = parts[0].trim();
      
      let amount = null;
      if (parts.length > 1) {
        const valPart = parts[1].trim().split(';')[0].trim();
        // Extract number
        const numMatch = valPart.match(/(-?[\d.]+)/);
        if (numMatch) {
          amount = parseFloat(numMatch[1]);
        }
      }

      currentTx.postings.push({
        accountPath,
        amount
      });
      
      addAccount(accountPath);
    } else {
      currentTx = null;
    }
  }

  function addAccount(accountPath, notes = '') {
    if (!accountPath) return;
    const parts = accountPath.split(':');
    let currentPath = '';
    for (let k = 0; k < parts.length; k++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}:${parts[k]}` : parts[k];
      
      if (!accountsMap.has(currentPath)) {
        let type = 'Asset';
        const root = parts[0].toLowerCase();
        if (root.startsWith('assets')) type = 'Asset';
        else if (root.startsWith('liabilities')) type = 'Liability';
        else if (root.startsWith('income')) type = 'Income';
        else if (root.startsWith('expenses') || root.startsWith('expense')) type = 'Expense';
        else if (root.startsWith('equity')) type = 'Equity';

        accountsMap.set(currentPath, {
          name: parts[k],
          type,
          isGroup: false, // will update later
          parentPath: parentPath || null,
          notes: k === parts.length - 1 ? (notes || null) : null
        });
      }
    }
  }

  // Update isGroup flags
  for (const [path, info] of accountsMap.entries()) {
    if (info.parentPath && accountsMap.has(info.parentPath)) {
      accountsMap.get(info.parentPath).isGroup = true;
    }
  }

  console.log(`Parsed ${accountsMap.size} accounts and ${transactionsList.length} transactions.`);

  // Resolve posting amounts (hledger lets you omit one amount per transaction)
  let balancedTxs = 0;
  for (const tx of transactionsList) {
    let missingIndex = -1;
    let sum = 0;
    for (let idx = 0; idx < tx.postings.length; idx++) {
      const p = tx.postings[idx];
      if (p.amount === null) {
        if (missingIndex !== -1) {
          console.warn(`⚠️ Transaction on ${tx.date} "${tx.description}" has multiple missing amounts. Setting them to 0.`);
          p.amount = 0;
        } else {
          missingIndex = idx;
        }
      } else {
        sum += p.amount;
      }
    }

    if (missingIndex !== -1) {
      tx.postings[missingIndex].amount = -sum;
    } else {
      // Check if it balances
      if (Math.abs(sum) > 0.01) {
        console.warn(`⚠️ Transaction on ${tx.date} "${tx.description}" does not balance (sum = ${sum}). Adjusting last posting.`);
        tx.postings[tx.postings.length - 1].amount -= sum;
      }
    }
    balancedTxs++;
  }

  console.log(`Balanced all ${balancedTxs} transactions.`);

  // Connect to database
  console.log(`🔌 Connecting to database at ${DB_FILE}...`);
  const client = createClient({ url: DB_FILE });

  try {
    // Clear old data
    console.log('扫 Clearing old tables (postings, transactions, accounts)...');
    await client.execute('DELETE FROM postings;');
    await client.execute('DELETE FROM transactions;');
    await client.execute('DELETE FROM accounts;');

    // Insert accounts
    console.log('📥 Inserting accounts...');
    const accountsIdMap = new Map(); // path -> uuid

    // We must insert parents before children. So sort by path depth.
    const sortedPaths = Array.from(accountsMap.keys()).sort((a, b) => a.split(':').length - b.split(':').length);

    for (const path of sortedPaths) {
      const info = accountsMap.get(path);
      const id = crypto.randomUUID();
      accountsIdMap.set(path, id);

      const parentId = info.parentPath ? accountsIdMap.get(info.parentPath) : null;

      await client.execute({
        sql: 'INSERT INTO accounts (id, name, type, is_group, parent_id, path, archived, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          info.name,
          info.type,
          info.isGroup ? 1 : 0,
          parentId,
          path,
          0,
          info.notes
        ]
      });
    }

    // Insert transactions and postings
    console.log('📥 Inserting transactions and postings...');
    let txCount = 0;
    let postingCount = 0;

    for (const tx of transactionsList) {
      await client.execute({
        sql: 'INSERT INTO transactions (id, date, description, notes) VALUES (?, ?, ?, ?)',
        args: [tx.id, tx.date, tx.description, tx.notes]
      });
      txCount++;

      for (const p of tx.postings) {
        const accountId = accountsIdMap.get(p.accountPath);
        if (!accountId) {
          console.error(`❌ Account ID not found for path: ${p.accountPath}`);
          continue;
        }

        const postingId = crypto.randomUUID();
        await client.execute({
          sql: 'INSERT INTO postings (id, transaction_id, account_id, amount) VALUES (?, ?, ?, ?)',
          args: [postingId, tx.id, accountId, p.amount]
        });
        postingCount++;
      }
    }

    console.log(`🎉 SUCCESS! Successfully migrated:`);
    console.log(`   - ${accountsIdMap.size} Accounts`);
    console.log(`   - ${txCount} Transactions`);
    console.log(`   - ${postingCount} Postings`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.close();
  }
}

main();
