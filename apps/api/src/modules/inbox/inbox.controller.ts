import type { Request, Response, NextFunction } from 'express';
import { inboxService } from './inbox.service.js';
import { type CandidateId, AccountIdSchema, CategoryIdSchema } from '@finance-platform/shared-types';
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
  async getPending(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await inboxService.getPendingCandidates();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getDeferred(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await inboxService.getDeferredCandidates();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getTrash(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await inboxService.getTrashCandidates();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const details = await inboxService.getCandidateDetails(id);
      res.json(details);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const payload = approvePayloadSchema.parse(req.body);
      const updated = await inboxService.approveCandidate(id, payload);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async defer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const updated = await inboxService.deferCandidate(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async undefer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const updated = await inboxService.undeferCandidate(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const updated = await inboxService.deleteCandidate(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      const updated = await inboxService.restoreCandidate(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async purge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as CandidateId;
      await inboxService.purgeCandidate(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
export const inboxController = new InboxController();
