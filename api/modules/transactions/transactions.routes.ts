import { Hono } from 'hono';
import { transactionsController } from './transactions.controller.js';

export const transactionsRouter = new Hono();

transactionsRouter.get('/', (c) => transactionsController.getTransactions(c));
transactionsRouter.get('/:id', (c) => transactionsController.getTransaction(c));
transactionsRouter.post('/', (c) => transactionsController.createTransaction(c));
transactionsRouter.put('/:id', (c) => transactionsController.updateTransaction(c));
transactionsRouter.delete('/:id', (c) => transactionsController.deleteTransaction(c));
