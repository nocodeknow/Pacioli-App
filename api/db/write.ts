import { eq, sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { BaseSQLiteDatabase, SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { ResultSet } from '@libsql/client';
type DbClient = BaseSQLiteDatabase<"async", ResultSet, Record<string, unknown>>;
type TxClient = SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>;
import { randomUUID } from 'crypto';
import { accounts, transactions, postings } from './schema.js';

export interface TransactionInput {
  id: string;
  date: string;
  type?: 'Income' | 'Expense' | 'Transfer' | 'Split';
  amount?: number;
  notes?: string | null;
  postings: {
    id?: string;
    account?: string;
    accountId?: string;
    amount: number;
    notes?: string | null;
  }[];
}

/**
 * Appends a new balanced transaction to the SQLite database.
 * Checks for zero-balance safety before inserting.
 */
export async function createTransaction(
  db: DbClient,
  transactionsTable: typeof transactions,
  postingsTable: typeof postings,
  accountsTable: typeof accounts,
  tx: TransactionInput,
  _nameMap?: Record<string, string>,
  _lastSeenSha256?: string
): Promise<void> {
  // Concurrency check
  if (_lastSeenSha256 && _lastSeenSha256 !== 'db-concurrency-token') {
    throw new Error('CONCURRENCY_ERROR: The ledger database state has changed.');
  }

  // Validate double-entry constraint
  let postingsSum = 0;
  for (const post of tx.postings) {
    postingsSum += post.amount;
  }
  if (Math.abs(postingsSum) > 0.009) {
    throw new Error(`Unbalanced transaction! Postings sum does not balance to zero. Difference: ${postingsSum}`);
  }

  await db.transaction(async (txDb) => {
    // Insert transaction
    await txDb.insert(transactionsTable).values({
      id: tx.id,
      date: tx.date,
      description: tx.notes || `${tx.type || 'Expense'} Transaction`,
      notes: tx.notes || null,
    });

    // Insert postings
    for (const post of tx.postings) {
      let accountId = post.accountId;
      if (!accountId && post.account) {
        // Resolve accountId from path
        const [acc] = await txDb
          .select({ id: accountsTable.id, isGroup: accountsTable.isGroup })
          .from(accountsTable)
          .where(sql`LOWER(${accountsTable.path}) = ${post.account.toLowerCase()}`);
        if (!acc) {
          throw new Error(`Account not found in database for path: "${post.account}"`);
        }
        if (acc.isGroup) {
          throw new Error(`Cannot post transaction to a group/header account: "${post.account}"`);
        }
        accountId = acc.id;
      }

      await txDb.insert(postingsTable).values({
        id: post.id || randomUUID(),
        transactionId: tx.id,
        accountId: accountId as string,
        amount: post.amount,
      });
    }
  });
}

/**
 * Replaces an existing transaction in the database in-place.
 */
export async function updateTransaction(
  db: DbClient,
  transactionsTable: typeof transactions,
  postingsTable: typeof postings,
  accountsTable: typeof accounts,
  id: string,
  tx: TransactionInput,
  _nameMap?: Record<string, string>,
  _lastSeenSha256?: string
): Promise<void> {
  // Concurrency check
  if (_lastSeenSha256 && _lastSeenSha256 !== 'db-concurrency-token') {
    throw new Error('CONCURRENCY_ERROR: The ledger database state has changed.');
  }

  // Validate double-entry constraint
  let postingsSum = 0;
  for (const post of tx.postings) {
    postingsSum += post.amount;
  }
  if (Math.abs(postingsSum) > 0.009) {
    throw new Error(`Unbalanced transaction! Postings sum does not balance to zero. Difference: ${postingsSum}`);
  }

  await db.transaction(async (txDb) => {
    // 1. Update transaction header
    await txDb
      .update(transactionsTable)
      .set({
        date: tx.date,
        description: tx.notes || `${tx.type || 'Expense'} Transaction`,
        notes: tx.notes || null,
      })
      .where(eq(transactionsTable.id, id));

    // 2. Delete old postings
    await txDb.delete(postingsTable).where(eq(postingsTable.transactionId, id));

    // 3. Insert new postings
    for (const post of tx.postings) {
      let accountId = post.accountId;
      if (!accountId && post.account) {
        // Resolve accountId from path
        const [acc] = await txDb
          .select({ id: accountsTable.id, isGroup: accountsTable.isGroup })
          .from(accountsTable)
          .where(sql`LOWER(${accountsTable.path}) = ${post.account.toLowerCase()}`);
        if (!acc) {
          throw new Error(`Account not found in database for path: "${post.account}"`);
        }
        if (acc.isGroup) {
          throw new Error(`Cannot post transaction to a group/header account: "${post.account}"`);
        }
        accountId = acc.id;
      }

      await txDb.insert(postingsTable).values({
        id: post.id || randomUUID(),
        transactionId: id,
        accountId: accountId as string,
        amount: post.amount,
      });
    }
  });
}

/**
 * Deletes a transaction from the database.
 */
export async function deleteTransaction(
  db: DbClient,
  transactionsTable: typeof transactions,
  id: string,
  _lastSeenSha256?: string
): Promise<void> {
  // Concurrency check
  if (_lastSeenSha256 && _lastSeenSha256 !== 'db-concurrency-token') {
    throw new Error('CONCURRENCY_ERROR: The ledger database state has changed.');
  }

  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
}

/**
 * Declares an account. Database-driven account creation manages this, so this is a safe no-op.
 */
export async function declareAccount(_name: string): Promise<void> {
  // No-op in DB mode
}

/**
 * Removes an account declaration. Safe no-op in DB mode.
 */
export async function removeAccountDeclaration(_name: string): Promise<void> {
  // No-op in DB mode
}

/**
 * Recursively updates the path of an account and all its descendants.
 */
export async function updateAccountPathsRecursively(
  txDb: TxClient,
  accountsTable: typeof accounts,
  accountId: string,
  parentPath: string | null
): Promise<void> {
  const [account] = await txDb
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));
  if (!account) return;

  const oldPathParts = account.path.split(':');
  const segment = oldPathParts[oldPathParts.length - 1];

  const newPath = parentPath ? `${parentPath}:${segment}` : segment;
  await txDb
    .update(accountsTable)
    .set({ path: newPath })
    .where(eq(accountsTable.id, accountId));

  const children = await txDb
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.parentId, accountId));

  for (const child of children) {
    await updateAccountPathsRecursively(txDb, accountsTable, child.id, newPath);
  }
}

async function isDescendantOrSelf(
  txDb: TxClient | DbClient,
  accountsTable: typeof accounts,
  checkParentId: string | null,
  targetAccountId: string
): Promise<boolean> {
  let currentParentId = checkParentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (currentParentId === targetAccountId) {
      return true;
    }
    if (visited.has(currentParentId)) {
      return true;
    }
    visited.add(currentParentId);

    const [parent] = await txDb
      .select({ parentId: accountsTable.parentId })
      .from(accountsTable)
      .where(eq(accountsTable.id, currentParentId));

    if (!parent) {
      break;
    }
    currentParentId = parent.parentId;
  }
  return false;
}

/**
 * Updates an account's parentId / displayName (name) and recursively recalculates paths
 * inside a database transaction.
 */
export async function updateAccountHierarchy(
  db: DbClient,
  accountsTable: typeof accounts,
  accountId: string,
  updates: { parentId?: string | null; displayName?: string; path?: string }
): Promise<void> {
  await db.transaction(async (txDb) => {
    // 1. Fetch current target account
    const [account] = await txDb
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId));
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const parentId = updates.parentId !== undefined ? updates.parentId : account.parentId;
    if (parentId) {
      const isCyclic = await isDescendantOrSelf(txDb, accountsTable, parentId, accountId);
      if (isCyclic) {
        throw new Error(`Cyclic parent reference detected: account cannot be a child of itself or its descendants.`);
      }
    }

    const name = updates.displayName !== undefined ? updates.displayName : account.name;

    // Resolve target account's new path
    let newPath = updates.path !== undefined ? updates.path : account.path;

    if (updates.path === undefined) {
      const oldPathParts = account.path.split(':');
      const newSegment = updates.displayName !== undefined ? updates.displayName : oldPathParts[oldPathParts.length - 1];

      let parentPath: string | null = null;
      if (parentId) {
        const [parent] = await txDb
          .select({ path: accountsTable.path })
          .from(accountsTable)
          .where(eq(accountsTable.id, parentId));
        if (!parent) {
          throw new Error(`Parent account not found: ${parentId}`);
        }
        parentPath = parent.path;
      }
      newPath = parentPath ? `${parentPath}:${newSegment}` : newSegment;
    }

    // 2. Update parentId, name (displayName) and path on the target account
    await txDb
      .update(accountsTable)
      .set({ parentId, name, path: newPath })
      .where(eq(accountsTable.id, accountId));

    // 3. Recursively update children paths starting from the children
    const children = await txDb
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.parentId, accountId));

    for (const child of children) {
      await updateAccountPathsRecursively(txDb, accountsTable, child.id, newPath);
    }
  });
}

/**
 * Renames an account and updates its path and the path of all children recursively.
 */
export async function renameAccountInJournal(
  db: DbClient,
  accountsTable: typeof accounts,
  _categoriesTable: unknown,
  _postingsTable: unknown,
  oldPath: string,
  newPath: string
): Promise<void> {
  const lowerOld = oldPath.toLowerCase();

  await db.transaction(async (txDb) => {
    // 1. Find the target account by path
    const [targetAcc] = await txDb
      .select()
      .from(accountsTable)
      .where(sql`LOWER(${accountsTable.path}) = ${lowerOld}`);

    if (!targetAcc) {
      throw new Error(`Account with path "${oldPath}" not found.`);
    }

    // 2. Extract new local name (e.g. "Assets:Bank:HDFC" -> "HDFC")
    const newLocalName = newPath.split(':').pop() || newPath;

    // 3. Update parentId and name/displayName of the target account
    const parts = newPath.split(':');
    let parentId: string | null = null;
    if (parts.length > 1) {
      const parentPath = parts.slice(0, parts.length - 1).join(':');
      const [parent] = await txDb
        .select({ id: accountsTable.id })
        .from(accountsTable)
        .where(sql`LOWER(${accountsTable.path}) = ${parentPath.toLowerCase()}`);
      if (parent) {
        parentId = parent.id;
      }
    }

    if (parentId) {
      const isCyclic = await isDescendantOrSelf(txDb, accountsTable, parentId, targetAcc.id);
      if (isCyclic) {
        throw new Error(`Cyclic parent reference detected: account cannot be renamed to a path under its own descendants.`);
      }
    }

    await txDb
      .update(accountsTable)
      .set({
        name: newLocalName,
        path: newPath,
        parentId: parentId,
      })
      .where(eq(accountsTable.id, targetAcc.id));

    // Recursively update children
    const children = await txDb
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.parentId, targetAcc.id));

    for (const child of children) {
      await updateAccountPathsRecursively(txDb, accountsTable, child.id, newPath);
    }
  });
}
