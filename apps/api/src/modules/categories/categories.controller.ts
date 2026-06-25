import type { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service.js';
import { CategorySchema, type CategoryId } from '@finance-platform/shared-types';

const createCategorySchema = CategorySchema.omit({ id: true });
const updateCategorySchema = CategorySchema.partial().omit({ id: true });

export class CategoriesController {
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await categoriesService.getAllCategories();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CategoryId;
      const category = await categoriesService.getCategoryById(id);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = createCategorySchema.parse(req.body);
      const newCategory = await categoriesService.createCategory(payload);
      res.status(201).json(newCategory);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CategoryId;
      const payload = updateCategorySchema.parse(req.body);
      const updatedCategory = await categoriesService.updateCategory(id, payload);
      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  }
}
export const categoriesController = new CategoriesController();
