import { z } from 'zod';
import { TransactionIdSchema, TransactionLineIdSchema } from './brands.js';

import { isValidCalendarDate } from './utils.js';

export const TransactionPostingSchema = z.object({
  id: TransactionLineIdSchema,
  account: z.string(), // Hledger account path (e.g. Assets:Bank:HDFC, Expenses:Fuel)
  amount: z.number(),  // positive for debits/inflows, negative for credits/outflows
  notes: z.string().nullable(),
});

export type TransactionPosting = z.infer<typeof TransactionPostingSchema>;

export const TransactionTypeSchema = z.enum(['Income', 'Expense', 'Transfer', 'Split']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const TransactionSchema = z.object({
  id: TransactionIdSchema,
  date: z.string().refine(isValidCalendarDate, { message: 'Date must be a valid calendar date in YYYY-MM-DD format' }),

  type: TransactionTypeSchema,
  amount: z.number().positive(), // derived total of positive postings
  notes: z.string().nullable(), // transaction-level header notes
  postings: z.array(TransactionPostingSchema).min(2),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
