import { serve } from '@hono/node-server';
import { app } from '../api/app.js';
import { env } from '../api/config/env.js';
import { logger } from '../api/logger.js';

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: '0.0.0.0'
}, (info) => {
  logger.info(`🚀 API Server running on http://0.0.0.0:${info.port} in ${env.NODE_ENV} mode`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
