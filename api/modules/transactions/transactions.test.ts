import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app as honoApp } from '../../app.js';
import { getRequestListener } from '@hono/node-server';
import { setupTestDb, dbContext } from '../test-helper.js';
import { db } from '../../db/client.js';
import { accounts, transactions, postings } from '../../db/schema.js';
import { randomUUID } from 'crypto';

let mockHdfcId = 'Assets:Bank:HDFC';
let mockFoodId = 'Expenses:Food:Restaurant';

let testDb: any;
let client: any;
let app: any;

describe('Transactions API Endpoints', () => {
  beforeAll(async () => {
    const setup = await setupTestDb('transactions');
    testDb = setup.testDb;
    client = setup.client;

    app = getRequestListener((req) => honoApp.fetch(req, { DB: testDb }));

    await dbContext.run(testDb, async () => {
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

      // Seed mock accounts
      await db.insert(accounts).values({
        id: 'hdfc-acc-uuid',
        name: 'HDFC',
        path: mockHdfcId,
        type: 'Asset',
        archived: false,
      });

      await db.insert(accounts).values({
        id: 'restaurant-cat-uuid',
        name: 'Restaurant',
        path: mockFoodId,
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
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  it('CRUD manual transaction flow', async () => {
    // 1. GET transactions should be empty (excluding opening balances which are filtered out)
    let res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body.transactions).toEqual([]);
    let sha256 = res.body.sha256;
    expect(sha256).toBeDefined();

    // 2. Create a manual transaction
    const payload = {
      date: '2026-06-02',
      type: 'Expense',
      amount: 1200,
      notes: 'Lunch at restaurant',
      postings: [
        {
          account: mockHdfcId,
          amount: -1200,
          notes: null,
        },
        {
          account: mockFoodId,
          amount: 1200,
          notes: 'Pasta and drinks',
        },
      ],
      sha256,
    };

    res = await request(app)
      .post('/api/transactions')
      .send(payload);

    if (res.status !== 201) {
      console.error('Create transaction failed:', res.body || res.text);
    }

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.notes).toBe('Lunch at restaurant');
    const createdId = res.body.id;

    // 3. GET transactions should return the created transaction
    res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBe(1);
    expect(res.body.transactions[0].id).toBe(createdId);
    expect(res.body.transactions[0].amount).toBe('1200.00 INR');
    sha256 = res.body.sha256; // get updated sha256

    // 4. GET transaction by ID
    res = await request(app).get(`/api/transactions/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);

    // 5. Try updating transaction with an outdated/invalid SHA256 (should trigger 409 Conflict)
    const updatePayload = {
      date: '2026-06-02',
      type: 'Expense',
      amount: 1500,
      notes: 'Dinner at restaurant',
      postings: [
        {
          account: mockHdfcId,
          amount: -1500,
          notes: null,
        },
        {
          account: mockFoodId,
          amount: 1500,
          notes: 'Premium dinner',
        },
      ],
    };

    res = await request(app)
      .put(`/api/transactions/${createdId}`)
      .send({ ...updatePayload, sha256: 'outdated_checksum_xyz' });
    
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');

    // 6. Update transaction with correct SHA256
    res = await request(app)
      .put(`/api/transactions/${createdId}`)
      .send({ ...updatePayload, sha256 });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe('1500.00 INR');
    expect(res.body.notes).toBe('Dinner at restaurant');

    // Get fresh SHA256 after successful update
    res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    sha256 = res.body.sha256;

    // 7. Try deleting transaction with invalid SHA256 (should fail)
    res = await request(app).delete(`/api/transactions/${createdId}?sha256=invalid_sha`);
    expect(res.status).toBe(409);

    // 8. Delete transaction with correct SHA256
    res = await request(app).delete(`/api/transactions/${createdId}?sha256=${sha256}`);
    expect(res.status).toBe(204);

    // 9. Verify deletion
    res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBe(0);
  });
});
