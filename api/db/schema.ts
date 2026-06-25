import { sqliteTable, text, integer, real, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'crypto';
import { relations } from 'drizzle-orm';

// 1. Unified Accounts Table (Chart of Accounts)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(), // e.g., 'HDFC Bank' or 'Restaurant'
  type: text('type').notNull(), // 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity'
  isGroup: integer('is_group', { mode: 'boolean' }).default(false).notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => accounts.id, { onDelete: 'cascade' }),
  path: text('path').unique().notNull(), // e.g., 'Assets:Bank:HDFC Bank'
  archived: integer('archived', { mode: 'boolean' }).default(false).notNull(),
  lastReconciledDate: text('last_reconciled_date'),
  notes: text('notes'),
});

// 2. Source Records Table
export const sourceRecords = sqliteTable('source_records', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  connectorId: text('connector_id').notNull(), // e.g., 'google-sheets'
  rawPayload: text('raw_payload', { mode: 'json' }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  status: text('status').notNull(), // 'Unprocessed' | 'Processed' | 'Failed'
});

// 3. Transaction Candidates (Staging Inbox) Table
export const transactionCandidates = sqliteTable('transaction_candidates', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  sourceRecordId: text('source_record_id')
    .references(() => sourceRecords.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date'), // YYYY-MM-DD
  amount: real('amount'),
  description: text('description'),
  suggestedAccount: text('suggested_account').references(() => accounts.id, { onDelete: 'set null' }),
  suggestedCategory: text('suggested_category').references(() => accounts.id, { onDelete: 'set null' }),
  notes: text('notes'),
  status: text('status').notNull(), // 'Pending' | 'Approved' | 'Deleted' | 'Deferred'
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Track deletion timestamp
});

// 4. Connectors Configuration Table
export const connectors = sqliteTable('connectors', {
  id: text('id').primaryKey(), // e.g., 'google-sheets'
  name: text('name').notNull(),
  status: text('status').notNull(), // 'Configured' | 'Unconfigured'
  sheetId: text('sheet_id'),
  range: text('range'),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  sheetMappings: text('sheet_mappings', { mode: 'json' }), // Account mappings, etc.
});

// 5. User Preferences Table
export const preferences = sqliteTable('preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  theme: text('theme').default('dark').notNull(),
});

// 6. Transactions Table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  date: text('date').notNull(), // YYYY-MM-DD
  description: text('description').notNull(),
  notes: text('notes'),
});

// 7. Postings Table
export const postings = sqliteTable('postings', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  transactionId: text('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  amount: real('amount').notNull(),
});

// Relations
export const transactionsRelations = relations(transactions, ({ many }) => ({
  postings: many(postings),
}));

export const postingsRelations = relations(postings, ({ one }) => ({
  transaction: one(transactions, {
    fields: [postings.transactionId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [postings.accountId],
    references: [accounts.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'accountHierarchy',
  }),
  children: many(accounts, {
    relationName: 'accountHierarchy',
  }),
  postings: many(postings),
}));
