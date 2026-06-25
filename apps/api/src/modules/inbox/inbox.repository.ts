import { db } from '../../db/client.js';
import { transactionCandidates, sourceRecords } from '../../db/schema.js';
import { eq, and, gt, or } from 'drizzle-orm';
import type { TransactionCandidate, CandidateId, SourceRecord, SourceRecordId, AccountId, CategoryId } from '@finance-platform/shared-types';

export interface DBTransactionCandidate extends Omit<TransactionCandidate, 'id' | 'sourceRecordId' | 'suggestedAccount' | 'suggestedCategory'> {
  id: string;
  sourceRecordId: string;
  suggestedAccount: string | null;
  suggestedCategory: string | null;
  deletedAt?: Date | null;
}

export class InboxRepository {
  private mapCandidate(record: typeof transactionCandidates.$inferSelect): TransactionCandidate & { deletedAt?: string | null } {
    return {
      id: record.id as CandidateId,
      sourceRecordId: record.sourceRecordId as SourceRecordId,
      date: record.date,
      amount: record.amount ? Number(record.amount) : null,
      description: record.description,
      suggestedAccount: record.suggestedAccount as AccountId | null,
      suggestedCategory: record.suggestedCategory as CategoryId | null,
      notes: record.notes,
      status: record.status as TransactionCandidate['status'],
      deletedAt: record.deletedAt ? new Date(record.deletedAt).toISOString() : null,
    };
  }

  private mapSourceRecord(record: typeof sourceRecords.$inferSelect): SourceRecord {
    return {
      id: record.id as SourceRecordId,
      connectorId: record.connectorId,
      rawPayload: record.rawPayload as Record<string, unknown>,
      fetchedAt: new Date(record.fetchedAt).toISOString(),
      status: record.status as SourceRecord['status'],
    };
  }

  async findPending(): Promise<TransactionCandidate[]> {
    const list = await db
      .select()
      .from(transactionCandidates)
      .where(eq(transactionCandidates.status, 'Pending'));
    return list.map(r => this.mapCandidate(r));
  }

  async findDeferred(): Promise<TransactionCandidate[]> {
    const list = await db
      .select()
      .from(transactionCandidates)
      .where(eq(transactionCandidates.status, 'Deferred'));
    return list.map(r => this.mapCandidate(r));
  }

  async findDeleted(cooldownDate: Date): Promise<TransactionCandidate[]> {
    const list = await db
      .select()
      .from(transactionCandidates)
      .where(
        and(
          eq(transactionCandidates.status, 'Deleted'),
          gt(transactionCandidates.deletedAt, cooldownDate)
        )
      );
    return list.map(r => this.mapCandidate(r));
  }

  async findById(id: CandidateId): Promise<TransactionCandidate | null> {
    const [record] = await db
      .select()
      .from(transactionCandidates)
      .where(eq(transactionCandidates.id, id));
    return record ? this.mapCandidate(record) : null;
  }

  async getSourceRecordById(id: SourceRecordId): Promise<SourceRecord | null> {
    const [record] = await db
      .select()
      .from(sourceRecords)
      .where(eq(sourceRecords.id, id));
    return record ? this.mapSourceRecord(record) : null;
  }

  async update(id: CandidateId, data: Partial<Omit<DBTransactionCandidate, 'id'>>): Promise<TransactionCandidate | null> {
    const updates: Partial<typeof transactionCandidates.$inferInsert> = {};
    if (data.sourceRecordId !== undefined) updates.sourceRecordId = data.sourceRecordId;
    if (data.date !== undefined) updates.date = data.date;
    if (data.amount !== undefined && data.amount !== null) {
      updates.amount = Number(data.amount);
    } else if (data.amount === null) {
      updates.amount = null;
    }
    if (data.description !== undefined) updates.description = data.description;
    if (data.suggestedAccount !== undefined) updates.suggestedAccount = data.suggestedAccount;
    if (data.suggestedCategory !== undefined) updates.suggestedCategory = data.suggestedCategory;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.status !== undefined) updates.status = data.status;
    if (data.deletedAt !== undefined) {
      updates.deletedAt = data.deletedAt;
    }

    const [updated] = await db
      .update(transactionCandidates)
      .set(updates)
      .where(eq(transactionCandidates.id, id))
      .returning();
    return updated ? this.mapCandidate(updated) : null;
  }

  async deletePermanently(id: CandidateId): Promise<boolean> {
    const res = await db.delete(transactionCandidates).where(eq(transactionCandidates.id, id));
    return true;
  }
}
export const inboxRepository = new InboxRepository();
