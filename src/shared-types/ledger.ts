import { z } from 'zod';

export const AccountBalanceSchema = z.object({
  accountName: z.string(),
  balance: z.number(),
});

export type AccountBalance = z.infer<typeof AccountBalanceSchema>;

export const ReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be YYYY-MM-DD' }).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'End date must be YYYY-MM-DD' }).optional(),
  accountPattern: z.string().optional(),
  clearedStatus: z.enum(['cleared', 'pending', 'unmarked']).nullable().optional(),
});

export type ReportQuery = z.infer<typeof ReportQuerySchema>;

export const FinancialReportRowSchema = z.object({
  account: z.string(),
  balance: z.number(),
  depth: z.number(),
});

export type FinancialReportRow = z.infer<typeof FinancialReportRowSchema>;

export const FinancialReportSchema = z.object({
  title: z.string(),
  query: ReportQuerySchema,
  rows: z.array(FinancialReportRowSchema),
  total: z.number(),
});

export type FinancialReport = z.infer<typeof FinancialReportSchema>;



export const LedgerRowSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  runningBalance: z.number(),
});
export type LedgerRow = z.infer<typeof LedgerRowSchema>;

export const AccountLedgerResponseSchema = z.object({
  accountId: z.string(),
  accountDisplayName: z.string(),
  beginningBalance: z.number(),
  rows: z.array(LedgerRowSchema),
});
export type AccountLedgerResponse = z.infer<typeof AccountLedgerResponseSchema>;
