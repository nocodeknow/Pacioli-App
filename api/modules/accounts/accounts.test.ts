import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app as honoApp } from '../../app.js';
import { getRequestListener } from '@hono/node-server';
const app = getRequestListener(honoApp.fetch);
import { db } from '../../db/client.js';
import { accounts, transactions, postings } from '../../db/schema.js';
import { randomUUID } from 'crypto';

interface AccountResponse {
  id: string;
  name: string;
  displayName: string;
  type: string;
  openingBalance: number;
  openingDate: string | null;
  parentGroup: string | null;
  parentAccount: string | null;
  archived: boolean;
  lastReconciledDate: string | null;
  notes: string | null;
}

describe('Accounts API Endpoints', () => {
  beforeAll(async () => {
    // Clear database
    await db.delete(postings);
    await db.delete(transactions);
    await db.delete(accounts);
    
    // Seed Equity:Opening Balances
    await db.insert(accounts).values({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Opening Balances Equity',
      path: 'Equity:Opening Balances',
      type: 'Equity',
      archived: false,
    });

    // Seed default HDFC account
    await db.insert(accounts).values({
      id: 'hdfc-acc-uuid',
      name: 'HDFC',
      path: 'Assets:Bank:HDFC',
      type: 'Asset',
      archived: false,
    });

    // Seed default restaurant category (inside accounts table now)
    await db.insert(accounts).values({
      id: 'restaurant-cat-uuid',
      name: 'Restaurant',
      path: 'Expenses:Food:Restaurant',
      type: 'Expense',
      archived: false,
    });

    // Seed opening balance transaction for HDFC
    const txId = randomUUID();
    await db.insert(transactions).values({
      id: txId,
      date: '2026-06-01',
      description: 'Opening Balances',
      notes: 'Opening Balances',
    });
    await db.insert(postings).values([
      {
        id: randomUUID(),
        transactionId: txId,
        accountId: '00000000-0000-0000-0000-000000000000',
        amount: -50000,
      },
      {
        id: randomUUID(),
        transactionId: txId,
        accountId: 'hdfc-acc-uuid',
        amount: 50000,
      },
    ]);
  });

  it('CRUD account flow including opening balance updates', async () => {
    // 1. GET accounts - verify initial HDFC exists
    let res = await request(app).get('/api/accounts');
    expect(res.status).toBe(200);
    const initialHdfc = (res.body as AccountResponse[]).find((a) => a.name === 'Assets:Bank:HDFC');
    expect(initialHdfc).toBeDefined();
    expect(initialHdfc!.openingBalance).toBe(50000);
    expect(initialHdfc!.openingDate).toBe('2026-06-01');

    // 2. Create a new account with opening balance
    const newAccount = {
      name: 'Assets:Bank:Kotak',
      displayName: 'Kotak Bank',
      type: 'Asset',
      openingBalance: 10000,
      openingDate: '2026-06-05',
      parentGroup: null,
      parentAccount: null,
      archived: false,
      lastReconciledDate: null,
      notes: 'My new Kotak account',
    };

    res = await request(app)
      .post('/api/accounts')
      .send(newAccount);

    expect(res.status).toBe(201);
    expect(res.body.openingBalance).toBe(10000);
    expect(res.body.openingDate).toBe('2026-06-05');

    // Verify it is returned in GET accounts
    res = await request(app).get('/api/accounts');
    let kotak = (res.body as AccountResponse[]).find((a) => a.name === 'Assets:Bank:Kotak');
    expect(kotak).toBeDefined();
    expect(kotak!.openingBalance).toBe(10000);
    expect(kotak!.openingDate).toBe('2026-06-05');

    // 3. Edit account opening balance amount and date
    const updatedKotak = {
      name: 'Assets:Bank:Kotak',
      displayName: 'Kotak Bank',
      type: 'Asset',
      openingBalance: 25000,
      openingDate: '2026-06-15',
      parentGroup: null,
      parentAccount: null,
      archived: false,
      lastReconciledDate: null,
      notes: 'Updated Kotak account',
    };

    res = await request(app)
      .put('/api/accounts/Assets:Bank:Kotak')
      .send(updatedKotak);

    expect(res.status).toBe(200);
    expect(res.body.openingBalance).toBe(25000);
    expect(res.body.openingDate).toBe('2026-06-15');

    // Verify change is persisted in journal on GET
    res = await request(app).get('/api/accounts');
    kotak = (res.body as AccountResponse[]).find((a) => a.name === 'Assets:Bank:Kotak');
    expect(kotak!.openingBalance).toBe(25000);
    expect(kotak!.openingDate).toBe('2026-06-15');

    // 4. Update opening balance to 0 (should delete the transaction but keep the account)
    const zeroKotak = {
      name: 'Assets:Bank:Kotak',
      displayName: 'Kotak Bank',
      type: 'Asset',
      openingBalance: 0,
      openingDate: '2026-06-15',
      parentGroup: null,
      parentAccount: null,
      archived: false,
      lastReconciledDate: null,
      notes: 'Zeroed Kotak account',
    };

    res = await request(app)
      .put('/api/accounts/Assets:Bank:Kotak')
      .send(zeroKotak);

    expect(res.status).toBe(200);
    expect(res.body.openingBalance).toBe(0);

    // Verify it returns 0 on GET
    res = await request(app).get('/api/accounts');
    kotak = (res.body as AccountResponse[]).find((a) => a.name === 'Assets:Bank:Kotak');
    expect(kotak).toBeDefined();
    expect(kotak!.openingBalance).toBe(0);

    // 5. Try to delete Kotak while it has transaction history (should fail)
    // First fetch current journal sha255 (it uses hardcoded checksum token now)
    res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    const sha256 = res.body.sha256;

    // First create a manual transaction on Kotak
    const manualTx = {
      date: '2026-06-06',
      type: 'Expense',
      amount: 500,
      notes: 'Lunch at restaurant',
      postings: [
        {
          account: 'Assets:Bank:Kotak',
          amount: -500,
          notes: null,
        },
        {
          account: 'Expenses:Food:Restaurant',
          amount: 500,
          notes: 'Pasta',
        },
      ],
      sha256,
    };

    res = await request(app)
      .post('/api/transactions')
      .send(manualTx);
    expect(res.status).toBe(201);
    const txId = res.body.id;

    // Try deleting the account (should block because of transaction history)
    res = await request(app).delete('/api/accounts/Assets:Bank:Kotak');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot delete account');

    // Delete the transaction to clear history
    res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    const updatedSha256 = res.body.sha256;

    res = await request(app).delete(`/api/transactions/${txId}?sha256=${encodeURIComponent(updatedSha256)}`);
    expect(res.status).toBe(204);

    // Now delete the account (should succeed since no history remains)
    res = await request(app).delete('/api/accounts/Assets:Bank:Kotak');
    expect(res.status).toBe(204);

    // Verify Kotak is completely gone from the account list
    res = await request(app).get('/api/accounts');
    kotak = (res.body as AccountResponse[]).find((a) => a.name === 'Assets:Bank:Kotak');
    expect(kotak).toBeUndefined();
  }, 20000);

  it('GET /api/accounts/:id/ledger - fetches ledger register', async () => {
    let res = await request(app).get('/api/accounts/Assets:Bank:HDFC/ledger');
    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe('Assets:Bank:HDFC');
    expect(res.body.accountDisplayName).toBe('HDFC');
    expect(res.body.beginningBalance).toBe('0.00 INR');
    expect(res.body.rows.length).toBeGreaterThan(0);
    const firstRow = res.body.rows[0];
    expect(firstRow.date).toBe('2026-06-01');
    expect(firstRow.description).toBe('Opening Balances');
    expect(firstRow.amount).toBe(50000);
    expect(firstRow.runningBalance).toBe(50000);

    res = await request(app).get('/api/accounts/Assets:Bank:HDFC/ledger?startDate=2026-06-02');
    expect(res.status).toBe(200);
    expect(res.body.beginningBalance).toBe('50000.00 INR');
    expect(res.body.rows.length).toBe(0);
  });
});
