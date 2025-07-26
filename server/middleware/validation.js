const { body, validationResult } = require('express-validator');

// Helper function to handle validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidation
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidation
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidation
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidation
];

// Alert creation validation
const validateAlert = [
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Symbol must contain only uppercase letters'),
    
  body('alertType')
    .isIn(['price', 'technical', 'volume', 'change'])
    .withMessage('Alert type must be one of: price, technical, volume, change'),
    
  body('condition')
    .isIn(['above', 'below', 'equals', 'crosses_above', 'crosses_below'])
    .withMessage('Condition must be one of: above, below, equals, crosses_above, crosses_below'),
    
  body('targetValue')
    .isFloat({ min: 0 })
    .withMessage('Target value must be a positive number'),
    
  body('indicatorType')
    .optional()
    .isIn(['rsi', 'sma', 'ema', 'macd', 'bollinger'])
    .withMessage('Indicator type must be one of: rsi, sma, ema, macd, bollinger'),
    
  body('indicatorPeriod')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Indicator period must be between 1 and 200'),
    
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters'),
    
  body('emailNotification')
    .optional()
    .isBoolean()
    .withMessage('Email notification must be a boolean'),
    
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in valid ISO 8601 format'),
    
  handleValidation
];

// Alert update validation (partial validation for updates)
const validateAlertUpdate = [
  body('symbol')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Symbol must contain only uppercase letters'),
    
  body('alertType')
    .optional()
    .isIn(['price', 'technical', 'volume', 'change'])
    .withMessage('Alert type must be one of: price, technical, volume, change'),
    
  body('condition')
    .optional()
    .isIn(['above', 'below', 'equals', 'crosses_above', 'crosses_below'])
    .withMessage('Condition must be one of: above, below, equals, crosses_above, crosses_below'),
    
  body('targetValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target value must be a positive number'),
    
  body('indicatorType')
    .optional()
    .isIn(['rsi', 'sma', 'ema', 'macd', 'bollinger'])
    .withMessage('Indicator type must be one of: rsi, sma, ema, macd, bollinger'),
    
  body('indicatorPeriod')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Indicator period must be between 1 and 200'),
    
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters'),
    
  body('emailNotification')
    .optional()
    .isBoolean()
    .withMessage('Email notification must be a boolean'),
    
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in valid ISO 8601 format'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
    
  handleValidation
];

// Stock symbol validation
const validateStockSymbol = [
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol must be between 1 and 10 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock symbol must contain only uppercase letters'),
  
  handleValidation
];

// Query parameter validation for stock data
const validateStockQuery = [
  body('timeframe')
    .optional()
    .isIn(['1min', '5min', '15min', '30min', '1hour', '4hour', '1day'])
    .withMessage('Invalid timeframe'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  handleValidation
];

// Email validation
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidation
];

// Generic ID validation
const validateId = (paramName = 'id') => [
  body(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidation
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  validateAlert,
  validateAlertUpdate,
  validateStockSymbol,
  validateStockQuery,
  validateEmail,
  validateId,
  handleValidation
};
