import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * This config is used by `drizzle-kit generate` to produce SQL migration
 * files into the `drizzle/` directory. Those migration files are then
 * applied to Cloudflare D1 via:
 *   - `pnpm db:migrate:local` (development D1 emulator)
 *   - `pnpm db:migrate:prod`  (production D1 database)
 */
export default {
  schema: './api/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
} satisfies Config;
