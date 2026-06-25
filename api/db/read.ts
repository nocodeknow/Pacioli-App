import { eq, like, or, and, sum, between, gte, lte, lt, asc, desc, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from './schema.js';
type DbClient = DrizzleD1Database<typeof schema>;
import type { AccountBalance, ReportQuery, FinancialReport, FinancialReportRow, Transaction, AccountLedgerResponse, TransactionId, TransactionLineId } from '../../src/shared-types/index.js';
import { toTransactionId } from '../../src/shared-types/index.js';
import { accounts, transactions, postings } from './schema.js';

export async function getJournalSha256(): Promise<string> {
  return 'db-concurrency-token';
}

/**
 * Retrieves the current balance of a specific account (including sub-accounts).
 */
export async function getBalance(
  db: DbClient,
  postingsTable: typeof postings,
  accountsTable: typeof accounts,
  account: string
): Promise<number> {
  const lowerPath = account.toLowerCase();
  const [result] = await db
    .select({ balance: sum(postingsTable.amount) })
    .from(postingsTable)
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .where(
      or(
        eq(sql`LOWER(${accountsTable.path})`, lowerPath),
        like(sql`LOWER(${accountsTable.path})`, `${lowerPath}:%`)
      )
    );
  return parseFloat(result?.balance || '0');
}

/**
 * Computes the overall Net Worth (Assets + Liabilities).
 * Assets are positive and Liabilities are negative.
 */
export async function getNetWorth(
  db: DbClient,
  postingsTable: typeof postings,
  accountsTable: typeof accounts
): Promise<number> {
  const [result] = await db
    .select({ netWorth: sum(postingsTable.amount) })
    .from(postingsTable)
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .where(
      and(
        or(eq(accountsTable.type, 'Asset'), eq(accountsTable.type, 'Liability')),
        eq(accountsTable.archived, false)
      )
    );
  return parseFloat(result?.netWorth || '0');
}

/**
 * Returns a list of all active accounts with their current balances.
 */
export async function getAccountBalances(
  db: DbClient,
  postingsTable: typeof postings,
  accountsTable: typeof accounts
): Promise<AccountBalance[]> {
  const results = await db
    .select({
      accountName: accountsTable.path,
      balance: sum(postingsTable.amount),
    })
    .from(postingsTable)
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .groupBy(accountsTable.id);

  return results.map((row) => ({
    accountName: row.accountName,
    balance: parseFloat(row.balance || '0'),
  }));
}

function buildWhereClause(
  query: ReportQuery,
  postingsTable: typeof postings,
  transactionsTable: typeof transactions,
  accountsTable: typeof accounts
) {
  const conditions = [];

  if (query.startDate && query.endDate) {
    conditions.push(between(transactionsTable.date, query.startDate, query.endDate));
  } else if (query.startDate) {
    conditions.push(gte(transactionsTable.date, query.startDate));
  } else if (query.endDate) {
    conditions.push(lte(transactionsTable.date, query.endDate));
  }

  if (query.accountPattern) {
    const pattern = query.accountPattern.toLowerCase();
    conditions.push(
      or(
        eq(sql`LOWER(${accountsTable.path})`, pattern),
        like(sql`LOWER(${accountsTable.path})`, `${pattern}:%`)
      )
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Generates a financial report by executing SQL queries.
 */
export async function generateReport(
  db: DbClient,
  postingsTable: typeof postings,
  transactionsTable: typeof transactions,
  accountsTable: typeof accounts,
  query: ReportQuery
): Promise<FinancialReport> {
  const whereClause = buildWhereClause(query, postingsTable, transactionsTable, accountsTable);

  const queryBuilder = db
    .select({
      account: accountsTable.path,
      balance: sum(postingsTable.amount),
    })
    .from(postingsTable)
    .innerJoin(transactionsTable, eq(postingsTable.transactionId, transactionsTable.id))
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id));

  const flatBalances = await (whereClause 
    ? queryBuilder.where(whereClause) 
    : queryBuilder
  ).groupBy(accountsTable.id);

  // Roll up child account balances to parent accounts (hierarchical rollup)
  const rollupMap = new Map<string, number>();

  for (const row of flatBalances) {
    const accountPath = row.account;
    const balance = parseFloat(row.balance || '0');

    const parts = accountPath.split(':');
    for (let len = 1; len <= parts.length; len++) {
      const parentPath = parts.slice(0, len).join(':');
      rollupMap.set(parentPath, (rollupMap.get(parentPath) || 0) + balance);
    }
  }

  const rows: FinancialReportRow[] = [];
  for (const [accountName, balance] of rollupMap.entries()) {
    if (query.accountPattern) {
      const pattern = query.accountPattern.toLowerCase();
      if (accountName.toLowerCase() !== pattern && !accountName.toLowerCase().startsWith(pattern + ':')) {
        continue;
      }
    }

    const depth = accountName.split(':').length - 1;
    rows.push({
      account: accountName,
      balance,
      depth,
    });
  }

  rows.sort((a, b) => a.account.localeCompare(b.account));

  let total = 0;
  for (const row of flatBalances) {
    const accountName = row.account;
    const balance = parseFloat(row.balance || '0');

    if (query.accountPattern) {
      const pattern = query.accountPattern.toLowerCase();
      if (accountName.toLowerCase() === pattern || accountName.toLowerCase().startsWith(pattern + ':')) {
        total += balance;
      }
    } else {
      total += balance;
    }
  }

  return {
    title: 'Financial Report',
    query,
    rows,
    total,
  };
}

interface DBPosting {
  id: string;
  transactionId: string;
  amount: number;
  accountPath: string;
}

/**
 * Loads all transactions from the database, grouped with their postings,
 * and derives their transaction type and amount in-memory.
 */
interface DBPosting {
  id: string;
  account: string;
  amount: number;
  notes: string | null;
}

/**
 * Loads all transactions from the database, grouped with their postings,
 * and derives their transaction type and amount dynamically in SQLite.
 */
export async function getAllTransactions(
  db: DbClient,
  transactionsTable: typeof transactions,
  postingsTable: typeof postings,
  accountsTable: typeof accounts,
  options?: { excludeOpeningBalances?: boolean }
): Promise<Transaction[]> {
  const conditions = [];
  if (options?.excludeOpeningBalances) {
    conditions.push(
      sql`LOWER(${transactionsTable.description}) NOT IN ('opening balances', 'opening balance')`
    );
    conditions.push(
      or(
        sql`${transactionsTable.notes} IS NULL`,
        sql`LOWER(${transactionsTable.notes}) NOT IN ('opening balances', 'opening balance')`
      )
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const queryResult = await db
    .select({
      id: transactionsTable.id,
      date: transactionsTable.date,
      description: transactionsTable.description,
      notes: transactionsTable.notes,
      amount: sql<number>`SUM(CASE WHEN ${postingsTable.amount} > 0 THEN ${postingsTable.amount} ELSE 0 END)`,
      type: sql<string>`CASE 
        WHEN COUNT(${postingsTable.id}) > 2 THEN 'Split'
        WHEN COUNT(${postingsTable.id}) = 2 THEN
          CASE 
            WHEN SUM(CASE WHEN LOWER(${accountsTable.type}) = 'income' THEN 1 ELSE 0 END) > 0 THEN 'Income'
            WHEN SUM(CASE WHEN LOWER(${accountsTable.type}) IN ('asset', 'liability', 'equity') THEN 1 ELSE 0 END) = 2 THEN 'Transfer'
            ELSE 'Expense'
          END
        ELSE 'Expense'
      END`,
      postingsJson: sql<string>`json_group_array(
        json_object(
          'id', ${postingsTable.id},
          'account', ${accountsTable.path},
          'amount', ${postingsTable.amount},
          'notes', NULL
        )
      )`
    })
    .from(transactionsTable)
    .innerJoin(postingsTable, eq(transactionsTable.id, postingsTable.transactionId))
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .where(whereClause)
    .groupBy(transactionsTable.id)
    .orderBy(desc(transactionsTable.date));

  return queryResult.map((row) => {
    // Cast parsed JSON array from SQLite json_group_array to DBPosting[] structure
    const dbPostings = (typeof row.postingsJson === 'string'
      ? JSON.parse(row.postingsJson)
      : row.postingsJson) as DBPosting[];

    const finalPostings = dbPostings.map((p) => ({
      // Cast string id to TransactionLineId brand
      id: p.id as TransactionLineId,
      account: p.account,
      amount: typeof p.amount === 'string' ? parseFloat(p.amount) : Number(p.amount),
      notes: p.notes,
    }));

    // Cast string type to TransactionType union
    const type = row.type as 'Income' | 'Expense' | 'Transfer' | 'Split';

    return {
      // Cast string id to TransactionId brand
      id: toTransactionId(row.id),
      date: row.date,
      type,
      amount: typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount),
      notes: row.notes || null,
      postings: finalPostings,
    };
  });
}

/**
 * Loads all account names from the accounts table.
 */
export async function getRawAccounts(
  db: DbClient,
  accountsTable: typeof accounts
): Promise<string[]> {
  const accList = await db.select({ name: accountsTable.path }).from(accountsTable);
  return accList.map((a) => a.name).sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Returns a list of transaction postings for an account, with running balance.
 */
export async function getAccountRegisterInMemory(
  db: DbClient,
  transactionsTable: typeof transactions,
  postingsTable: typeof postings,
  accountsTable: typeof accounts,
  account: string,
  startDate?: string,
  endDate?: string
): Promise<AccountLedgerResponse> {
  const lowerAccount = account.toLowerCase();

  const accountConditions = or(
    eq(sql`LOWER(${accountsTable.path})`, lowerAccount),
    like(sql`LOWER(${accountsTable.path})`, `${lowerAccount}:%`)
  );

  // 1. Calculate Beginning Balance (sum of all postings before startDate)
  let finalBeginningBalance = 0;
  if (startDate) {
    const [beginningBalanceResult] = await db
      .select({ sum: sum(postingsTable.amount) })
      .from(postingsTable)
      .innerJoin(transactionsTable, eq(postingsTable.transactionId, transactionsTable.id))
      .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
      .where(
        and(
          accountConditions,
          lt(transactionsTable.date, startDate)
        )
      );
    finalBeginningBalance = parseFloat(beginningBalanceResult?.sum || '0');
  }

  const txTypeSubquery = db
    .select({
      id: transactionsTable.id,
      type: sql<string>`CASE 
        WHEN COUNT(${postingsTable.id}) > 2 THEN 'Split'
        WHEN COUNT(${postingsTable.id}) = 2 THEN
          CASE 
            WHEN SUM(CASE WHEN LOWER(${accountsTable.type}) = 'income' THEN 1 ELSE 0 END) > 0 THEN 'Income'
            WHEN SUM(CASE WHEN LOWER(${accountsTable.type}) IN ('asset', 'liability', 'equity') THEN 1 ELSE 0 END) = 2 THEN 'Transfer'
            ELSE 'Expense'
          END
        ELSE 'Expense'
      END`.as('tx_type'),
    })
    .from(transactionsTable)
    .innerJoin(postingsTable, eq(transactionsTable.id, postingsTable.transactionId))
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .groupBy(transactionsTable.id)
    .as('tx_types');

  // 2. Select rows using Window Function inside a Subquery to compute running balance from inception
  const sq = db
    .select({
      id: transactionsTable.id,
      date: transactionsTable.date,
      description: transactionsTable.description,
      type: txTypeSubquery.type,
      amount: postingsTable.amount,
      runningBalance: sql<number>`SUM(${postingsTable.amount}) OVER (
        ORDER BY ${transactionsTable.date} ASC, ${transactionsTable.id} ASC
      )`.as('running_balance'),
    })
    .from(postingsTable)
    .innerJoin(transactionsTable, eq(postingsTable.transactionId, transactionsTable.id))
    .innerJoin(accountsTable, eq(postingsTable.accountId, accountsTable.id))
    .innerJoin(txTypeSubquery, eq(transactionsTable.id, txTypeSubquery.id))
    .where(accountConditions)
    .as('sq');

  const dateConditions = [];
  if (startDate) {
    dateConditions.push(gte(sq.date, startDate));
  }
  if (endDate) {
    dateConditions.push(lte(sq.date, endDate));
  }

  const rowsResult = await db
    .select({
      id: sq.id,
      date: sq.date,
      description: sq.description,
      type: sq.type,
      amount: sq.amount,
      runningBalance: sq.runningBalance,
    })
    .from(sq)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
    .orderBy(asc(sq.date), asc(sq.id));

  const rows = rowsResult.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    type: row.type,
    amount: row.amount,
    runningBalance: typeof row.runningBalance === 'string' ? parseFloat(row.runningBalance) : Number(row.runningBalance),
  }));

  const parts = account.split(':');
  const accountDisplayName = parts[parts.length - 1] || account;

  return {
    accountId: account,
    accountDisplayName,
    beginningBalance: finalBeginningBalance,
    rows,
  };
}
