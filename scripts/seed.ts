import { db } from '../api/db/client.js';
import { accounts } from '../api/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../api/logger.js';
import { randomUUID } from 'crypto';

// Static ID for the opening balances equity account
export const OPENING_BALANCES_ID = '00000000-0000-0000-0000-000000000000';

export async function seedDatabase(db: any) {
  logger.info('🌱 Checking database seeding...');

  // 0. Auto-repair corrupted root account types in existing database
  try {
    await db.run(sql`UPDATE accounts SET type = 'Asset' WHERE LOWER(path) LIKE 'assets%'`);
    await db.run(sql`UPDATE accounts SET type = 'Liability' WHERE LOWER(path) LIKE 'liabilities%'`);
    await db.run(sql`UPDATE accounts SET type = 'Equity' WHERE LOWER(path) LIKE 'equity%'`);
    await db.run(sql`UPDATE accounts SET type = 'Income' WHERE LOWER(path) LIKE 'income%'`);
    await db.run(sql`UPDATE accounts SET type = 'Expense' WHERE LOWER(path) LIKE 'expenses%'`);
    logger.info('✅ Database root account types auto-repaired successfully!');
  } catch (error) {
    logger.warn(error, '⚠️ Database auto-repair failed or is not supported in this run');
  }

  // Check if root accounts exist
  const existingRoots = await db.select().from(accounts).where(eq(accounts.isGroup, true));
  if (existingRoots.length === 0) {
    logger.info('🌱 Seeding initial chart of Accounts...');

    // 1. Create Roots
    const assetsId = randomUUID();
    const liabilitiesId = randomUUID();
    const incomeId = randomUUID();
    const expensesId = randomUUID();
    const equityId = randomUUID();

    await db.insert(accounts).values([
      { id: assetsId, name: 'Assets', type: 'Asset', isGroup: true, parentId: null, path: 'Assets', archived: false, notes: 'Root Assets Account' },
      { id: liabilitiesId, name: 'Liabilities', type: 'Liability', isGroup: true, parentId: null, path: 'Liabilities', archived: false, notes: 'Root Liabilities Account' },
      { id: incomeId, name: 'Income', type: 'Income', isGroup: true, parentId: null, path: 'Income', archived: false, notes: 'Root Income Account' },
      { id: expensesId, name: 'Expenses', type: 'Expense', isGroup: true, parentId: null, path: 'Expenses', archived: false, notes: 'Root Expenses Account' },
      { id: equityId, name: 'Equity', type: 'Equity', isGroup: true, parentId: null, path: 'Equity', archived: false, notes: 'Root Equity Account' },
    ]);

    // 2. Create Subgroups
    const bankId = randomUUID();
    const assetsPeopleId = randomUUID();
    const ccId = randomUUID();
    const liabilitiesPeopleId = randomUUID();
    const foodId = randomUUID();

    await db.insert(accounts).values([
      { id: bankId, name: 'Bank', type: 'Asset', isGroup: true, parentId: assetsId, path: 'Assets:Bank', archived: false },
      { id: assetsPeopleId, name: 'People', type: 'Asset', isGroup: true, parentId: assetsId, path: 'Assets:People', archived: false },
      { id: ccId, name: 'Credit Card', type: 'Liability', isGroup: true, parentId: liabilitiesId, path: 'Liabilities:Credit Card', archived: false },
      { id: liabilitiesPeopleId, name: 'People', type: 'Liability', isGroup: true, parentId: liabilitiesId, path: 'Liabilities:People', archived: false },
      { id: foodId, name: 'Food', type: 'Expense', isGroup: true, parentId: expensesId, path: 'Expenses:Food', archived: false },
    ]);

    // 3. Create Leaf Detail Accounts
    await db.insert(accounts).values([
      // Assets
      { id: '11111111-1111-1111-1111-111111111111', name: 'HDFC Bank Savings', type: 'Asset', isGroup: false, parentId: bankId, path: 'Assets:Bank:HDFC Bank Savings', archived: false, notes: 'Primary bank account' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'ICICI Bank Savings', type: 'Asset', isGroup: false, parentId: bankId, path: 'Assets:Bank:ICICI Bank Savings', archived: false, notes: 'Secondary bank account' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Cash Wallet', type: 'Asset', isGroup: false, parentId: assetsId, path: 'Assets:Cash Wallet', archived: false, notes: 'Physical cash wallet' },
      
      // Receivables (People)
      { id: '66666666-6666-6666-6666-666666666666', name: 'Rahul', type: 'Asset', isGroup: false, parentId: assetsPeopleId, path: 'Assets:People:Rahul', archived: false, notes: 'Receivable from Rahul' },
      { id: '77777777-7777-7777-7777-777777777777', name: 'Amit', type: 'Asset', isGroup: false, parentId: assetsPeopleId, path: 'Assets:People:Amit', archived: false, notes: 'Receivable from Amit' },

      // Liabilities (Credit Cards & Payables)
      { id: '44444444-4444-4444-4444-444444444444', name: 'HDFC Credit Card', type: 'Liability', isGroup: false, parentId: ccId, path: 'Liabilities:Credit Card:HDFC Credit Card', archived: false, notes: 'HDFC Millennia' },
      { id: '55555555-5555-5555-5555-555555555555', name: 'SBI Credit Card', type: 'Liability', isGroup: false, parentId: ccId, path: 'Liabilities:Credit Card:SBI Credit Card', archived: false, notes: 'SBI SimplyClick' },
      { id: '88888888-8888-8888-8888-888888888888', name: 'Priya', type: 'Liability', isGroup: false, parentId: liabilitiesPeopleId, path: 'Liabilities:People:Priya', archived: false, notes: 'Payable to Priya' },

      // Equity
      { id: OPENING_BALANCES_ID, name: 'Opening Balances Equity', type: 'Equity', isGroup: false, parentId: equityId, path: 'Equity:Opening Balances', archived: false, notes: 'Equity offset account' },

      // Income Categories
      { id: 'a1111111-a111-a111-a111-a11111111111', name: 'Salary', type: 'Income', isGroup: false, parentId: incomeId, path: 'Income:Salary', archived: false, notes: 'Main salary income' },
      { id: 'a2222222-a222-a222-a222-a22222222222', name: 'Freelance', type: 'Income', isGroup: false, parentId: incomeId, path: 'Income:Freelance', archived: false, notes: 'Freelance work' },

      // Expense Categories
      { id: 'b1111111-b111-b111-b111-b11111111111', name: 'Rent', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Rent', archived: false, notes: 'House rent' },
      { id: 'b2222222-b222-b222-b222-b22222222222', name: 'Groceries', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Groceries', archived: false, notes: 'Grocery spending' },
      { id: 'b3333333-b333-b333-b333-b33333333333', name: 'Restaurant', type: 'Expense', isGroup: false, parentId: foodId, path: 'Expenses:Food:Restaurant', archived: false, notes: 'Dining out' },
      { id: 'b4444444-b444-b444-b444-b44444444444', name: 'Utilities', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Utilities', archived: false, notes: 'Bills' },
      { id: 'b5555555-b555-b555-b555-b55555555555', name: 'Transport', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Transport', archived: false, notes: 'Fuel/fares' },
      { id: 'b6666666-b666-b666-b666-b66666666666', name: 'Entertainment', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Entertainment', archived: false, notes: 'Subscriptions/movies' },
      { id: 'b7777777-b777-b777-b777-b77777777777', name: 'Shopping', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Shopping', archived: false, notes: 'Personal items' },
    ]);
  }

  logger.info('🌱 Database seeding check complete!');
}
