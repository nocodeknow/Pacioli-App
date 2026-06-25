import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { accounts, transactions, postings } from './schema.js';
import { getBalance, getNetWorth, getAccountBalances, generateReport, getAccountRegisterInMemory } from './read.js';
import { createTransaction, updateTransaction, deleteTransaction, renameAccountInJournal } from './write.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';

describe('Database Double-Entry Ledger Tests', () => {
  let client: Client;
  let db: LibSQLDatabase;
  let dbFile: string;

  let rootAssetsId = randomUUID();
  let groupBankId = randomUUID();
  let accHdfcId = randomUUID();

  let rootEquityId = randomUUID();
  let accEquityObId = randomUUID();

  let rootExpensesId = randomUUID();
  let accGroceriesId = randomUUID();

  beforeEach(async () => {
    dbFile = `test-ledger-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbFile}` });
    db = drizzle(client);

    await client.execute('PRAGMA foreign_keys = ON;');

    // Create required tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_group INTEGER DEFAULT 0 NOT NULL,
        parent_id TEXT,
        path TEXT UNIQUE NOT NULL,
        archived INTEGER DEFAULT 0 NOT NULL,
        last_reconciled_date TEXT,
        notes TEXT,
        FOREIGN KEY (parent_id) REFERENCES accounts (id) ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        notes TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS postings (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
      )
    `);

    // Seed hierarchical Chart of Accounts
    // 1. Assets tree
    await db.insert(accounts).values([
      {
        id: rootAssetsId,
        name: 'Assets',
        type: 'Asset',
        isGroup: true,
        parentId: null,
        path: 'Assets',
        archived: false,
      },
      {
        id: groupBankId,
        name: 'Bank',
        type: 'Asset',
        isGroup: true,
        parentId: rootAssetsId,
        path: 'Assets:Bank',
        archived: false,
      },
      {
        id: accHdfcId,
        name: 'HDFC Bank',
        type: 'Asset',
        isGroup: false,
        parentId: groupBankId,
        path: 'Assets:Bank:HDFC Bank',
        archived: false,
      },
    ]);

    // 2. Equity tree
    await db.insert(accounts).values([
      {
        id: rootEquityId,
        name: 'Equity',
        type: 'Equity',
        isGroup: true,
        parentId: null,
        path: 'Equity',
        archived: false,
      },
      {
        id: accEquityObId,
        name: 'Opening Balances',
        type: 'Equity',
        isGroup: false,
        parentId: rootEquityId,
        path: 'Equity:Opening Balances',
        archived: false,
      },
    ]);

    // 3. Expenses tree
    await db.insert(accounts).values([
      {
        id: rootExpensesId,
        name: 'Expenses',
        type: 'Expense',
        isGroup: true,
        parentId: null,
        path: 'Expenses',
        archived: false,
      },
      {
        id: accGroceriesId,
        name: 'Groceries',
        type: 'Expense',
        isGroup: false,
        parentId: rootExpensesId,
        path: 'Expenses:Groceries',
        archived: false,
      },
    ]);
  });

  afterEach(async () => {
    try {
      if (client) {
        client.close();
      }
      if (dbFile && fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
      }
    } catch (err) {
      console.error('Failed to clean up test database file:', err);
    }
  });

  it('1. Enforces double-entry and resolves postings', async () => {
    const unbalancedTx = {
      id: randomUUID(),
      date: '2026-06-02',
      notes: 'Unbalanced purchase',
      postings: [
        { accountId: accHdfcId, amount: -500 },
        { accountId: accGroceriesId, amount: 490 }, // sum !== 0
      ],
    };

    await expect(
      createTransaction(db, transactions, postings, accounts, unbalancedTx)
    ).rejects.toThrow(/Unbalanced transaction/);

    const balancedTx = {
      id: randomUUID(),
      date: '2026-06-02',
      notes: 'Balanced purchase',
      postings: [
        { account: 'Assets:Bank:HDFC Bank', amount: -500 }, // resolves from path
        { accountId: accGroceriesId, amount: 500 },
      ],
    };

    await createTransaction(db, transactions, postings, accounts, balancedTx);

    // Verify transaction exists
    const dbTxs = await db.select().from(transactions);
    expect(dbTxs.length).toBe(1);
    expect(dbTxs[0].description).toBe('Balanced purchase');

    const dbPostings = await db.select().from(postings);
    expect(dbPostings.length).toBe(2);
    expect(dbPostings[0].accountId).toBe(accHdfcId);
  });

  it('2. Block writing to a group header', async () => {
    const groupTx = {
      id: randomUUID(),
      date: '2026-06-02',
      notes: 'Post to group header',
      postings: [
        { account: 'Assets:Bank', amount: -500 }, // This is a Group (isGroup: true)
        { accountId: accGroceriesId, amount: 500 },
      ],
    };

    await expect(
      createTransaction(db, transactions, postings, accounts, groupTx)
    ).rejects.toThrow(/Cannot post transaction to a group\/header account/);
  });

  it('3. Calculates getBalance and getNetWorth correctly', async () => {
    // Create opening balance transaction
    const openingTx = {
      id: randomUUID(),
      date: '2026-06-01',
      notes: 'Opening Balance',
      postings: [
        { accountId: accHdfcId, amount: 10000 },
        { accountId: accEquityObId, amount: -10000 },
      ],
    };
    await createTransaction(db, transactions, postings, accounts, openingTx);

    // Create expense transaction
    const expenseTx = {
      id: randomUUID(),
      date: '2026-06-02',
      notes: 'Groceries shopping',
      postings: [
        { accountId: accHdfcId, amount: -1500 },
        { accountId: accGroceriesId, amount: 1500 },
      ],
    };
    await createTransaction(db, transactions, postings, accounts, expenseTx);

    // 1. Get Balance of HDFC account
    const hdfcBalance = await getBalance(db, postings, accounts, 'Assets:Bank:HDFC Bank');
    expect(hdfcBalance).toBe(8500); // 10000 - 1500

    // 2. Get Balance of parent assets node (hierarchical rollup)
    const assetsBalance = await getBalance(db, postings, accounts, 'Assets');
    expect(assetsBalance).toBe(8500);

    // 3. Get Net Worth (Assets + Liabilities)
    const netWorth = await getNetWorth(db, postings, accounts);
    expect(netWorth).toBe(8500);
  });

  it('4. Generates registers and reports successfully', async () => {
    // Add transaction history
    await createTransaction(db, transactions, postings, accounts, {
      id: randomUUID(),
      date: '2026-06-01',
      notes: 'Salary',
      postings: [
        { accountId: accHdfcId, amount: 5000 },
        { account: 'expenses:groceries', amount: -5000 }, // balance it
      ],
    });

    await createTransaction(db, transactions, postings, accounts, {
      id: randomUUID(),
      date: '2026-06-02',
      notes: 'Groceries',
      postings: [
        { accountId: accHdfcId, amount: -1000 },
        { accountId: accGroceriesId, amount: 1000 },
      ],
    });

    // Generate report
    const report = await generateReport(db, postings, transactions, accounts, {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });
    expect(report.total).toBe(0);

    // Verify account register
    const register = await getAccountRegisterInMemory(db, transactions, postings, accounts, 'Assets:Bank:HDFC Bank');
    expect(register.beginningBalance).toBe(0);
    expect(register.rows.length).toBe(2);
    expect(register.rows[0].runningBalance).toBe(5000);
    expect(register.rows[1].runningBalance).toBe(4000);
  });

  it('5. Handles account renames recursively and deletes', async () => {
    // Add transaction history
    const txId = randomUUID();
    await createTransaction(db, transactions, postings, accounts, {
      id: txId,
      date: '2026-06-02',
      notes: 'Groceries',
      postings: [
        { accountId: accHdfcId, amount: -1000 },
        { accountId: accGroceriesId, amount: 1000 },
      ],
    });

    // Rename Assets:Bank to Assets:Savings Bank (should update children paths recursively!)
    await renameAccountInJournal(db, accounts, null, postings, 'Assets:Bank', 'Assets:Savings Bank');

    // Child account HDFC path should now be Assets:Savings Bank:HDFC Bank
    const [hdfcAccount] = await db.select().from(accounts).where(eq(accounts.id, accHdfcId));
    expect(hdfcAccount.path).toBe('Assets:Savings Bank:HDFC Bank');

    // Delete transaction
    await deleteTransaction(db, transactions, txId);
    const dbPostingsAfterDelete = await db.select().from(postings);
    expect(dbPostingsAfterDelete.length).toBe(0);
  });
});
