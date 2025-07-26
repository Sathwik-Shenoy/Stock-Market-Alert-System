const Alert = require('../models/Alert');
const User = require('../models/User');
const StockService = require('../services/stockService');
const { TechnicalIndicators } = require('./stockController');

/**
 * Alert Controller - Handles alert creation, management, and monitoring
 */

/**
 * Create a new alert
 */
const createAlert = async (req, res) => {
  try {
    const {
      symbol,
      alertType,
      condition,
      targetValue,
      indicatorType,
      indicatorPeriod,
      message,
      emailNotification,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!symbol || !alertType || !condition) {
      return res.status(400).json({
        error: 'Symbol, alert type, and condition are required'
      });
    }

    // Validate alert type specific requirements
    if (alertType === 'price' && !targetValue) {
      return res.status(400).json({
        error: 'Target value is required for price alerts'
      });
    }

    if (alertType === 'technical' && (!indicatorType || !targetValue)) {
      return res.status(400).json({
        error: 'Indicator type and target value are required for technical alerts'
      });
    }

    // Create the alert
    const alert = new Alert({
      userId: req.user._id,
      symbol: symbol.toUpperCase(),
      alertType,
      condition,
      targetValue: parseFloat(targetValue),
      indicatorType,
      indicatorPeriod: indicatorPeriod || 14,
      description: req.body.description || `${symbol.toUpperCase()} ${condition} ${targetValue}`,
      message: message || `${symbol.toUpperCase()} alert triggered`,
      emailNotification: emailNotification !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert.toJSON()
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

/**
 * Get user's alerts
 */
const getUserAlerts = async (req, res) => {
  try {
    const { status, symbol, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.user._id };
    
    // Add filters
    if (status) query.status = status;
    if (symbol) query.symbol = symbol.toUpperCase();

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const alerts = await Alert.paginate(query, options);

    res.json({
      success: true,
      data: alerts.docs,
      pagination: {
        page: alerts.page,
        pages: alerts.totalPages,
        total: alerts.totalDocs,
        hasNext: alerts.hasNextPage,
        hasPrev: alerts.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

/**
 * Update an alert
 */
const updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.userId;
    delete updates.triggeredAt;
    delete updates.triggerCount;

    const alert = await Alert.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: alert.toJSON()
    });

  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
};

/**
 * Delete an alert
 */
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
};

/**
 * Toggle alert status (activate/deactivate)
 */
const toggleAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOne({ _id: id, userId: req.user._id });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.status = alert.status === 'active' ? 'paused' : 'active';
    await alert.save();

    res.json({
      success: true,
      message: `Alert ${alert.status === 'active' ? 'activated' : 'paused'}`,
      data: alert.toJSON()
    });

  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({ error: 'Failed to toggle alert status' });
  }
};

/**
 * Get alert statistics
 */
const getAlertStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Alert.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const triggered = await Alert.aggregate([
      { $match: { userId: userId, triggerCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalTriggered: { $sum: '$triggerCount' },
          alertsTriggered: { $sum: 1 }
        }
      }
    ]);

    const recentTriggers = await Alert.find({
      userId: userId,
      triggeredAt: { $exists: true }
    })
    .sort({ triggeredAt: -1 })
    .limit(5)
    .select('symbol alertType triggeredAt message');

    // Format stats
    const formattedStats = {
      active: 0,
      paused: 0,
      triggered: 0,
      expired: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: {
        ...formattedStats,
        totalTriggered: triggered[0]?.totalTriggered || 0,
        alertsTriggered: triggered[0]?.alertsTriggered || 0
      },
      recentTriggers
    });

  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
};

/**
 * Test an alert condition (without saving)
 */
const testAlert = async (req, res) => {
  try {
    const { symbol, alertType, condition, targetValue, indicatorType } = req.body;

    if (!symbol || !alertType || !condition || !targetValue) {
      return res.status(400).json({
        error: 'Symbol, alert type, condition, and target value are required'
      });
    }

    // Get current stock data
    const quote = await StockService.getQuote(symbol);
    let currentValue;
    let shouldTrigger = false;

    if (alertType === 'price') {
      currentValue = quote.price;
      shouldTrigger = evaluateCondition(currentValue, condition, parseFloat(targetValue));
    } else if (alertType === 'technical') {
      // Get historical data for technical indicators
      const history = await StockService.getHistory(symbol, 'daily', '3months');
      const closePrices = history.data.map(item => item.close);
      
      switch (indicatorType) {
        case 'rsi':
          currentValue = TechnicalIndicators.calculateRSI(closePrices);
          break;
        case 'sma':
          currentValue = TechnicalIndicators.calculateSMA(closePrices, 20);
          break;
        case 'ema':
          currentValue = TechnicalIndicators.calculateEMA(closePrices, 12);
          break;
        default:
          return res.status(400).json({ error: 'Invalid indicator type' });
      }
      
      if (currentValue !== null) {
        shouldTrigger = evaluateCondition(currentValue, condition, parseFloat(targetValue));
      }
    }

    res.json({
      success: true,
      test: {
        symbol: symbol.toUpperCase(),
        alertType,
        condition,
        targetValue: parseFloat(targetValue),
        currentValue,
        shouldTrigger,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error testing alert:', error);
    res.status(500).json({ error: 'Failed to test alert condition' });
  }
};

/**
 * Get a specific alert
 */
const getAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const alert = await Alert.findOne({ _id: id, userId }).populate('userId', 'firstName lastName email');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    console.error('Error getting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to evaluate alert conditions
 */
function evaluateCondition(currentValue, condition, targetValue) {
  switch (condition) {
    case 'above':
      return currentValue > targetValue;
    case 'below':
      return currentValue < targetValue;
    case 'equals':
      return Math.abs(currentValue - targetValue) < 0.001;
    case 'crosses_above':
      // Would need historical data to implement properly
      return currentValue > targetValue;
    case 'crosses_below':
      // Would need historical data to implement properly
      return currentValue < targetValue;
    default:
      return false;
  }
}

module.exports = {
  createAlert,
  getUserAlerts,
  updateAlert,
  deleteAlert,
  toggleAlert,
  getAlertStats,
  testAlert,
  getAlert
};
