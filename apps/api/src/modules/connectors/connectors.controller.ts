import type { Request, Response, NextFunction } from 'express';
import { connectorsService } from './connectors.service.js';
import { z } from 'zod';

const updateConnectorSchema = z.object({
  status: z.enum(['Configured', 'Unconfigured']).optional(),
  sheetId: z.string().nullable().optional(),
  range: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sheetMappings: z.record(z.string()).nullable().optional(),
});

export class ConnectorsController {
  async getConnectors(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await connectorsService.getConnectors();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const conn = await connectorsService.getConnectorById(id);
      res.json(conn);
    } catch (error) {
      next(error);
    }
  }

  async updateConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const payload = updateConnectorSchema.parse(req.body);
      const updated = await connectorsService.updateConnector(id, payload);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}
export const connectorsController = new ConnectorsController();
