import { z } from 'zod';
import { AccountIdSchema, CategoryIdSchema, CandidateIdSchema, SourceRecordIdSchema } from './brands.js';

export const CandidateStatusSchema = z.enum(['Pending', 'Approved', 'Deleted', 'Deferred']);
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;

export const TransactionCandidateSchema = z.object({
  id: CandidateIdSchema,
  sourceRecordId: SourceRecordIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }).nullable(),
  amount: z.number().nullable(),
  description: z.string().nullable(),
  suggestedAccount: AccountIdSchema.nullable(),
  suggestedCategory: CategoryIdSchema.nullable(),
  notes: z.string().nullable(),
  status: CandidateStatusSchema,
});

export type TransactionCandidate = z.infer<typeof TransactionCandidateSchema>;
