import type { Context } from 'hono';
import { reportsService } from './reports.service.js';

export class ReportsController {
  async getDashboardData(c: Context) {
    const data = await reportsService.getDashboardData();
    return c.json(data);
  }
}

export const reportsController = new ReportsController();
