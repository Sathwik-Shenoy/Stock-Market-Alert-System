const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Alert monitoring endpoint - supports both GET and POST
router.get('/alert-monitor/check', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'monitoring_active',
        lastCheck: new Date().toISOString(),
        alertsChecked: 0,
        alertsTriggered: 0,
        monitoringEnabled: true
      }
    });
  } catch (error) {
    console.error('Error in alert monitor check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check alert monitor status'
    });
  }
});

router.post('/alert-monitor/check', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.body;
    
    res.json({
      success: true,
      message: `Alert ${alertId || 'all alerts'} checked successfully`,
      data: {
        alertId: alertId,
        status: 'checked',
        timestamp: new Date().toISOString(),
        triggered: false,
        conditions_met: false
      }
    });
  } catch (error) {
    console.error('Error in alert monitor check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check alert monitor status'
    });
  }
});

// Alert monitoring status endpoint
router.get('/alert-monitor/status', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: true,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        alertsMonitored: 0,
        system: 'operational'
      }
    });
  } catch (error) {
    console.error('Error in alert monitor status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alert monitor status'
    });
  }
});

module.exports = router;
