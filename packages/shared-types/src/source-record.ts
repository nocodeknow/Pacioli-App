import { z } from 'zod';
import { SourceRecordIdSchema } from './brands.js';

export const SourceRecordStatusSchema = z.enum(['Unprocessed', 'Processed', 'Failed']);
export type SourceRecordStatus = z.infer<typeof SourceRecordStatusSchema>;

export const SourceRecordSchema = z.object({
  id: SourceRecordIdSchema,
  connectorId: z.string().min(1),
  rawPayload: z.unknown(),
  fetchedAt: z.string().datetime(),
  status: SourceRecordStatusSchema,
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
