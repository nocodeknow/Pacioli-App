import type { Request, Response, NextFunction } from 'express';
import { transactionsService } from './transactions.service.js';
import { getJournalSha256 } from '@finance-platform/ledger-interface';
import { z } from 'zod';
import { 
  type TransactionId, 
  type Transaction,
  TransactionTypeSchema,
  TransactionLineIdSchema,
  isValidCalendarDate
} from '@finance-platform/shared-types';

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
  async getTransactions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await transactionsService.getAllTransactions();
      const sha256 = await getJournalSha256();
      const formattedList = list.map(formatTransactionResponse);
      res.json({ transactions: formattedList, sha256 });
    } catch (error) {
      next(error);
    }
  }

  async getTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as TransactionId;
      const tx = await transactionsService.getTransactionById(id);
      res.json(formatTransactionResponse(tx));
    } catch (error) {
      next(error);
    }
  }

  async createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sha256, ...payload } = createTransactionSchema.parse(req.body);
      const newTx = await transactionsService.createTransaction(payload, sha256);
      res.status(201).json(formatTransactionResponse(newTx));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  }

  async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as TransactionId;
      const { sha256, ...payload } = updateTransactionSchema.parse(req.body);
      const updatedTx = await transactionsService.updateTransaction(id, payload, sha256);
      res.json(formatTransactionResponse(updatedTx));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  }

  async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as TransactionId;
      const sha256 = req.query.sha256 as string | undefined;
      
      if (!sha256) {
        res.status(400).json({ error: 'Missing sha256 parameter for concurrency control' });
        return;
      }
      
      await transactionsService.deleteTransaction(id, sha256);
      res.status(204).end();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONCURRENCY_ERROR')) {
        res.status(409).json({ error: 'Conflict', message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const transactionsController = new TransactionsController();
