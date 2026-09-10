import dns from 'node:dns';
import mongoose from 'mongoose';
import app from './app.js';
import config from './config/index.js';
import logger from './util/logger.js';

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION! ${err.name}: ${err.message}`, {
    stack: err.stack,
  });
  process.exit(1);
});

dns.setServers(['8.8.8.8', '1.1.1.1']);

const dbUrl = config.db.url.replace('<DB_PASSWORD>', config.db.password);

(async () => {
  await mongoose.connect(dbUrl, {});
  logger.info('Database connected successfully');
})();

const server = app.listen(config.port, () => {
  logger.info(`Server listening on port: ${config.port}`);
});

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION! ${err.name}: ${err.message}`, {
    stack: err.stack,
  });
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM RECEIVED. Shutting down gracefully.');
  server.close(() => {
    mongoose.connection.close();
    logger.info('Process terminated!');
  });
});
