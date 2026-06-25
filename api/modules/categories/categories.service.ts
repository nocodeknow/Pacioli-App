import type { Category, CategoryId } from '../../../src/shared-types/index.js';
import { BadRequestError, NotFoundError } from '../../errors/index.js';
import { renameAccountInJournal } from '../../db/index.js';
import { categoriesRepository } from './categories.repository.js';
import { db } from '../../db/client.js';
import { accounts, postings } from '../../db/schema.js';

export class CategoriesService {
  async getAllCategories(): Promise<Category[]> {
    return await categoriesRepository.findAll();
  }

  async getCategoryById(id: CategoryId): Promise<Category> {
    const category = await categoriesRepository.findById(id);
    if (!category) {
      const categoryByName = await categoriesRepository.findByName(id as string);
      if (!categoryByName) {
        throw new NotFoundError(`Category with ID "${id}" not found`);
      }
      return categoryByName;
    }
    return category;
  }

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    const existing = await categoriesRepository.findByName(data.name);
    if (existing) {
      throw new BadRequestError(`Category path name "${data.name}" already exists`);
    }

    return await categoriesRepository.create(data);
  }

  async updateCategory(id: CategoryId, updates: Partial<Omit<Category, 'id'>>): Promise<Category> {
    const oldCategory = await this.getCategoryById(id);
    const resolvedOldName = oldCategory.name;

    let finalName = resolvedOldName;

    // Handle rename
    if (updates.name && updates.name.toLowerCase() !== resolvedOldName.toLowerCase()) {
      const existing = await categoriesRepository.findByName(updates.name);
      if (existing) {
        throw new BadRequestError(`Category path name "${updates.name}" already exists`);
      }

      await renameAccountInJournal(db, accounts, null, postings, resolvedOldName, updates.name);
      finalName = updates.name;
    }

    const updated = await categoriesRepository.update(oldCategory.id, {
      ...updates,
      name: finalName,
    });

    if (!updated) {
      throw new NotFoundError(`Failed to update category "${id}"`);
    }

    return updated;
  }
}

export const categoriesService = new CategoriesService();
