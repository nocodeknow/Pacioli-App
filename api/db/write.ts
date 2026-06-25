import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from './schema.js';
type DbClient = DrizzleD1Database<typeof schema>;
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

  // Resolve accountId from path for any postings that don't have it
  const postingsWithResolvedAccounts = [];
  for (const post of tx.postings) {
    let accountId = post.accountId;
    if (!accountId && post.account) {
      const [acc] = await db
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
    postingsWithResolvedAccounts.push({
      ...post,
      accountId
    });
  }

  const insertTxQuery = db.insert(transactionsTable).values({
    id: tx.id,
    date: tx.date,
    description: tx.notes || `${tx.type || 'Expense'} Transaction`,
    notes: tx.notes || null,
  });

  const insertPostingQueries = postingsWithResolvedAccounts.map((post) => {
    return db.insert(postingsTable).values({
      id: post.id || randomUUID(),
      transactionId: tx.id,
      accountId: post.accountId as string,
      amount: post.amount,
    });
  });

  await db.batch([insertTxQuery, ...insertPostingQueries]);
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

  // Resolve accountId from path for any postings that don't have it
  const postingsWithResolvedAccounts = [];
  for (const post of tx.postings) {
    let accountId = post.accountId;
    if (!accountId && post.account) {
      const [acc] = await db
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
    postingsWithResolvedAccounts.push({
      ...post,
      accountId
    });
  }

  const updateTxQuery = db
    .update(transactionsTable)
    .set({
      date: tx.date,
      description: tx.notes || `${tx.type || 'Expense'} Transaction`,
      notes: tx.notes || null,
    })
    .where(eq(transactionsTable.id, id));

  const deletePostingsQuery = db
    .delete(postingsTable)
    .where(eq(postingsTable.transactionId, id));

  const insertPostingQueries = postingsWithResolvedAccounts.map((post) => {
    return db.insert(postingsTable).values({
      id: post.id || randomUUID(),
      transactionId: id,
      accountId: post.accountId as string,
      amount: post.amount,
    });
  });

  await db.batch([updateTxQuery, deletePostingsQuery, ...insertPostingQueries]);
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
 * Updates an account's parentId / displayName (name) and recursively recalculates paths
 * inside a database batch.
 */
export async function updateAccountHierarchy(
  db: DbClient,
  accountsTable: typeof accounts,
  accountId: string,
  updates: { parentId?: string | null; displayName?: string; path?: string }
): Promise<void> {
  // Fetch all accounts
  const allAccounts = await db.select().from(accountsTable);
  const accountMap = new Map(allAccounts.map(a => [a.id, a]));

  const targetAccount = accountMap.get(accountId);
  if (!targetAccount) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const parentId = updates.parentId !== undefined ? updates.parentId : targetAccount.parentId;
  if (parentId) {
    // Cyclic reference check
    let currentParentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentParentId) {
      if (currentParentId === accountId) {
        throw new Error(`Cyclic parent reference detected: account cannot be a child of itself or its descendants.`);
      }
      if (visited.has(currentParentId)) {
        break;
      }
      visited.add(currentParentId);
      const parent = accountMap.get(currentParentId);
      if (!parent) break;
      currentParentId = parent.parentId;
    }
  }

  const name = updates.displayName !== undefined ? updates.displayName : targetAccount.name;

  // Calculate target account's new path
  let newPath = updates.path !== undefined ? updates.path : targetAccount.path;
  if (updates.path === undefined) {
    const oldPathParts = targetAccount.path.split(':');
    const newSegment = updates.displayName !== undefined ? updates.displayName : oldPathParts[oldPathParts.length - 1];

    let parentPath: string | null = null;
    if (parentId) {
      const parent = accountMap.get(parentId);
      if (!parent) {
        throw new Error(`Parent account not found: ${parentId}`);
      }
      parentPath = parent.path;
    }
    newPath = parentPath ? `${parentPath}:${newSegment}` : newSegment;
  }

  // Build list of updates to be executed in batch
  const updateOps: { id: string; parentId: string | null; name: string; path: string }[] = [];
  
  updateOps.push({
    id: accountId,
    parentId,
    name,
    path: newPath
  });

  // Recursively calculate updates for descendants in-memory
  const collectDescendantUpdates = (currId: string, currPath: string) => {
    const children = allAccounts.filter(a => a.parentId === currId);
    for (const child of children) {
      const oldPathParts = child.path.split(':');
      const segment = oldPathParts[oldPathParts.length - 1];
      const childNewPath = `${currPath}:${segment}`;

      updateOps.push({
        id: child.id,
        parentId: child.parentId,
        name: child.name,
        path: childNewPath
      });

      collectDescendantUpdates(child.id, childNewPath);
    }
  };

  collectDescendantUpdates(accountId, newPath);

  // Build query batch
  const queries = updateOps.map(op => {
    return db.update(accountsTable)
      .set({ parentId: op.parentId, name: op.name, path: op.path })
      .where(eq(accountsTable.id, op.id));
  });

  await db.batch(queries as any);
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

  // 1. Fetch all accounts
  const allAccounts = await db.select().from(accountsTable);
  const accountMap = new Map(allAccounts.map(a => [a.id, a]));

  // 2. Find target account
  const targetAcc = allAccounts.find(a => a.path.toLowerCase() === lowerOld);
  if (!targetAcc) {
    throw new Error(`Account with path "${oldPath}" not found.`);
  }

  // 3. Extract new local name (e.g. "Assets:Bank:HDFC" -> "HDFC")
  const newLocalName = newPath.split(':').pop() || newPath;

  // 4. Resolve parentId
  const parts = newPath.split(':');
  let parentId: string | null = null;
  if (parts.length > 1) {
    const parentPath = parts.slice(0, parts.length - 1).join(':').toLowerCase();
    const parent = allAccounts.find(a => a.path.toLowerCase() === parentPath);
    if (parent) {
      parentId = parent.id;
    }
  }

  // Cyclic reference check
  if (parentId) {
    let currentParentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentParentId) {
      if (currentParentId === targetAcc.id) {
        throw new Error(`Cyclic parent reference detected: account cannot be renamed to a path under its own descendants.`);
      }
      if (visited.has(currentParentId)) {
        break;
      }
      visited.add(currentParentId);
      const parent = accountMap.get(currentParentId);
      if (!parent) break;
      currentParentId = parent.parentId;
    }
  }

  const updateOps: { id: string; parentId: string | null; name: string; path: string }[] = [];

  updateOps.push({
    id: targetAcc.id,
    parentId,
    name: newLocalName,
    path: newPath
  });

  // Recursively calculate updates for descendants in-memory
  const collectDescendantUpdates = (currId: string, currPath: string) => {
    const children = allAccounts.filter(a => a.parentId === currId);
    for (const child of children) {
      const oldPathParts = child.path.split(':');
      const segment = oldPathParts[oldPathParts.length - 1];
      const childNewPath = `${currPath}:${segment}`;

      updateOps.push({
        id: child.id,
        parentId: child.parentId,
        name: child.name,
        path: childNewPath
      });

      collectDescendantUpdates(child.id, childNewPath);
    }
  };

  collectDescendantUpdates(targetAcc.id, newPath);

  // Build query batch
  const queries = updateOps.map(op => {
    return db.update(accountsTable)
      .set({ parentId: op.parentId, name: op.name, path: op.path })
      .where(eq(accountsTable.id, op.id));
  });

  await db.batch(queries as any);
}
