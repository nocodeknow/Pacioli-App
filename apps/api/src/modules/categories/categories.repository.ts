import { db } from '../../db/client.js';
import { accounts } from '../../db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import type { Category, CategoryId } from '@finance-platform/shared-types';

export class CategoriesRepository {
  private mapToEntity(record: typeof accounts.$inferSelect): Category {
    return {
      id: record.id,
      name: record.path, // path acts as Hledger unique name
      displayName: record.name, // local name acts as displayName
      type: record.type, // 'Income' | 'Expense'
      parentCategory: record.parentId, // parentId maps to parentCategory
      isGroup: Boolean(record.isGroup),
      archived: Boolean(record.archived),
      notes: record.notes,
    } as Category;
  }

  async findAll(): Promise<Category[]> {
    const records = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.type, 'Income'), eq(accounts.type, 'Expense')));
    return records.map(r => this.mapToEntity(r));
  }

  async findById(id: CategoryId): Promise<Category | null> {
    const [record] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, id),
          or(eq(accounts.type, 'Income'), eq(accounts.type, 'Expense'))
        )
      );
    return record ? this.mapToEntity(record) : null;
  }

  async findByName(name: string): Promise<Category | null> {
    const [record] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(sql`LOWER(${accounts.path})`, name.toLowerCase()),
          or(eq(accounts.type, 'Income'), eq(accounts.type, 'Expense'))
        )
      );
    return record ? this.mapToEntity(record) : null;
  }

  async create(data: Omit<Category, 'id'>): Promise<Category> {
    const localName = data.displayName || data.name.split(':').pop() || data.name;
    const [inserted] = await db.insert(accounts).values({
      name: localName,
      type: data.type,
      isGroup: false, // categories created via UI are detail nodes
      parentId: data.parentCategory,
      path: data.name, // data.name is the path
      archived: data.archived || false,
      notes: data.notes,
    }).returning();
    return this.mapToEntity(inserted);
  }

  async update(id: CategoryId, data: Partial<Omit<Category, 'id'>>): Promise<Category | null> {
    const updates: Partial<typeof accounts.$inferInsert> = {};
    if (data.displayName !== undefined) updates.name = data.displayName;
    if (data.type !== undefined) updates.type = data.type;
    if (data.parentCategory !== undefined) updates.parentId = data.parentCategory;
    if (data.name !== undefined) updates.path = data.name;
    if (data.archived !== undefined) updates.archived = data.archived;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db.update(accounts).set(updates).where(eq(accounts.id, id)).returning();
    return updated ? this.mapToEntity(updated) : null;
  }
}
export const categoriesRepository = new CategoriesRepository();
