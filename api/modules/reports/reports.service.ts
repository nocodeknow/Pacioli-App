import { db } from '../../db/client.js';
import { postings, accounts, transactions } from '../../db/schema.js';
import type { DashboardData, MonthlyFlow, SettlementItem, AccountSubgroup } from '../../../src/shared-types/index.js';
import type { AccountBalance } from '../../../src/shared-types/mocks.js';
import { and, or, eq, like, inArray, sql } from 'drizzle-orm';

export class ReportsService {
  async getDashboardData(): Promise<DashboardData> {
    // 1. Fetch Asset & Liability account balances with SQL-computed subgroups and displayName
    const accountBalances = await db
      .select({
        id: accounts.id,
        path: accounts.path,
        displayName: accounts.name,
        type: accounts.type,
        subgroup: sql<string>`CASE 
          WHEN instr(substr(${accounts.path}, instr(${accounts.path}, ':') + 1), ':') > 0 
          THEN substr(
            substr(${accounts.path}, instr(${accounts.path}, ':') + 1),
            1,
            instr(substr(${accounts.path}, instr(${accounts.path}, ':') + 1), ':') - 1
          )
          ELSE substr(${accounts.path}, instr(${accounts.path}, ':') + 1)
        END`,
        balance: sql<number>`SUM(${postings.amount})`,
      })
      .from(postings)
      .innerJoin(accounts, eq(postings.accountId, accounts.id))
      .where(
        and(
          inArray(accounts.type, ['Asset', 'Liability']),
          eq(accounts.archived, false)
        )
      )
      .groupBy(accounts.id);

    const assetsSubgroupsMap = new Map<string, AccountBalance[]>();
    const liabilitiesSubgroupsMap = new Map<string, AccountBalance[]>();
    let assetsTotal = 0;
    let liabilitiesTotal = 0;

    for (const row of accountBalances) {
      const balance = typeof row.balance === 'string' ? parseFloat(row.balance) : Number(row.balance || 0);
      const subgroup = row.subgroup || 'Other';
      const displayName = row.displayName || row.path.split(':').pop() || row.path;

      if (row.type === 'Asset') {
        assetsTotal += balance;
        if (!assetsSubgroupsMap.has(subgroup)) {
          assetsSubgroupsMap.set(subgroup, []);
        }
        assetsSubgroupsMap.get(subgroup)!.push({
          id: row.path,
          name: displayName,
          balance,
        });
      } else if (row.type === 'Liability') {
        const positiveBalance = Math.abs(balance);
        liabilitiesTotal += positiveBalance;
        if (!liabilitiesSubgroupsMap.has(subgroup)) {
          liabilitiesSubgroupsMap.set(subgroup, []);
        }
        liabilitiesSubgroupsMap.get(subgroup)!.push({
          id: row.path,
          name: displayName,
          balance: positiveBalance,
        });
      }
    }

    // Convert Asset subgroups map to array
    const assetsSubgroups: AccountSubgroup[] = Array.from(assetsSubgroupsMap.entries()).map(([name, accountsList]) => {
      const total = accountsList.reduce((sum, a) => sum + a.balance, 0);
      return { name, total, accounts: accountsList };
    });

    // Convert Liability subgroups map to array
    const liabilitiesSubgroups: AccountSubgroup[] = Array.from(liabilitiesSubgroupsMap.entries()).map(([name, accountsList]) => {
      const total = accountsList.reduce((sum, a) => sum + a.balance, 0);
      return { name, total, accounts: accountsList };
    });

    // 2. Fetch Settlement balances (aggregated by person name using SQL)
    const personNameSql = sql<string>`CASE 
      WHEN LOWER(${accounts.path}) LIKE 'assets:people:%' THEN substr(${accounts.path}, 15)
      WHEN LOWER(${accounts.path}) LIKE 'liabilities:people:%' THEN substr(${accounts.path}, 20)
    END`;

    const settlementBalances = await db
      .select({
        personName: personNameSql,
        displayName: sql<string>`MIN(${accounts.name})`,
        accountPath: sql<string>`MIN(${accounts.path})`,
        balance: sql<number>`SUM(${postings.amount})`,
      })
      .from(postings)
      .innerJoin(accounts, eq(postings.accountId, accounts.id))
      .where(
        or(
          like(sql`LOWER(${accounts.path})`, 'assets:people:%'),
          like(sql`LOWER(${accounts.path})`, 'liabilities:people:%')
        )
      )
      .groupBy(personNameSql);

    const settlementsItems: SettlementItem[] = [];
    let receivablesTotal = 0;
    let payablesTotal = 0;

    for (const row of settlementBalances) {
      if (!row.personName) continue;
      const balance = typeof row.balance === 'string' ? parseFloat(row.balance) : Number(row.balance || 0);
      if (balance === 0) continue;

      if (balance > 0) {
        receivablesTotal += balance;
      } else {
        payablesTotal += Math.abs(balance);
      }

      settlementsItems.push({
        id: row.accountPath,
        name: row.displayName || row.personName,
        amount: balance,
      });
    }

    settlementsItems.sort((a, b) => b.amount - a.amount);

    // 3. Fetch Monthly Flow (Income & Expense aggregated by month & category)
    const monthKeySql = sql<string>`strftime('%Y-%m', ${transactions.date})`;

    const monthlyFlowData = await db
      .select({
        monthKey: monthKeySql,
        accountType: accounts.type,
        categoryName: accounts.name,
        accountPath: accounts.path,
        balance: sql<number>`SUM(${postings.amount})`,
      })
      .from(postings)
      .innerJoin(transactions, eq(postings.transactionId, transactions.id))
      .innerJoin(accounts, eq(postings.accountId, accounts.id))
      .where(
        and(
          or(
            like(sql`LOWER(${accounts.path})`, 'income:%'),
            like(sql`LOWER(${accounts.path})`, 'expenses:%')
          ),
          sql`LOWER(${transactions.description}) NOT IN ('opening balances', 'opening balance')`,
          or(
            sql`${transactions.notes} IS NULL`,
            sql`LOWER(${transactions.notes}) NOT IN ('opening balances', 'opening balance')`
          ),
          // Exclude transfers
          sql`${transactions.id} NOT IN (
            SELECT p2.transaction_id
            FROM postings p2
            INNER JOIN accounts a2 ON p2.account_id = a2.id
            GROUP BY p2.transaction_id
            HAVING COUNT(p2.id) = 2
               AND SUM(
                 CASE WHEN LOWER(a2.path) LIKE 'assets:%' 
                        OR LOWER(a2.path) LIKE 'liabilities:%' 
                        OR LOWER(a2.path) LIKE 'equity:%' 
                      THEN 1 ELSE 0 END
               ) = 2
          )`
        )
      )
      .groupBy(monthKeySql, accounts.id);

    const monthlyFlow: Record<string, MonthlyFlow> = {};

    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (const row of monthlyFlowData) {
      if (!row.monthKey) continue;
      const [yearStr, monthStr] = row.monthKey.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      const monthDisplayKey = `${MONTHS[monthIdx]} ${year}`;

      if (!monthlyFlow[monthDisplayKey]) {
        monthlyFlow[monthDisplayKey] = {
          income: 0,
          expense: 0,
          incomeCategories: [],
          expenseCategories: [],
        };
      }

      const flow = monthlyFlow[monthDisplayKey];
      const balance = typeof row.balance === 'string' ? parseFloat(row.balance) : Number(row.balance || 0);
      const cleanName = row.categoryName || row.accountPath.split(':').pop() || row.accountPath;

      if (row.accountPath.toLowerCase().startsWith('income:')) {
        const amount = -balance;
        flow.income += amount;
        let catFlow = flow.incomeCategories.find(c => c.category === cleanName);
        if (!catFlow) {
          catFlow = { category: cleanName, amount: 0 };
          flow.incomeCategories.push(catFlow);
        }
        catFlow.amount += amount;
      } else if (row.accountPath.toLowerCase().startsWith('expenses:')) {
        const amount = balance;
        flow.expense += amount;
        let catFlow = flow.expenseCategories.find(c => c.category === cleanName);
        if (!catFlow) {
          catFlow = { category: cleanName, amount: 0 };
          flow.expenseCategories.push(catFlow);
        }
        catFlow.amount += amount;
      }
    }

    // Sort category breakdowns by amount descending
    for (const monthKey of Object.keys(monthlyFlow)) {
      monthlyFlow[monthKey].incomeCategories.sort((a, b) => b.amount - a.amount);
      monthlyFlow[monthKey].expenseCategories.sort((a, b) => b.amount - a.amount);
    }

    // Sort monthlyFlow keys reverse chronologically
    const sortedMonthlyFlow: Record<string, MonthlyFlow> = {};
    const sortedMonthKeys = Object.keys(monthlyFlow).sort((a, b) => {
      const parseMonthYear = (str: string) => {
        const [monthName, yearStr] = str.split(' ');
        const monthIdx = MONTHS.indexOf(monthName);
        return new Date(parseInt(yearStr, 10), monthIdx, 1).getTime();
      };
      return parseMonthYear(b) - parseMonthYear(a);
    });

    for (const key of sortedMonthKeys) {
      sortedMonthlyFlow[key] = monthlyFlow[key];
    }

    return {
      assets: {
        total: assetsTotal,
        subgroups: assetsSubgroups
      },
      liabilities: {
        total: liabilitiesTotal,
        subgroups: liabilitiesSubgroups
      },
      monthlyFlow: sortedMonthlyFlow,
      settlements: {
        receivablesTotal,
        payablesTotal,
        items: settlementsItems
      }
    };
  }
}

export const reportsService = new ReportsService();
