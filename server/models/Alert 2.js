const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: [true, 'Stock symbol is required'],
    uppercase: true,
    trim: true,
    maxlength: [10, 'Symbol cannot exceed 10 characters']
  },
  alertType: {
    type: String,
    required: true,
    enum: {
      values: ['rsi_overbought', 'rsi_oversold', 'macd_bullish', 'macd_bearish', 'price_above', 'price_below', 'volume_spike'],
      message: 'Invalid alert type'
    }
  },
  condition: {
    indicator: {
      type: String,
      required: true,
      enum: ['rsi', 'macd', 'price', 'volume', 'sma', 'ema']
    },
    operator: {
      type: String,
      required: true,
      enum: ['>', '<', '>=', '<=', '==', 'crossover_above', 'crossover_below']
    },
    value: {
      type: Number,
      required: true
    },
    timeframe: {
      type: String,
      enum: ['1min', '5min', '15min', '30min', '1hour', '4hour', '1day'],
      default: '15min'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  triggerCount: {
    type: Number,
    default: 0
  },
  lastTriggered: {
    type: Date,
    default: null
  },
  cooldownPeriod: {
    type: Number, // in minutes
    default: 60 // Don't trigger same alert for 1 hour
  },
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      lastSent: {
        type: Date,
        default: null
      }
    },
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      lastSent: {
        type: Date,
        default: null
      }
    }
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for alert status
alertSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.lastTriggered) return 'triggered';
  return 'active';
});

// Virtual to check if alert is in cooldown
alertSchema.virtual('isInCooldown').get(function() {
  if (!this.lastTriggered) return false;
  const cooldownMs = this.cooldownPeriod * 60 * 1000;
  return (Date.now() - this.lastTriggered.getTime()) < cooldownMs;
});

// Virtual for human-readable condition
alertSchema.virtual('conditionText').get(function() {
  const { indicator, operator, value, timeframe } = this.condition;
  let operatorText = operator;
  
  switch (operator) {
    case '>': operatorText = 'above'; break;
    case '<': operatorText = 'below'; break;
    case '>=': operatorText = 'above or equal to'; break;
    case '<=': operatorText = 'below or equal to'; break;
    case '==': operatorText = 'equals'; break;
    case 'crossover_above': operatorText = 'crosses above'; break;
    case 'crossover_below': operatorText = 'crosses below'; break;
  }
  
  return `${indicator.toUpperCase()} ${operatorText} ${value} (${timeframe})`;
});

// Indexes for performance
alertSchema.index({ user: 1, isActive: 1 });
alertSchema.index({ symbol: 1, isActive: 1 });
alertSchema.index({ alertType: 1, isActive: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ lastTriggered: -1 });

// Pre-save middleware
alertSchema.pre('save', function(next) {
  // Generate description if not provided
  if (!this.description) {
    this.description = `Alert for ${this.symbol} when ${this.conditionText}`;
  }
  next();
});

// Method to check if alert can be triggered (not in cooldown)
alertSchema.methods.canTrigger = function() {
  return this.isActive && !this.isInCooldown;
};

// Method to trigger alert
alertSchema.methods.trigger = function() {
  this.lastTriggered = new Date();
  this.triggerCount += 1;
  return this.save();
};

// Method to reset alert
alertSchema.methods.reset = function() {
  this.lastTriggered = null;
  this.triggerCount = 0;
  return this.save();
};

// Static method to find active alerts for a symbol
alertSchema.statics.findActiveBySymbol = function(symbol) {
  return this.find({
    symbol: symbol.toUpperCase(),
    isActive: true
  }).populate('user', 'email firstName lastName preferences');
};

// Static method to find user's active alerts
alertSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    user: userId,
    isActive: true
  });
};

module.exports = mongoose.model('Alert', alertSchema);
