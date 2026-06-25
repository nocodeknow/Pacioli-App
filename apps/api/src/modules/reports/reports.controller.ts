import type { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service.js';

export class ReportsController {
  async getDashboardData(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getDashboardData();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
