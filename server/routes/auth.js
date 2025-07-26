const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  logout,
  forgotPassword,
  verifyEmail
} = require('../controllers/authController');

// Import middleware
const { authenticateToken } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  validateEmail
} = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', refreshToken);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateToken, validatePasswordChange, changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, logout);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', validateEmail, forgotPassword);

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Private
router.post('/verify-email', authenticateToken, verifyEmail);

module.exports = router;
