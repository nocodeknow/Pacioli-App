import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`🚀 API Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
