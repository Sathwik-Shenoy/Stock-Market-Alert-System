const mongoose = require('mongoose');

const BacktestSchema = new mongoose.Schema({ strategy: Object, metrics: Object, createdAt: { type: Date, default: Date.now } });
const Backtest = mongoose.model('Backtest', BacktestSchema);

const HistoricalSchema = new mongoose.Schema({ symbol: String, timestamp: Date, price: Number });
HistoricalSchema.index({ symbol: 1, timestamp: 1 });
const Historical = mongoose.model('Historical', HistoricalSchema);

module.exports = { Backtest, Historical };
