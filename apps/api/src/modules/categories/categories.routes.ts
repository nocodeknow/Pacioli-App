import { Router } from 'express';
import { categoriesController } from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', (req, res, next) => categoriesController.getCategories(req, res, next));
categoriesRouter.get('/:id', (req, res, next) => categoriesController.getCategory(req, res, next));
categoriesRouter.post('/', (req, res, next) => categoriesController.createCategory(req, res, next));
categoriesRouter.put('/:id', (req, res, next) => categoriesController.updateCategory(req, res, next));
