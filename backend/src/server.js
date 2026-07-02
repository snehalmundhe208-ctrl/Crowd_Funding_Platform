require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const prisma = require('./config/db');

const PORT = process.env.PORT || 5000;

let server;

const shutdown = async (code) => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Failed to disconnect Prisma cleanly.');
  }

  if (server && server.listening) {
    return server.close(() => {
      process.exit(code);
    });
  }

  process.exit(code);
};

server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});


process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down server...');
  logger.error(err);
  shutdown(1);
});


process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server...');
  logger.error(err);
  shutdown(1);
});
