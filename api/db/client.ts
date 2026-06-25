import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

/**
 * Database context storage using AsyncLocalStorage.
 *
 * In Cloudflare Pages Functions, the Drizzle D1 database instance is injected
 * per-request via the middleware in api/app.ts. This AsyncLocalStorage
 * context carries that instance for the duration of each request.
 *
 * There is NO local LibSQL fallback. All development and testing
 * must use `wrangler pages dev` with the D1 emulator.
 */
export const dbContext = new AsyncLocalStorage<any>();

/**
 * The `db` proxy object.
 *
 * Any module that imports `db` and calls methods on it will automatically
 * read from the active request's D1 database context. If no context is
 * found (e.g., called outside a request), it throws a clear error.
 */
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const store = dbContext.getStore();
    if (store) {
      return Reflect.get(store, prop);
    }
    throw new Error(
      '[db] No database context found. Ensure this code is called ' +
      'within a Cloudflare Pages request context where the D1 binding ' +
      'has been initialized by the dbContext middleware in api/app.ts.'
    );
  },
}) as ReturnType<typeof drizzle<typeof schema>>;
