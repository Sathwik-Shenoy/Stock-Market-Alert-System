const cron = require('node-cron');

class AlertMonitor {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  // Start the background monitoring
  startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ Alert monitor is already running');
      return;
    }

    // Schedule to run every 15 minutes during market hours
    // This is a placeholder - we'll implement the full logic later
    const cronPattern = process.env.STOCK_CHECK_INTERVAL || '*/15 * * * *';
    
    this.cronJob = cron.schedule(cronPattern, async () => {
      await this.checkAlerts();
    }, {
      scheduled: false,
      timezone: 'America/New_York' // US stock market timezone
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('🔔 Alert monitor started - checking alerts every 15 minutes');
  }

  // Stop the monitoring
  stopMonitoring() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🔴 Alert monitor stopped');
  }

  // Check all active alerts
  async checkAlerts() {
    try {
      console.log('🔍 Checking alerts at:', new Date().toISOString());
      
      // TODO: Implement alert checking logic
      // 1. Get all active alerts from database
      // 2. For each unique symbol, fetch latest stock data
      // 3. Calculate technical indicators
      // 4. Check if any alerts should be triggered
      // 5. Send notifications for triggered alerts
      
      console.log('✅ Alert check completed');
    } catch (error) {
      console.error('❌ Error checking alerts:', error);
    }
  }

  // Check if market is open (US market hours)
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Convert to EST/EDT
    const marketTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = marketTime.getHours();
    const minute = marketTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours: 9:30 AM - 4:00 PM EST
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
  }

  // Get monitor status
  getStatus() {
    return {
      isRunning: this.isRunning,
      isMarketOpen: this.isMarketOpen(),
      nextCheck: this.cronJob ? this.cronJob.nextDate() : null
    };
  }
}

// Create singleton instance
const alertMonitor = new AlertMonitor();

module.exports = alertMonitor;
