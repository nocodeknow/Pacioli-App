import { z } from 'zod';

export const AccountBalanceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  balance: z.number(),
});
export type AccountBalance = z.infer<typeof AccountBalanceSchema>;

export const AccountSubgroupSchema = z.object({
  name: z.string(),
  total: z.number(),
  accounts: z.array(AccountBalanceSchema),
});
export type AccountSubgroup = z.infer<typeof AccountSubgroupSchema>;

export const CategoryFlowSchema = z.object({
  category: z.string(),
  amount: z.number(),
});
export type CategoryFlow = z.infer<typeof CategoryFlowSchema>;

export const MonthlyFlowSchema = z.object({
  income: z.number(),
  expense: z.number(),
  incomeCategories: z.array(CategoryFlowSchema),
  expenseCategories: z.array(CategoryFlowSchema),
});
export type MonthlyFlow = z.infer<typeof MonthlyFlowSchema>;

export const SettlementItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
});
export type SettlementItem = z.infer<typeof SettlementItemSchema>;

export const DashboardDataSchema = z.object({
  assets: z.object({
    total: z.number(),
    subgroups: z.array(AccountSubgroupSchema),
  }),
  liabilities: z.object({
    total: z.number(),
    subgroups: z.array(AccountSubgroupSchema),
  }),
  monthlyFlow: z.record(z.string(), MonthlyFlowSchema),
  settlements: z.object({
    receivablesTotal: z.number(),
    payablesTotal: z.number(),
    items: z.array(SettlementItemSchema),
  }),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;
