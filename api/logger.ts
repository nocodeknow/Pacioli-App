/**
 * Cloudflare-compatible logger shim.
 *
 * Pino is incompatible with the Cloudflare Workers V8 runtime due to its
 * dependency on Node.js streams. This module provides a drop-in replacement
 * using the globally available `console` object, which Cloudflare supports.
 *
 * The API surface matches the subset of pino used across this codebase.
 */

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const logger = {
  info: (...args: unknown[]) => {
    if (!isTest) console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (!isTest) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (!isTest) console.debug('[DEBUG]', ...args);
  },
};
