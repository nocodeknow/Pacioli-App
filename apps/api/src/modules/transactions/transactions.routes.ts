import { Router } from 'express';
import { transactionsController } from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req, res, next) => transactionsController.getTransactions(req, res, next));
transactionsRouter.get('/:id', (req, res, next) => transactionsController.getTransaction(req, res, next));
transactionsRouter.post('/', (req, res, next) => transactionsController.createTransaction(req, res, next));
transactionsRouter.put('/:id', (req, res, next) => transactionsController.updateTransaction(req, res, next));
transactionsRouter.delete('/:id', (req, res, next) => transactionsController.deleteTransaction(req, res, next));
