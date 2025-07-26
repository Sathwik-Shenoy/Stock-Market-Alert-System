const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateToken } = require('../middleware/auth');
const { validateAlert, validateAlertUpdate } = require('../middleware/validation');

/**
 * Alert Management Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/alerts
 * @desc    Create a new alert
 * @access  Private
 */
router.post('/', validateAlert, alertController.createAlert);

/**
 * @route   GET /api/alerts
 * @desc    Get user's alerts with pagination
 * @access  Private
 */
router.get('/', alertController.getUserAlerts);

/**
 * @route   GET /api/alerts/stats
 * @desc    Get user's alert statistics
 * @access  Private
 */
router.get('/stats', alertController.getAlertStats);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get a specific alert
 * @access  Private
 */
router.get('/:id', alertController.getAlert);

/**
 * @route   PUT /api/alerts/:id
 * @desc    Update an alert
 * @access  Private
 */
router.put('/:id', alertController.updateAlert);

/**
 * @route   PATCH /api/alerts/:id/toggle
 * @desc    Toggle alert active status
 * @access  Private
 */
router.patch('/:id/toggle', alertController.toggleAlert);

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Delete an alert
 * @access  Private
 */
router.delete('/:id', alertController.deleteAlert);

/**
 * @route   POST /api/alerts/:id/test
 * @desc    Test an alert manually
 * @access  Private
 */
router.post('/:id/test', alertController.testAlert);

module.exports = router;
