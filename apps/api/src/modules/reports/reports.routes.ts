import { Router } from 'express';
import { reportsController } from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.get('/dashboard', (req, res, next) => reportsController.getDashboardData(req, res, next));
