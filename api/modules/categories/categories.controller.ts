import type { Context } from 'hono';
import { categoriesService } from './categories.service.js';
import { CategorySchema, type CategoryId } from '../../../src/shared-types/index.js';

const createCategorySchema = CategorySchema.omit({ id: true });
const updateCategorySchema = CategorySchema.partial().omit({ id: true });

export class CategoriesController {
  async getCategories(c: Context) {
    const list = await categoriesService.getAllCategories();
    return c.json(list);
  }

  async getCategory(c: Context) {
    const id = c.req.param('id') as CategoryId;
    const category = await categoriesService.getCategoryById(id);
    return c.json(category);
  }

  async createCategory(c: Context) {
    const body = await c.req.json();
    const payload = createCategorySchema.parse(body);
    const newCategory = await categoriesService.createCategory(payload);
    c.status(201);
    return c.json(newCategory);
  }

  async updateCategory(c: Context) {
    const id = c.req.param('id') as CategoryId;
    const body = await c.req.json();
    const payload = updateCategorySchema.parse(body);
    const updatedCategory = await categoriesService.updateCategory(id, payload);
    return c.json(updatedCategory);
  }
}
export const categoriesController = new CategoriesController();
