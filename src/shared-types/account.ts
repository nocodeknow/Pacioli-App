import { z } from 'zod';
import { AccountIdSchema } from './brands.js';
import { isValidCalendarDate } from './utils.js';

export const AccountTypeSchema = z.enum(['Asset', 'Liability', 'Income', 'Expense', 'Equity']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountEntitySchema = z.object({
  id: AccountIdSchema,
  name: z.string().min(1),
  displayName: z.string().min(1),
  type: AccountTypeSchema,
  isGroup: z.boolean().default(false),
  parentId: AccountIdSchema.nullable().optional(),
  path: z.string().min(1).optional(),
  openingBalance: z.number(),
  openingDate: z.string().refine(isValidCalendarDate, { message: 'Date must be a valid calendar date in YYYY-MM-DD format' }),
  archived: z.boolean(),
  lastReconciledDate: z.string().nullable().refine((val) => val === null || isValidCalendarDate(val), { message: 'Date must be a valid calendar date in YYYY-MM-DD format' }),
  notes: z.string().nullable(),
  parentGroup: z.string().nullable().optional(),
  parentAccount: z.string().nullable().optional(),
});


export type AccountEntity = z.infer<typeof AccountEntitySchema>;
