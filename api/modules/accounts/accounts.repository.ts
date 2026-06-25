import { db } from '../../db/client.js';
import { accounts, postings, transactions } from '../../db/schema.js';
import { eq, sql, inArray, and } from 'drizzle-orm';
import type { AccountEntity, AccountId, AccountType } from '../../../src/shared-types/index.js';

export class AccountsRepository {
  private async getOpeningBalancesMap(accountIds: string[]): Promise<Map<string, { amount: number; date: string }>> {
    if (accountIds.length === 0) return new Map();
    const obPostings = await db
      .select({
        accountId: postings.accountId,
        amount: postings.amount,
        date: transactions.date,
      })
      .from(postings)
      .innerJoin(transactions, eq(postings.transactionId, transactions.id))
      .where(
        and(
          inArray(sql`LOWER(${transactions.description})`, ['opening balances', 'opening balance']),
          inArray(postings.accountId, accountIds)
        )
      );
    const map = new Map<string, { amount: number; date: string }>();
    for (const p of obPostings) {
      if (p.accountId === '00000000-0000-0000-0000-000000000000') {
        continue;
      }
      map.set(p.accountId, { amount: p.amount, date: p.date });
    }
    return map;
  }

  private async populateParentFields(
    entities: AccountEntity[],
    allEntitiesList?: AccountEntity[]
  ): Promise<AccountEntity[]> {
    const map = new Map<string, AccountEntity>();
    if (allEntitiesList) {
      for (const ent of allEntitiesList) {
        map.set(ent.id, ent);
      }
    } else {
      const parentIds = entities
        .map(e => e.parentId)
        .filter((id): id is AccountId => !!id);
      if (parentIds.length > 0) {
        const parentRecords = await db
          .select()
          .from(accounts)
          .where(inArray(accounts.id, parentIds));
        for (const r of parentRecords) {
          map.set(r.id, {
            id: r.id as AccountId,
            name: r.path,
            displayName: r.name,
            type: r.type as AccountType,
            isGroup: Boolean(r.isGroup),
            parentId: r.parentId as AccountId | null,
            path: r.path,
            openingBalance: 0,
            openingDate: '2026-06-01',
            archived: Boolean(r.archived),
            lastReconciledDate: r.lastReconciledDate,
            notes: r.notes,
          });
        }
      }
    }

    return entities.map(ent => {
      if (ent.parentId) {
        const parent = map.get(ent.parentId);
        if (parent) {
          return {
            ...ent,
            parentGroup: parent.displayName,
            parentAccount: parent.name,
          };
        }
      }
      return {
        ...ent,
        parentGroup: null,
        parentAccount: null,
      };
    });
  }

  private mapToEntity(
    record: typeof accounts.$inferSelect,
    openingBalance = 0,
    openingDate = '2026-06-01'
  ): AccountEntity {
    return {
      id: record.id as AccountId,
      name: record.path,
      displayName: record.name,
      type: record.type as AccountType,
      isGroup: Boolean(record.isGroup),
      parentId: record.parentId as AccountId | null | undefined,
      path: record.path,
      openingBalance,
      openingDate,
      archived: Boolean(record.archived),
      lastReconciledDate: record.lastReconciledDate,
      notes: record.notes,
    };
  }

  async findAll(): Promise<AccountEntity[]> {
    const records = await db.select().from(accounts);
    if (records.length === 0) return [];
    const ids = records.map(r => r.id);
    const obMap = await this.getOpeningBalancesMap(ids);
    const entities = records.map(r => {
      const ob = obMap.get(r.id);
      return this.mapToEntity(r, ob?.amount ?? 0, ob?.date ?? '2026-06-01');
    });
    return this.populateParentFields(entities, entities);
  }

  async findById(id: AccountId): Promise<AccountEntity | null> {
    const [record] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!record) return null;
    const obMap = await this.getOpeningBalancesMap([record.id]);
    const ob = obMap.get(record.id);
    const ent = this.mapToEntity(record, ob?.amount ?? 0, ob?.date ?? '2026-06-01');
    const [populated] = await this.populateParentFields([ent]);
    return populated;
  }

  async findByName(name: string): Promise<AccountEntity | null> {
    const [record] = await db
      .select()
      .from(accounts)
      .where(eq(sql`LOWER(${accounts.path})`, name.toLowerCase()));
    if (!record) return null;
    const obMap = await this.getOpeningBalancesMap([record.id]);
    const ob = obMap.get(record.id);
    const ent = this.mapToEntity(record, ob?.amount ?? 0, ob?.date ?? '2026-06-01');
    const [populated] = await this.populateParentFields([ent]);
    return populated;
  }

  async create(data: Omit<AccountEntity, 'id'>): Promise<AccountEntity> {
    const [inserted] = await db.insert(accounts).values({
      name: data.displayName,
      type: data.type,
      isGroup: data.isGroup || false,
      parentId: data.parentId,
      path: data.name,
      archived: data.archived || false,
      notes: data.notes,
    }).returning();
    const ent = this.mapToEntity(inserted, data.openingBalance, data.openingDate);
    const [populated] = await this.populateParentFields([ent]);
    return populated;
  }

  async update(id: AccountId, data: Partial<Omit<AccountEntity, 'id'>>): Promise<AccountEntity | null> {
    const updates: Partial<typeof accounts.$inferInsert> = {};
    if (data.displayName !== undefined) updates.name = data.displayName;
    if (data.type !== undefined) updates.type = data.type;
    if (data.isGroup !== undefined) updates.isGroup = data.isGroup;
    if (data.parentId !== undefined) updates.parentId = data.parentId;
    if (data.name !== undefined) updates.path = data.name;
    if (data.archived !== undefined) updates.archived = data.archived;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db.update(accounts).set(updates).where(eq(accounts.id, id)).returning();
    if (!updated) return null;
    
    const obMap = await this.getOpeningBalancesMap([updated.id]);
    const ob = obMap.get(updated.id);
    const ent = this.mapToEntity(
      updated,
      data.openingBalance !== undefined ? data.openingBalance : (ob?.amount ?? 0),
      data.openingDate !== undefined ? data.openingDate : (ob?.date ?? '2026-06-01')
    );
    const [populated] = await this.populateParentFields([ent]);
    return populated;
  }
}
export const accountsRepository = new AccountsRepository();
