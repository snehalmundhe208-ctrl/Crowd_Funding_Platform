const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Exception: %o', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : null
  });
};

module.exports = errorHandler;
