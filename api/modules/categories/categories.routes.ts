import { Hono } from 'hono';
import { categoriesController } from './categories.controller.js';

export const categoriesRouter = new Hono();

categoriesRouter.get('/', (c) => categoriesController.getCategories(c));
categoriesRouter.get('/:id', (c) => categoriesController.getCategory(c));
categoriesRouter.post('/', (c) => categoriesController.createCategory(c));
categoriesRouter.put('/:id', (c) => categoriesController.updateCategory(c));
