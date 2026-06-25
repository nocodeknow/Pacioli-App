import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('4000'),
  DATABASE_URL: z.string().default('storage/pacioli.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write('❌ Invalid environment variables: ' + JSON.stringify(parsed.error.flatten().fieldErrors) + '\n');
  throw new Error('Invalid environment variables config');
}

export const env = parsed.data;
