import type { Context } from 'hono';
import { accountsService } from './accounts.service.js';
import { BadRequestError } from '../../errors/index.js';
import { AccountEntitySchema, type AccountId, isValidCalendarDate } from '../../../src/shared-types/index.js';

const createAccountSchema = AccountEntitySchema.omit({ id: true });
const updateAccountSchema = AccountEntitySchema.partial().omit({ id: true });

export class AccountsController {
  async getAccounts(c: Context) {
    const list = await accountsService.getAllAccounts();
    return c.json(list);
  }

  async getAccount(c: Context) {
    const id = c.req.param('id') as AccountId;
    const account = await accountsService.getAccountById(id);
    return c.json(account);
  }

  async createAccount(c: Context) {
    const body = await c.req.json();
    const payload = createAccountSchema.parse(body);
    const newAccount = await accountsService.createAccount(payload);
    c.status(201);
    return c.json(newAccount);
  }

  async updateAccount(c: Context) {
    const id = c.req.param('id') as AccountId;
    const body = await c.req.json();
    const payload = updateAccountSchema.parse(body);
    const updatedAccount = await accountsService.updateAccount(id, payload);
    return c.json(updatedAccount);
  }

  async getAccountLedger(c: Context) {
    const id = c.req.param('id') as AccountId;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (startDate && !isValidCalendarDate(startDate)) {
      throw new BadRequestError('startDate must be a valid calendar date in YYYY-MM-DD format');
    }
    if (endDate && !isValidCalendarDate(endDate)) {
      throw new BadRequestError('endDate must be a valid calendar date in YYYY-MM-DD format');
    }

    const ledger = await accountsService.getAccountLedger(id, startDate, endDate);
    return c.json({
      ...ledger,
      beginningBalance: `${ledger.beginningBalance.toFixed(2)} INR`,
    });
  }

  async deleteAccount(c: Context) {
    const id = c.req.param('id') as AccountId;
    await accountsService.deleteAccount(id);
    c.status(204);
    return c.body(null);
  }
}
export const accountsController = new AccountsController();
