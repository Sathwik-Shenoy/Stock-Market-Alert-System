const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  timestamp: { type: Date, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  pnl: { type: Number, default: 0 }
}, { _id: false });

const backtestResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  strategyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  symbol: { type: String, required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  metrics: {
    totalReturnPct: Number,
    winRatePct: Number,
    maxDrawdownPct: Number,
    totalTrades: Number
  },
  equityCurve: [{ t: Date, v: Number }],
  trades: [tradeSchema]
}, { timestamps: true, collection: 'backtest_results' });

backtestResultSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.BacktestResult || mongoose.model('BacktestResult', backtestResultSchema);
