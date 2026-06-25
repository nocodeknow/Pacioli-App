import type { Context } from 'hono';
import { inboxService } from './inbox.service.js';
import { type CandidateId, AccountIdSchema, CategoryIdSchema } from '../../../src/shared-types/index.js';
import { z } from 'zod';

const approvePayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  suggestedAccount: AccountIdSchema.optional(),
  suggestedCategory: CategoryIdSchema.optional(),
  notes: z.string().nullable().optional(),
});

export class InboxController {
  async getPending(c: Context) {
    const list = await inboxService.getPendingCandidates();
    return c.json(list);
  }

  async getDeferred(c: Context) {
    const list = await inboxService.getDeferredCandidates();
    return c.json(list);
  }

  async getTrash(c: Context) {
    const list = await inboxService.getTrashCandidates();
    return c.json(list);
  }

  async getCandidate(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const details = await inboxService.getCandidateDetails(id);
    return c.json(details);
  }

  async approve(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const body = await c.req.json();
    const payload = approvePayloadSchema.parse(body);
    const updated = await inboxService.approveCandidate(id, payload);
    return c.json(updated);
  }

  async defer(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const updated = await inboxService.deferCandidate(id);
    return c.json(updated);
  }

  async undefer(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const updated = await inboxService.undeferCandidate(id);
    return c.json(updated);
  }

  async delete(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const updated = await inboxService.deleteCandidate(id);
    return c.json(updated);
  }

  async restore(c: Context) {
    const id = c.req.param('id') as CandidateId;
    const updated = await inboxService.restoreCandidate(id);
    return c.json(updated);
  }

  async purge(c: Context) {
    const id = c.req.param('id') as CandidateId;
    await inboxService.purgeCandidate(id);
    return c.json({ success: true });
  }
}
export const inboxController = new InboxController();
