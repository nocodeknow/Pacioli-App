import { Hono } from 'hono';
import { accountsController } from './accounts.controller.js';

export const accountsRouter = new Hono();

accountsRouter.get('/', (c) => accountsController.getAccounts(c));
accountsRouter.get('/:id', (c) => accountsController.getAccount(c));
accountsRouter.get('/:id/ledger', (c) => accountsController.getAccountLedger(c));
accountsRouter.post('/', (c) => accountsController.createAccount(c));
accountsRouter.put('/:id', (c) => accountsController.updateAccount(c));
accountsRouter.delete('/:id', (c) => accountsController.deleteAccount(c));
