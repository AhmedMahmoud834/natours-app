/* eslint-disable no-console */
/* eslint-disable import/first */
import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import app from './app.js';
import config from './config/index.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const dbUrl = config.db.url.replace(
  '<DB_PASSWORD>',
  config.db.password,
);

(async () => {
  await mongoose.connect(dbUrl, {});
  console.log('Database Connected');
})();

const server = app.listen(config.port, () => {
  console.log(`Server listening on port: ${config.port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! SHUTTING DOWN...');

  server.close(() => {
    process.exit(1);
  });
});
