// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = { message, statusCode: 500 };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
};

module.exports = errorHandler;
