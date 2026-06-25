import { z } from 'zod';

export const AccountMockSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  balance: z.number(),
});
export type AccountMock = z.infer<typeof AccountMockSchema>;

export const SubgroupMockSchema = z.object({
  name: z.string(),
  total: z.number(),
  accounts: z.array(AccountMockSchema),
});
export type SubgroupMock = z.infer<typeof SubgroupMockSchema>;

export const CategoryFlowMockSchema = z.object({
  category: z.string(),
  amount: z.number(),
});
export type CategoryFlowMock = z.infer<typeof CategoryFlowMockSchema>;

export const MonthlyFlowMockSchema = z.object({
  income: z.number(),
  expense: z.number(),
  incomeCategories: z.array(CategoryFlowMockSchema),
  expenseCategories: z.array(CategoryFlowMockSchema),
});
export type MonthlyFlowMock = z.infer<typeof MonthlyFlowMockSchema>;

export const SettlementMockSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
});
export type SettlementMock = z.infer<typeof SettlementMockSchema>;

export const DashboardDataSchema = z.object({
  assets: z.object({
    total: z.number(),
    subgroups: z.array(SubgroupMockSchema),
  }),
  liabilities: z.object({
    total: z.number(),
    subgroups: z.array(SubgroupMockSchema),
  }),
  monthlyFlow: z.record(z.string(), MonthlyFlowMockSchema),
  settlements: z.object({
    receivablesTotal: z.number(),
    payablesTotal: z.number(),
    items: z.array(SettlementMockSchema),
  }),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;
