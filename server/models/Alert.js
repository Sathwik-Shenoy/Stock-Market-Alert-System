const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Alert Schema - Defines the structure for stock alerts
 */

const alertSchema = new mongoose.Schema({
  // User who created the alert
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Stock symbol (e.g., 'AAPL', 'GOOGL')
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },

  // Type of alert: 'price', 'volume', 'change', 'technical'
  alertType: {
    type: String,
    required: true,
    enum: ['price', 'volume', 'change', 'technical'],
    lowercase: true
  },

  // Condition: 'above', 'below', 'equals', 'crosses_above', 'crosses_below'
  condition: {
    type: String,
    required: true,
    enum: ['above', 'below', 'equals', 'crosses_above', 'crosses_below'],
    lowercase: true
  },

  // Target value for the alert
  targetValue: {
    type: Number,
    required: true
  },

  // For technical indicators
  indicatorType: {
    type: String,
    enum: ['rsi', 'sma', 'ema', 'macd', 'bollinger', 'stochastic'],
    lowercase: true
  },

  // Period for technical indicators (e.g., 14 for RSI, 20 for SMA)
  indicatorPeriod: {
    type: Number,
    default: 14,
    min: 1,
    max: 200
  },

  // Alert description/name
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  // Custom message for the alert
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Alert status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Email notification preference
  emailNotification: {
    type: Boolean,
    default: true
  },

  // SMS notification preference
  smsNotification: {
    type: Boolean,
    default: false
  },

  // Push notification preference
  pushNotification: {
    type: Boolean,
    default: true
  },

  // Alert triggering information
  triggered: {
    type: Boolean,
    default: false,
    index: true
  },

  triggeredAt: {
    type: Date
  },

  triggeredValue: {
    type: Number
  },

  // Number of times this alert has been triggered
  triggerCount: {
    type: Number,
    default: 0
  },

  // Last time this alert was checked
  lastChecked: {
    type: Date
  },

  // Alert expiration
  expiresAt: {
    type: Date
  },

  // Alert frequency - how often to check (in minutes)
  frequency: {
    type: Number,
    default: 5, // Check every 5 minutes
    min: 1,
    max: 1440 // Max once per day
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
alertSchema.index({ userId: 1, isActive: 1 });
alertSchema.index({ symbol: 1, isActive: 1 });
alertSchema.index({ triggered: 1, isActive: 1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for alert status
alertSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.triggered) return 'triggered';
  if (this.expiresAt && this.expiresAt < new Date()) return 'expired';
  return 'active';
});

// Virtual for time until expiration
alertSchema.virtual('timeUntilExpiration').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const timeLeft = this.expiresAt.getTime() - now.getTime();
  return timeLeft > 0 ? timeLeft : 0;
});

// Instance method to check if alert should trigger
alertSchema.methods.shouldTrigger = function(currentValue, previousValue = null) {
  if (!this.isActive || this.triggered) return false;
  
  // Check expiration
  if (this.expiresAt && this.expiresAt < new Date()) {
    return false;
  }

  const target = this.targetValue;
  
  switch (this.condition) {
    case 'above':
      return currentValue > target;
    
    case 'below':
      return currentValue < target;
    
    case 'equals':
      // Allow for small floating point differences
      return Math.abs(currentValue - target) < 0.01;
    
    case 'crosses_above':
      return previousValue !== null && 
             previousValue <= target && 
             currentValue > target;
    
    case 'crosses_below':
      return previousValue !== null && 
             previousValue >= target && 
             currentValue < target;
    
    default:
      return false;
  }
};

// Instance method to trigger the alert
alertSchema.methods.trigger = async function() {
  this.triggered = true;
  this.triggeredAt = new Date();
  this.triggerCount += 1;
  this.lastChecked = new Date();
  
  return await this.save();
};

// Instance method to reset the alert
alertSchema.methods.reset = async function() {
  this.triggered = false;
  this.triggeredAt = undefined;
  this.lastChecked = new Date();
  
  return await this.save();
};

// Static method to find active alerts
alertSchema.statics.findActiveAlerts = function() {
  return this.find({
    isActive: true,
    triggered: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('userId', 'email firstName lastName preferences');
};

// Static method to find alerts for a user
alertSchema.statics.findUserAlerts = function(userId, options = {}) {
  const query = { userId };
  
  if (options.active !== undefined) {
    query.isActive = options.active;
  }
  
  if (options.triggered !== undefined) {
    query.triggered = options.triggered;
  }
  
  if (options.symbol) {
    query.symbol = options.symbol.toUpperCase();
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('userId', 'email firstName lastName');
};

// Static method to get user alert statistics
alertSchema.statics.getStatsForUser = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        activeAlerts: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        triggeredAlerts: {
          $sum: { $cond: [{ $eq: ['$triggered', true] }, 1, 0] }
        },
        totalTriggers: { $sum: '$triggerCount' }
      }
    }
  ]);
};

// Pre-save middleware
alertSchema.pre('save', function(next) {
  // Update lastChecked when alert is modified
  if (this.isModified() && !this.isNew) {
    this.lastChecked = new Date();
  }
  
  // Generate description if not provided
  if (!this.description) {
    const condition = this.condition.replace('_', ' ');
    this.description = `${this.symbol} ${condition} ${this.targetValue}`;
  }
  
  next();
});

// Add pagination plugin
alertSchema.plugin(mongoosePaginate);

// Create and export the model
const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
