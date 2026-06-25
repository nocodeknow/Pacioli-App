import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { dbContext } from './db/client.js';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema.js';
import { logger } from './logger.js';
import { env } from './config/env.js';
import { AppError } from './errors/index.js';
import { ZodError } from 'zod';

export const app = new Hono<{ Bindings: { DB: any } }>().basePath('/api');

// Request logging middleware
app.use('*', honoLogger());

// CORS setup
app.use('*', cors({
  origin: env.CORS_ORIGIN,
}));

// AsyncLocalStorage binding middleware
app.use('*', async (c, next) => {
  if (c.env && c.env.DB) {
    const dbInstance = drizzle(c.env.DB, { schema });
    return dbContext.run(dbInstance, () => next());
  }
  // No D1 binding found — fail fast with a clear diagnostic error.
  // If you are seeing this locally, run: pnpm dev (uses wrangler pages dev)
  return c.json(
    { error: 'D1 database binding not found. Is the wrangler D1 binding configured?' },
    503
  );
});

// Basic health check route
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import Hono routers
import { accountsRouter } from './modules/accounts/accounts.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { connectorsRouter } from './modules/connectors/connectors.routes.js';
import { inboxRouter } from './modules/inbox/inbox.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

app.route('/accounts', accountsRouter);
app.route('/categories', categoriesRouter);
app.route('/connectors', connectorsRouter);
app.route('/inbox', inboxRouter);
app.route('/transactions', transactionsRouter);
app.route('/reports', reportsRouter);

// Global Error Handler
app.onError((err, c) => {
  // Custom AppErrors
  if (err instanceof AppError) {
    logger.warn({ err }, `AppError caught: ${err.message}`);
    c.status(err.statusCode);
    return c.json({
      error: err.message,
      details: err.details,
    });
  }

  // Zod schema parsing errors
  if (err instanceof ZodError) {
    logger.warn({ err }, 'Zod validation error');
    c.status(400);
    return c.json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }

  // Map ledger-interface/db validation errors to 400/409
  const badRequestKeywords = [
    'Unbalanced transaction!',
    'Account not found in database',
    'Cannot post transaction to a group/header account',
    'Cyclic parent reference',
    'SQLITE_CONSTRAINT',
    'Parent account not found',
    'Cannot delete account',
  ];

  if (badRequestKeywords.some(keyword => err.message && err.message.includes(keyword))) {
    logger.warn({ err }, `Mapped DB/Business exception to 400: ${err.message}`);
    c.status(400);
    return c.json({
      error: err.message,
    });
  }

  if (err.message && err.message.includes('CONCURRENCY_ERROR')) {
    logger.warn({ err }, `Mapped Concurrency exception to 409: ${err.message}`);
    c.status(409);
    return c.json({
      error: 'Conflict',
      message: err.message,
    });
  }

  // Unhandled exceptions
  logger.error({ err }, `Unhandled exception: ${err.message}`);
  c.status(500);
  return c.json({
    error: 'Internal server error',
  });
});
