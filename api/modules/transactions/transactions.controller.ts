import type { Context } from 'hono';
import { transactionsService } from './transactions.service.js';
import { getJournalSha256 } from '../../db/index.js';
import { z } from 'zod';
import { 
  type TransactionId, 
  type Transaction,
  TransactionTypeSchema,
  TransactionLineIdSchema,
  isValidCalendarDate
} from '../../../src/shared-types/index.js';

const postingSchema = z.object({
  id: TransactionLineIdSchema.optional(),
  account: z.string(),
  amount: z.number(),
  notes: z.string().nullable(),
});

const createTransactionSchema = z.object({
  date: z.string().refine(isValidCalendarDate, { message: 'Date must be a valid calendar date in YYYY-MM-DD format' }),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  notes: z.string().nullable(),
  postings: z.array(postingSchema).min(2),
  sha256: z.string(),
});

const updateTransactionSchema = createTransactionSchema;

interface FormattedTransaction extends Omit<Transaction, 'amount' | 'postings'> {
  amount: string;
  postings: {
    id: Transaction['postings'][number]['id'];
    account: string;
    amount: string;
    notes: string | null;
  }[];
}

function formatTransactionResponse(tx: Transaction): FormattedTransaction {
  return {
    ...tx,
    amount: `${tx.amount.toFixed(2)} INR`,
    postings: tx.postings.map((p) => ({
      ...p,
      amount: `${p.amount.toFixed(2)} INR`,
    })),
  };
}

export class TransactionsController {
  async getTransactions(c: Context) {
    const list = await transactionsService.getAllTransactions();
    const sha256 = await getJournalSha256();
    const formattedList = list.map(formatTransactionResponse);
    return c.json({ transactions: formattedList, sha256 });
  }

  async getTransaction(c: Context) {
    const id = c.req.param('id') as TransactionId;
    const tx = await transactionsService.getTransactionById(id);
    return c.json(formatTransactionResponse(tx));
  }

  async createTransaction(c: Context) {
    try {
      const body = await c.req.json();
      const { sha256, ...payload } = createTransactionSchema.parse(body);
      const newTx = await transactionsService.createTransaction(payload, sha256);
      c.status(201);
      return c.json(formatTransactionResponse(newTx));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        c.status(409);
        return c.json({ error: 'Conflict', message: error.message });
      }
      throw error;
    }
  }

  async updateTransaction(c: Context) {
    try {
      const id = c.req.param('id') as TransactionId;
      const body = await c.req.json();
      const { sha256, ...payload } = updateTransactionSchema.parse(body);
      const updatedTx = await transactionsService.updateTransaction(id, payload, sha256);
      return c.json(formatTransactionResponse(updatedTx));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        c.status(409);
        return c.json({ error: 'Conflict', message: error.message });
      }
      throw error;
    }
  }

  async deleteTransaction(c: Context) {
    try {
      const id = c.req.param('id') as TransactionId;
      const sha256 = c.req.query('sha256');
      
      if (!sha256) {
        c.status(400);
        return c.json({ error: 'Missing sha256 parameter for concurrency control' });
      }
      
      await transactionsService.deleteTransaction(id, sha256);
      c.status(204);
      return c.body(null);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        c.status(409);
        return c.json({ error: 'Conflict', message: error.message });
      }
      throw error;
    }
  }
}

export const transactionsController = new TransactionsController();
