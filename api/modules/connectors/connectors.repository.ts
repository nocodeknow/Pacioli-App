import { db } from '../../db/client.js';
import { connectors } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface ConnectorRecord {
  id: string;
  name: string;
  status: string;
  sheetId: string | null;
  range: string | null;
  lastSyncedAt: Date | null;
  enabled: boolean;
  sheetMappings: unknown;
}

export class ConnectorsRepository {
  private mapToEntity(record: typeof connectors.$inferSelect): ConnectorRecord {
    return {
      id: record.id,
      name: record.name,
      status: record.status,
      sheetId: record.sheetId,
      range: record.range,
      lastSyncedAt: record.lastSyncedAt ? new Date(record.lastSyncedAt) : null,
      enabled: record.enabled,
      sheetMappings: record.sheetMappings,
    };
  }

  async findAll(): Promise<ConnectorRecord[]> {
    const records = await db.select().from(connectors);
    return records.map(r => this.mapToEntity(r));
  }

  async findById(id: string): Promise<ConnectorRecord | null> {
    const [record] = await db.select().from(connectors).where(eq(connectors.id, id));
    return record ? this.mapToEntity(record) : null;
  }

  async update(id: string, data: Partial<Omit<ConnectorRecord, 'id' | 'name'>>): Promise<ConnectorRecord | null> {
    const updates: Partial<typeof connectors.$inferInsert> = { ...data } as Partial<typeof connectors.$inferInsert>;
    const [updated] = await db.update(connectors).set(updates).where(eq(connectors.id, id)).returning();
    return updated ? this.mapToEntity(updated) : null;
  }

  async upsert(id: string, data: Omit<ConnectorRecord, 'id'>): Promise<ConnectorRecord> {
    const updates: Omit<typeof connectors.$inferInsert, 'id'> = {
      name: data.name,
      status: data.status,
      sheetId: data.sheetId,
      range: data.range,
      enabled: data.enabled,
      sheetMappings: data.sheetMappings,
      lastSyncedAt: data.lastSyncedAt,
    };

    const [record] = await db
      .insert(connectors)
      .values({ id, ...updates })
      .onConflictDoUpdate({
        target: connectors.id,
        set: updates,
      })
      .returning();
    return this.mapToEntity(record);
  }
}
export const connectorsRepository = new ConnectorsRepository();
