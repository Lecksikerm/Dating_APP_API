const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// 🔹 Handle invalid MongoDB ID
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

// 🔹 Handle duplicate fields (unique constraint)
const handleDuplicateFieldsDB = (err) => {
    const value = err.keyValue
        ? Object.values(err.keyValue)[0]
        : 'duplicate value';

    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

// 🔹 Handle Mongoose validation errors
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

// 🔹 JWT Errors
const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

// 🔹 Send detailed error (DEV)
const sendErrorDev = (err, res) => {
    logger.error('DEV ERROR:', {
        status: err.status,
        message: err.message,
        stack: err.stack,
    });

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};

// 🔹 Send safe error (PROD)
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        logger.error('Operational Error:', {
            status: err.status,
            message: err.message,
        });

        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }

    // Unknown / programming errors
    logger.error('Programming Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
    });

    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
    });
};


module.exports = (err, req, res, next) => {
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        return sendErrorDev(err, res);
    }

    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError')
        error = handleCastErrorDB(error);

    if (error.code === 11000)
        error = handleDuplicateFieldsDB(error);

    if (error.name === 'ValidationError')
        error = handleValidationErrorDB(error);

    if (error.name === 'JsonWebTokenError')
        error = handleJWTError();

    if (error.name === 'TokenExpiredError')
        error = handleJWTExpiredError();

    sendErrorProd(error, res);
};