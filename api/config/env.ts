import { z } from 'zod';

/**
 * Environment variable schema for the Cloudflare Pages runtime.
 *
 * DO NOT import `dotenv` here. Cloudflare Pages injects vars from
 * wrangler.toml [vars] and the CF dashboard directly into process.env
 * at runtime. No filesystem access is needed or permitted.
 */
const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('4000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Use console.error — never pino — here, as pino may not be initialized
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsed.error.flatten().fieldErrors)
  );
  throw new Error('Invalid environment variables config');
}

export const env = parsed.data;
