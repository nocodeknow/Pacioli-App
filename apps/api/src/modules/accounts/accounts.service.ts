import type { AccountEntity, AccountId, Transaction, TransactionId, TransactionLineId, AccountLedgerResponse, AccountType } from '@finance-platform/shared-types';
import { toAccountId, toTransactionId } from '@finance-platform/shared-types';
import { BadRequestError, NotFoundError } from '../../errors/index.js';
import { 
  createTransaction as createDbTx, 
  updateTransaction as updateDbTx,
  deleteTransaction as deleteDbTx,
  renameAccountInJournal,
  getAccountRegisterInMemory,
  updateAccountHierarchy
} from '@finance-platform/ledger-interface';
import { randomUUID } from 'crypto';
import { db } from '../../db/client.js';
import { accounts, postings, transactions } from '../../db/schema.js';
import { accountsRepository } from './accounts.repository.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

function getAccountTypeFromPath(path: string): AccountType {
  const root = path.split(':')[0].toLowerCase();
  if (root === 'assets') return 'Asset';
  if (root === 'liabilities') return 'Liability';
  if (root === 'equity') return 'Equity';
  if (root === 'income') return 'Income';
  if (root === 'expenses') return 'Expense';
  return 'Asset';
}

export class AccountsService {
  /**
   * Finds all "Opening Balances" transaction IDs containing a posting for the given account.
   */
  private async findOpeningBalanceTxIds(accountName: string): Promise<TransactionId[]> {
    const results = await db
      .select({ transactionId: postings.transactionId })
      .from(postings)
      .innerJoin(transactions, eq(postings.transactionId, transactions.id))
      .where(
        and(
          inArray(sql`LOWER(${transactions.description})`, ['opening balances', 'opening balance']),
          eq(postings.accountId, db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.path, accountName))
          )
        )
      );
    return results.map(r => toTransactionId(r.transactionId));
  }

  private toPublicAccount(account: AccountEntity): AccountEntity {
    const { path: _, ...publicAccount } = account;
    return publicAccount as AccountEntity;
  }

  async getAllAccounts(): Promise<AccountEntity[]> {
    const accounts = await accountsRepository.findAll();
    return accounts.map(a => this.toPublicAccount(a));
  }

  async getAccountById(id: AccountId): Promise<AccountEntity> {
    const account = await accountsRepository.findById(id);
    if (!account) {
      // Try to lookup by name (since Hledger IDs are name paths)
      const accountByName = await accountsRepository.findByName(id as string);
      if (!accountByName) {
        throw new NotFoundError(`Account with ID "${id}" not found`);
      }
      return this.toPublicAccount(accountByName);
    }
    return this.toPublicAccount(account);
  }

  private async ensureParentPathsExist(pathStr: string, type: AccountType, date: string): Promise<AccountId | null> {
    const parts = pathStr.split(':');
    if (parts.length <= 1) return null;

    const parentPath = parts.slice(0, parts.length - 1).join(':');
    const existingParent = await accountsRepository.findByName(parentPath);
    if (existingParent) {
      return toAccountId(existingParent.id);
    }

    const parentType = getAccountTypeFromPath(parentPath);
    const grandparentId = await this.ensureParentPathsExist(parentPath, parentType, date);
    const parentLocalName = parts[parts.length - 2];
    const newParent = await accountsRepository.create({
      name: parentPath,
      displayName: parentLocalName,
      type: parentType,
      isGroup: true,
      parentId: grandparentId,
      path: parentPath,
      openingBalance: 0,
      openingDate: date,
      archived: false,
      lastReconciledDate: null,
      notes: `Group header for ${parentLocalName}`,
    });

    return toAccountId(newParent.id);
  }

  async createAccount(data: Omit<AccountEntity, 'id'>): Promise<AccountEntity> {
    const existing = await accountsRepository.findByName(data.name);
    if (existing) {
      throw new BadRequestError(`Account with path name "${data.name}" already exists`);
    }

    // Ensure parent groups are created in the database and resolve parentId
    const parentId = await this.ensureParentPathsExist(data.name, data.type, data.openingDate);

    // 1. Insert account metadata into accounts table
    const newAccount = await accountsRepository.create({
      ...data,
      parentId,
    });

    // 2. Write opening balance transaction to ledger if non-zero
    if (data.openingBalance !== 0) {
      const txId = randomUUID();
      const absAmount = Math.abs(data.openingBalance);

      const tx: Transaction = {
        id: toTransactionId(txId),
        date: data.openingDate,
        type: data.openingBalance < 0 ? 'Income' : 'Expense',
        amount: absAmount,
        notes: 'Opening Balances',
        postings: [
          {
            id: randomUUID() as TransactionLineId,
            account: 'Equity:Opening Balances',
            amount: -data.openingBalance,
            notes: null,
          },
          {
            id: randomUUID() as TransactionLineId,
            account: data.name,
            amount: data.openingBalance,
            notes: null,
          },
        ],
      };

      await createDbTx(db, transactions, postings, accounts, tx);
    }

    return this.toPublicAccount(newAccount);
  }

  async updateAccount(id: AccountId, updates: Partial<Omit<AccountEntity, 'id'>>): Promise<AccountEntity> {
    const oldAccount = await this.getAccountById(id);
    const resolvedOldName = oldAccount.name;

    let finalName = resolvedOldName;
    let resolvedParentId = oldAccount.parentId;

    // Handle rename or path change
    if (updates.name && updates.name.toLowerCase() !== resolvedOldName.toLowerCase()) {
      const existing = await accountsRepository.findByName(updates.name);
      if (existing) {
        throw new BadRequestError(`Account with path name "${updates.name}" already exists`);
      }

      // Rename across accounts/postings
      await renameAccountInJournal(db, accounts, null, postings, resolvedOldName, updates.name);
      finalName = updates.name;
    }

    // Resolve the parent ID from the path name (either updated or old)
    // This serves as the source of truth for the hierarchy!
    resolvedParentId = await this.ensureParentPathsExist(
      finalName, 
      updates.type || oldAccount.type, 
      updates.openingDate || oldAccount.openingDate
    );

    // Handle hierarchy updates (only if parentId or displayName actually changed)
    const hasParentChange = resolvedParentId !== oldAccount.parentId;
    const hasDisplayNameChange = updates.displayName !== undefined && updates.displayName !== oldAccount.displayName;

    if (hasParentChange || hasDisplayNameChange) {
      const hasPathChange = updates.name !== undefined && updates.name.toLowerCase() !== resolvedOldName.toLowerCase();
      await updateAccountHierarchy(db, accounts, oldAccount.id, {
        parentId: resolvedParentId,
        displayName: updates.displayName || oldAccount.displayName,
        ...(hasPathChange ? { path: finalName } : {}),
      });

      // Retrieve the newly calculated path
      const [newRecord] = await db
        .select({ path: accounts.path })
        .from(accounts)
        .where(eq(accounts.id, oldAccount.id));
      if (newRecord) {
        finalName = newRecord.path;
      }
    }

    // Finally, update the database record
    const updatedAccount = await accountsRepository.update(oldAccount.id, {
      ...updates,
      name: finalName,
      parentId: resolvedParentId,
    });

    if (!updatedAccount) {
      throw new NotFoundError(`Failed to update account "${id}"`);
    }

    // Handle opening balance and date updates
    const hasOpeningBalanceUpdate = updates.openingBalance !== undefined;
    const hasOpeningDateUpdate = updates.openingDate !== undefined;

    if (hasOpeningBalanceUpdate || hasOpeningDateUpdate) {
      const targetBalance = updates.openingBalance !== undefined ? updates.openingBalance : oldAccount.openingBalance;
      const targetDate = updates.openingDate !== undefined ? updates.openingDate : oldAccount.openingDate;

      const existingTxIds = await this.findOpeningBalanceTxIds(finalName);

      if (targetBalance === 0) {
        for (const txId of existingTxIds) {
          await deleteDbTx(db, transactions, txId);
        }
      } else {
        if (existingTxIds.length > 0) {
          for (const txId of existingTxIds) {
            const absAmount = Math.abs(targetBalance);
            const tx: Transaction = {
              id: txId,
              date: targetDate,
              type: targetBalance < 0 ? 'Income' : 'Expense',
              amount: absAmount,
              notes: 'Opening Balances',
              postings: [
                {
                  id: randomUUID() as TransactionLineId,
                  account: 'Equity:Opening Balances',
                  amount: -targetBalance,
                  notes: null,
                },
                {
                  id: randomUUID() as TransactionLineId,
                  account: finalName,
                  amount: targetBalance,
                  notes: null,
                },
              ],
            };
            await updateDbTx(db, transactions, postings, accounts, txId, tx);
          }
        } else {
          const txId = randomUUID() as TransactionId;
          const absAmount = Math.abs(targetBalance);
          const tx: Transaction = {
            id: txId,
            date: targetDate,
            type: targetBalance < 0 ? 'Income' : 'Expense',
            amount: absAmount,
            notes: 'Opening Balances',
            postings: [
              {
                id: randomUUID() as TransactionLineId,
                account: 'Equity:Opening Balances',
                amount: -targetBalance,
                notes: null,
              },
              {
                id: randomUUID() as TransactionLineId,
                account: finalName,
                amount: targetBalance,
                notes: null,
              },
            ],
          };
          await createDbTx(db, transactions, postings, accounts, tx);
        }
      }
    }

    return this.toPublicAccount(updatedAccount);
  }

  async getAccountLedger(
    id: AccountId,
    startDate?: string,
    endDate?: string
  ): Promise<AccountLedgerResponse> {
    const account = await this.getAccountById(id);
    const ledger = await getAccountRegisterInMemory(db, transactions, postings, accounts, account.name, startDate, endDate);
    ledger.accountDisplayName = account.displayName;
    return ledger;
  }

  async deleteAccount(id: AccountId): Promise<void> {
    const account = await this.getAccountById(id);
    const accountName = account.name;

    // Check if the account has active child accounts
    const hasChildren = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.parentId, account.id))
      .limit(1);

    if (hasChildren.length > 0) {
      throw new BadRequestError(`Cannot delete account "${account.displayName}" because it has active child accounts.`);
    }

    // Check if the account has any transaction history (excluding opening balances)
    const nonObPostings = await db
      .select({ id: postings.id })
      .from(postings)
      .innerJoin(transactions, eq(postings.transactionId, transactions.id))
      .where(
        and(
          eq(postings.accountId, account.id),
          sql`LOWER(${transactions.description}) NOT IN ('opening balances', 'opening balance')`
        )
      )
      .limit(1);

    if (nonObPostings.length > 0) {
      throw new BadRequestError(`Cannot delete account "${account.displayName}" because it has transaction history. Delete its transactions first.`);
    }

    // Find and delete all opening balance transactions for this account
    const openingTxIds = await this.findOpeningBalanceTxIds(accountName);
    for (const txId of openingTxIds) {
      await deleteDbTx(db, transactions, txId);
    }

    // Delete the account metadata record from the accounts table
    await db.delete(accounts).where(eq(accounts.id, account.id));
  }
}

export const accountsService = new AccountsService();
