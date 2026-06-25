import type { Context } from 'hono';
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
  async getConnectors(c: Context) {
    const list = await connectorsService.getConnectors();
    return c.json(list);
  }

  async getConnector(c: Context) {
    const id = c.req.param('id')!;
    const conn = await connectorsService.getConnectorById(id);
    return c.json(conn);
  }

  async updateConnector(c: Context) {
    const id = c.req.param('id')!;
    const body = await c.req.json();
    const payload = updateConnectorSchema.parse(body);
    const updated = await connectorsService.updateConnector(id, payload);
    return c.json(updated);
  }
}
export const connectorsController = new ConnectorsController();
