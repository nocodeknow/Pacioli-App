import type { Request, Response, NextFunction } from 'express';
import { accountsService } from './accounts.service.js';
import { BadRequestError } from '../../errors/index.js';
import { AccountEntitySchema, type AccountId, isValidCalendarDate } from '@finance-platform/shared-types';

const createAccountSchema = AccountEntitySchema.omit({ id: true });
const updateAccountSchema = AccountEntitySchema.partial().omit({ id: true });

export class AccountsController {
  async getAccounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await accountsService.getAllAccounts();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as AccountId;
      const account = await accountsService.getAccountById(id);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = createAccountSchema.parse(req.body);
      const newAccount = await accountsService.createAccount(payload);
      res.status(201).json(newAccount);
    } catch (error) {
      next(error);
    }
  }

  async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as AccountId;
      const payload = updateAccountSchema.parse(req.body);
      const updatedAccount = await accountsService.updateAccount(id, payload);
      res.json(updatedAccount);
    } catch (error) {
      next(error);
    }
  }

  async getAccountLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as AccountId;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (startDate && !isValidCalendarDate(startDate)) {
        throw new BadRequestError('startDate must be a valid calendar date in YYYY-MM-DD format');
      }
      if (endDate && !isValidCalendarDate(endDate)) {
        throw new BadRequestError('endDate must be a valid calendar date in YYYY-MM-DD format');
      }

      const ledger = await accountsService.getAccountLedger(id, startDate, endDate);
      res.json({
        ...ledger,
        beginningBalance: `${ledger.beginningBalance.toFixed(2)} INR`,
      });
    } catch (error) {
      next(error);
    }
  }


  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as AccountId;
      await accountsService.deleteAccount(id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
export const accountsController = new AccountsController();
