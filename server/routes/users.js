const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken } = require('../middleware/auth');

// Import controllers (we'll create these next)
// const { ... } = require('../controllers/userController');

// @route   GET /api/users/me
// @desc    Get current user profile (alias for auth/me)
// @access  Private
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toProfileJSON()
    }
  });
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard data endpoint - Coming soon!',
    userId: req.user._id
  });
});

// @route   GET /api/users/statistics
// @desc    Get user statistics
// @access  Private
router.get('/statistics', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'User statistics endpoint - Coming soon!',
    userId: req.user._id
  });
});

module.exports = router;
