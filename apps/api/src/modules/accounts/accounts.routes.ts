import { Router } from 'express';
import { accountsController } from './accounts.controller.js';

export const accountsRouter = Router();

accountsRouter.get('/', (req, res, next) => accountsController.getAccounts(req, res, next));
accountsRouter.get('/:id', (req, res, next) => accountsController.getAccount(req, res, next));
accountsRouter.get('/:id/ledger', (req, res, next) => accountsController.getAccountLedger(req, res, next));
accountsRouter.post('/', (req, res, next) => accountsController.createAccount(req, res, next));
accountsRouter.put('/:id', (req, res, next) => accountsController.updateAccount(req, res, next));
accountsRouter.delete('/:id', (req, res, next) => accountsController.deleteAccount(req, res, next));
