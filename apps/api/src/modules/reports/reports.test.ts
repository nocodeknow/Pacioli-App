import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../db/client.js';
import { accounts, transactions, postings } from '../../db/schema.js';
import { randomUUID } from 'crypto';

interface SettlementItem {
  name: string;
  amount: number;
}

describe('Reports API Endpoints', () => {
  beforeAll(async () => {
    // Clear database
    await db.delete(postings);
    await db.delete(transactions);
    await db.delete(accounts);

    // Root Accounts
    const assetsId = randomUUID();
    const liabilitiesId = randomUUID();
    const incomeId = randomUUID();
    const expensesId = randomUUID();
    const equityId = randomUUID();

    // Subgroups
    const bankId = randomUUID();
    const assetsPeopleId = randomUUID();
    const ccId = randomUUID();
    const liabilitiesPeopleId = randomUUID();
    const foodId = randomUUID();

    // Leaf Accounts
    const hdfcId = randomUUID();
    const cashId = randomUUID();
    const joeId = randomUUID();
    const idfcId = randomUUID();
    const sujithaId = randomUUID();
    const openingBalancesId = '00000000-0000-0000-0000-000000000000';
    const restaurantId = randomUUID();
    const othersId = randomUUID();
    const earningsId = randomUUID();

    // Seed hierarchical Chart of Accounts
    await db.insert(accounts).values([
      // Roots
      { id: assetsId, name: 'Assets', type: 'Asset', isGroup: true, parentId: null, path: 'Assets', archived: false },
      { id: liabilitiesId, name: 'Liabilities', type: 'Liability', isGroup: true, parentId: null, path: 'Liabilities', archived: false },
      { id: incomeId, name: 'Income', type: 'Income', isGroup: true, parentId: null, path: 'Income', archived: false },
      { id: expensesId, name: 'Expenses', type: 'Expense', isGroup: true, parentId: null, path: 'Expenses', archived: false },
      { id: equityId, name: 'Equity', type: 'Equity', isGroup: true, parentId: null, path: 'Equity', archived: false },

      // Subgroups
      { id: bankId, name: 'Bank', type: 'Asset', isGroup: true, parentId: assetsId, path: 'Assets:Bank', archived: false },
      { id: assetsPeopleId, name: 'People', type: 'Asset', isGroup: true, parentId: assetsId, path: 'Assets:People', archived: false },
      { id: ccId, name: 'Credit Card', type: 'Liability', isGroup: true, parentId: liabilitiesId, path: 'Liabilities:Credit Card', archived: false },
      { id: liabilitiesPeopleId, name: 'People', type: 'Liability', isGroup: true, parentId: liabilitiesId, path: 'Liabilities:People', archived: false },
      { id: foodId, name: 'Food', type: 'Expense', isGroup: true, parentId: expensesId, path: 'Expenses:Food', archived: false },

      // Detail Leaf Accounts
      { id: hdfcId, name: 'HDFC', type: 'Asset', isGroup: false, parentId: bankId, path: 'Assets:Bank:HDFC', archived: false },
      { id: cashId, name: 'Cash', type: 'Asset', isGroup: false, parentId: assetsId, path: 'Assets:Cash', archived: false },
      { id: joeId, name: 'Joe', type: 'Asset', isGroup: false, parentId: assetsPeopleId, path: 'Assets:People:Joe', archived: false },
      { id: idfcId, name: 'IDFC Card', type: 'Liability', isGroup: false, parentId: ccId, path: 'Liabilities:Credit Card:IDFC', archived: false },
      { id: sujithaId, name: 'Sujitha', type: 'Liability', isGroup: false, parentId: liabilitiesPeopleId, path: 'Liabilities:People:Sujitha', archived: false },
      { id: openingBalancesId, name: 'Opening Balances Equity', type: 'Equity', isGroup: false, parentId: equityId, path: 'Equity:Opening Balances', archived: false },
      { id: restaurantId, name: 'Restaurant', type: 'Expense', isGroup: false, parentId: foodId, path: 'Expenses:Food:Restaurant', archived: false },
      { id: othersId, name: 'Others', type: 'Expense', isGroup: false, parentId: expensesId, path: 'Expenses:Others', archived: false },
      { id: earningsId, name: 'Earnings', type: 'Income', isGroup: false, parentId: incomeId, path: 'Income:Earnings', archived: false }
    ]);

    // Seed Transactions
    // 1. Opening Balances
    const tx1Id = randomUUID();
    await db.insert(transactions).values({
      id: tx1Id,
      date: '2026-06-01',
      description: 'Opening Balances',
      notes: 'Opening Balances',
    });
    await db.insert(postings).values([
      { id: randomUUID(), transactionId: tx1Id, accountId: hdfcId, amount: 100000 },
      { id: randomUUID(), transactionId: tx1Id, accountId: cashId, amount: 5000 },
      { id: randomUUID(), transactionId: tx1Id, accountId: joeId, amount: 12000 },
      { id: randomUUID(), transactionId: tx1Id, accountId: idfcId, amount: -20000 },
      { id: randomUUID(), transactionId: tx1Id, accountId: sujithaId, amount: -5000 },
      { id: randomUUID(), transactionId: tx1Id, accountId: openingBalancesId, amount: -92000 },
    ]);

    // 2. Earnings Credit
    const tx2Id = randomUUID();
    await db.insert(transactions).values({
      id: tx2Id,
      date: '2026-06-02',
      description: 'Earnings Credit',
      notes: 'Salary Credit',
    });
    await db.insert(postings).values([
      { id: randomUUID(), transactionId: tx2Id, accountId: hdfcId, amount: 50000 },
      { id: randomUUID(), transactionId: tx2Id, accountId: earningsId, amount: -50000 },
    ]);

    // 3. Other Expense
    const tx3Id = randomUUID();
    await db.insert(transactions).values({
      id: tx3Id,
      date: '2026-06-05',
      description: 'Other Expense',
      notes: 'Rent Payment',
    });
    await db.insert(postings).values([
      { id: randomUUID(), transactionId: tx3Id, accountId: hdfcId, amount: -15000 },
      { id: randomUUID(), transactionId: tx3Id, accountId: othersId, amount: 15000 },
    ]);

    // 4. Restaurant Meal
    const tx4Id = randomUUID();
    await db.insert(transactions).values({
      id: tx4Id,
      date: '2026-06-10',
      description: 'Restaurant Meal',
      notes: 'Dinner out',
    });
    await db.insert(postings).values([
      { id: randomUUID(), transactionId: tx4Id, accountId: idfcId, amount: -2500 },
      { id: randomUUID(), transactionId: tx4Id, accountId: restaurantId, amount: 2500 },
    ]);
  });

  it('GET /api/reports/dashboard should return correct structured financial summaries', async () => {
    const res = await request(app).get('/api/reports/dashboard');
    expect(res.status).toBe(200);

    const data = res.body;

    // Verify Assets structures
    expect(data.assets).toBeDefined();
    // Assets: hdfc (100k + 50k - 15k = 135k), cash (5k), joe (12k). Total = 152k
    expect(data.assets.total).toBe(152000);
    expect(data.assets.subgroups).toBeDefined();
    expect(data.assets.subgroups.length).toBeGreaterThan(0);

    // Verify Liabilities structures
    expect(data.liabilities).toBeDefined();
    // Liabilities: idfc (20k + 2.5k = 22.5k), sujitha (5k). Total = 27.5k
    expect(data.liabilities.total).toBe(27500);
    expect(data.liabilities.subgroups).toBeDefined();
    expect(data.liabilities.subgroups.length).toBeGreaterThan(0);

    // Verify settlements
    expect(data.settlements).toBeDefined();
    expect(data.settlements.receivablesTotal).toBe(12000); // joe has 12k
    expect(data.settlements.payablesTotal).toBe(5000); // sujitha has 5k
    
    const joeItem = (data.settlements.items as SettlementItem[]).find((item) => item.name === 'Joe');
    expect(joeItem).toBeDefined();
    expect(joeItem!.amount).toBe(12000);

    const sujithaItem = (data.settlements.items as SettlementItem[]).find((item) => item.name === 'Sujitha');
    expect(sujithaItem).toBeDefined();
    expect(sujithaItem!.amount).toBe(-5000);
  });
});
