import AppError from '../util/appError.js';
import logger from '../util/logger.js';
import config from '../config/index.js';

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicatedFieldsDB = () => {
  const message = `This value already exists.`;
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token! please log in again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! please log in again', 401);

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  logger.error(err.message, { stack: err.stack });
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.isOperational ? err.message : 'Please try again later.',
  });
};

const sendErrorProd = (err, req, res) => {
  if (!req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      logger.warn(`Operational UI Error (${err.statusCode}): ${err.message}`);
    } else {
      logger.error(err.message, { stack: err.stack });
    }
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.isOperational ? err.message : 'Please try again later.',
    });
  }
  if (err.isOperational) {
    logger.warn(`Operational API Error (${err.statusCode}): ${err.message}`);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({
      status: 500,
      message: 'Something bad happened!',
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'Error';

  if (config.env === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = Object.assign(Object.create(err), err);
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicatedFieldsDB();
    if (err.name === 'ValidationError') error = handleValidationError(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
  }
};

export default globalErrorHandler;
