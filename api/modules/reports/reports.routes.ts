import { Hono } from 'hono';
import { reportsController } from './reports.controller.js';

export const reportsRouter = new Hono();

reportsRouter.get('/dashboard', (c) => reportsController.getDashboardData(c));
