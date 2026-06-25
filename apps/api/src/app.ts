import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { errorHandler } from './middleware/error.js';
import { env } from './config/env.js';

export const app = express();

// Request logging middleware
app.use(pinoHttp({ 
  logger,
  autoLogging: env.NODE_ENV !== 'test',
}));

// CORS setup
app.use(cors({
  origin: env.CORS_ORIGIN,
}));

// JSON body parser
app.use(express.json());

// Basic health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mounting routers (Stub declarations to be imported from modules)
// They will be implemented in subsequent steps
import { accountsRouter } from './modules/accounts/accounts.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { connectorsRouter } from './modules/connectors/connectors.routes.js';
import { inboxRouter } from './modules/inbox/inbox.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/connectors', connectorsRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);

// Global Error Handler
app.use(errorHandler);
