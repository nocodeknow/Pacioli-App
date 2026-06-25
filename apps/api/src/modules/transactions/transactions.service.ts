import { 
  getAllTransactions as getDbTransactions,
  createTransaction as createDbTx,
  updateTransaction as updateDbTx,
  deleteTransaction as deleteDbTx,
} from '@finance-platform/ledger-interface';
import type { 
  Transaction, 
  TransactionId, 
  TransactionPosting, 
  TransactionLineId, 
} from '@finance-platform/shared-types';
import { toTransactionId } from '@finance-platform/shared-types';
import { randomUUID } from 'crypto';
import { NotFoundError } from '../../errors/index.js';
import { db } from '../../db/client.js';
import { transactions, postings, accounts } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export type CreateTransactionInput = Omit<Transaction, 'id' | 'postings'> & {
  postings: (Omit<Transaction['postings'][number], 'id'> & { id?: TransactionLineId })[];
};

export class TransactionsService {
  async getAllTransactions(): Promise<Transaction[]> {
    return getDbTransactions(db, transactions, postings, accounts, { excludeOpeningBalances: true });
  }

  async getTransactionById(id: TransactionId): Promise<Transaction> {
    const queryResult = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        notes: transactions.notes,
        amount: sql<number>`SUM(CASE WHEN ${postings.amount} > 0 THEN ${postings.amount} ELSE 0 END)`,
        type: sql<string>`CASE 
          WHEN COUNT(${postings.id}) > 2 THEN 'Split'
          WHEN COUNT(${postings.id}) = 2 THEN
            CASE 
              WHEN SUM(CASE WHEN LOWER(${accounts.type}) = 'income' THEN 1 ELSE 0 END) > 0 THEN 'Income'
              WHEN SUM(CASE WHEN LOWER(${accounts.type}) IN ('asset', 'liability', 'equity') THEN 1 ELSE 0 END) = 2 THEN 'Transfer'
              ELSE 'Expense'
            END
          ELSE 'Expense'
        END`,
        postingsJson: sql<string>`json_group_array(
          json_object(
            'id', ${postings.id},
            'account', ${accounts.path},
            'amount', ${postings.amount},
            'notes', NULL
          )
        )`
      })
      .from(transactions)
      .innerJoin(postings, eq(transactions.id, postings.transactionId))
      .innerJoin(accounts, eq(postings.accountId, accounts.id))
      .where(eq(transactions.id, id))
      .groupBy(transactions.id);

    if (queryResult.length === 0) {
      throw new NotFoundError(`Transaction with ID ${id} not found`);
    }

    const row = queryResult[0];

    interface DBPosting {
      id: string;
      account: string;
      amount: number;
      notes: string | null;
    }

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
  }

  async createTransaction(tx: CreateTransactionInput, lastSeenSha256?: string): Promise<Transaction> {
    const id = randomUUID() as TransactionId;
    const finalPostings = tx.postings.map(post => ({
      ...post,
      id: post.id || (randomUUID() as TransactionLineId),
    })) as TransactionPosting[];

    const finalTx: Transaction = {
      ...tx,
      id,
      postings: finalPostings,
    };

    await createDbTx(db, transactions, postings, accounts, finalTx, undefined, lastSeenSha256);
    return finalTx;
  }

  async updateTransaction(id: TransactionId, tx: CreateTransactionInput, lastSeenSha256?: string): Promise<Transaction> {
    // Check if exists
    await this.getTransactionById(id);

    const finalPostings = tx.postings.map(post => ({
      ...post,
      id: post.id || (randomUUID() as TransactionLineId),
    })) as TransactionPosting[];

    const finalTx: Transaction = {
      ...tx,
      id,
      postings: finalPostings,
    };

    await updateDbTx(db, transactions, postings, accounts, id, finalTx, undefined, lastSeenSha256);
    return finalTx;
  }

  async deleteTransaction(id: TransactionId, lastSeenSha256?: string): Promise<void> {
    // Check if exists
    await this.getTransactionById(id);
    await deleteDbTx(db, transactions, id, lastSeenSha256);
  }
}

export const transactionsService = new TransactionsService();
