const mongoose = require('mongoose');

const stockDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    current: {
      type: Number,
      required: true
    },
    open: {
      type: Number,
      required: true
    },
    high: {
      type: Number,
      required: true
    },
    low: {
      type: Number,
      required: true
    },
    previousClose: {
      type: Number,
      required: true
    },
    change: {
      type: Number,
      required: true
    },
    changePercent: {
      type: Number,
      required: true
    }
  },
  volume: {
    current: {
      type: Number,
      required: true
    },
    average: {
      type: Number,
      default: null
    }
  },
  technicalIndicators: {
    rsi: {
      value: {
        type: Number,
        min: 0,
        max: 100
      },
      period: {
        type: Number,
        default: 14
      },
      signal: {
        type: String,
        enum: ['overbought', 'oversold', 'neutral'],
        default: 'neutral'
      }
    },
    macd: {
      value: {
        type: Number
      },
      signal: {
        type: Number
      },
      histogram: {
        type: Number
      },
      trend: {
        type: String,
        enum: ['bullish', 'bearish', 'neutral'],
        default: 'neutral'
      }
    },
    movingAverages: {
      sma20: {
        type: Number
      },
      sma50: {
        type: Number
      },
      ema12: {
        type: Number
      },
      ema26: {
        type: Number
      }
    },
    bollinger: {
      upper: {
        type: Number
      },
      middle: {
        type: Number
      },
      lower: {
        type: Number
      }
    }
  },
  marketData: {
    marketCap: {
      type: Number,
      default: null
    },
    peRatio: {
      type: Number,
      default: null
    },
    dividendYield: {
      type: Number,
      default: null
    },
    beta: {
      type: Number,
      default: null
    }
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['alpha_vantage', 'finnhub', 'manual'],
    required: true
  },
  timeframe: {
    type: String,
    enum: ['1min', '5min', '15min', '30min', '1hour', '4hour', '1day'],
    default: '15min'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
stockDataSchema.index({ symbol: 1, timestamp: -1 });
stockDataSchema.index({ symbol: 1, timeframe: 1, timestamp: -1 });
stockDataSchema.index({ timestamp: -1 });

// Virtual for trend analysis
stockDataSchema.virtual('trend').get(function() {
  const { current, previousClose } = this.price;
  const changePercent = this.price.changePercent;
  
  if (changePercent > 2) return 'strong_bullish';
  if (changePercent > 0.5) return 'bullish';
  if (changePercent < -2) return 'strong_bearish';
  if (changePercent < -0.5) return 'bearish';
  return 'neutral';
});

// Virtual for signal strength
stockDataSchema.virtual('signalStrength').get(function() {
  const indicators = this.technicalIndicators;
  let score = 0;
  let total = 0;
  
  // RSI signal
  if (indicators.rsi && indicators.rsi.value) {
    total++;
    if (indicators.rsi.signal === 'oversold') score++;
    if (indicators.rsi.signal === 'overbought') score--;
  }
  
  // MACD signal
  if (indicators.macd && indicators.macd.trend) {
    total++;
    if (indicators.macd.trend === 'bullish') score++;
    if (indicators.macd.trend === 'bearish') score--;
  }
  
  // Price vs Moving Average
  if (indicators.movingAverages && indicators.movingAverages.sma20) {
    total++;
    if (this.price.current > indicators.movingAverages.sma20) score++;
    else score--;
  }
  
  return total > 0 ? (score / total) : 0;
});

// Static method to find latest data for symbol
stockDataSchema.statics.findLatestBySymbol = function(symbol, timeframe = '15min') {
  return this.findOne({
    symbol: symbol.toUpperCase(),
    timeframe
  }).sort({ timestamp: -1 });
};

// Static method to find historical data
stockDataSchema.statics.findHistoricalData = function(symbol, timeframe = '15min', limit = 100) {
  return this.find({
    symbol: symbol.toUpperCase(),
    timeframe
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to check if data is fresh (within last 20 minutes for 15min timeframe)
stockDataSchema.statics.isFreshData = function(timestamp, timeframe = '15min') {
  const timeframeMinutes = {
    '1min': 2,
    '5min': 10,
    '15min': 20,
    '30min': 35,
    '1hour': 65,
    '4hour': 250,
    '1day': 1440
  };
  
  const maxAge = timeframeMinutes[timeframe] * 60 * 1000; // Convert to milliseconds
  return (Date.now() - new Date(timestamp).getTime()) < maxAge;
};

// Method to determine if stock should trigger alerts
stockDataSchema.methods.shouldTriggerAlerts = function() {
  const indicators = this.technicalIndicators;
  const triggers = [];
  
  // RSI triggers
  if (indicators.rsi && indicators.rsi.value) {
    if (indicators.rsi.value > 70) {
      triggers.push({ type: 'rsi_overbought', value: indicators.rsi.value });
    }
    if (indicators.rsi.value < 30) {
      triggers.push({ type: 'rsi_oversold', value: indicators.rsi.value });
    }
  }
  
  // MACD triggers
  if (indicators.macd && indicators.macd.trend) {
    if (indicators.macd.trend === 'bullish') {
      triggers.push({ type: 'macd_bullish', value: indicators.macd.value });
    }
    if (indicators.macd.trend === 'bearish') {
      triggers.push({ type: 'macd_bearish', value: indicators.macd.value });
    }
  }
  
  // Volume spike trigger
  if (this.volume.average && this.volume.current > (this.volume.average * 2)) {
    triggers.push({ type: 'volume_spike', value: this.volume.current / this.volume.average });
  }
  
  return triggers;
};

module.exports = mongoose.model('StockData', stockDataSchema);
