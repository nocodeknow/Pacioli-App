import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../logger.js';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response | void {
  // Custom AppErrors
  if (err instanceof AppError) {
    logger.warn({ err }, `AppError caught: ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Zod schema parsing errors
  if (err instanceof ZodError) {
    logger.warn({ err }, 'Zod validation error');
    return res.status(400).json({
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
    return res.status(400).json({
      error: err.message,
    });
  }

  if (err.message && err.message.includes('CONCURRENCY_ERROR')) {
    logger.warn({ err }, `Mapped Concurrency exception to 409: ${err.message}`);
    return res.status(409).json({
      error: 'Conflict',
      message: err.message,
    });
  }

  // Unhandled exceptions
  logger.error({ err }, `Unhandled exception: ${err.message}`);
  return res.status(500).json({
    error: 'Internal server error',
  });
}
