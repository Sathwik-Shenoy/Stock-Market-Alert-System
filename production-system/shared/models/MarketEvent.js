const mongoose = require('mongoose');

const marketEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  schemaVersion: { type: String, required: true },
  eventType: { type: String, required: true, index: true },
  source: { type: String, required: true },
  symbol: { type: String, required: true, index: true },
  marketTimestamp: { type: Date, required: true, index: true },
  ingestTimestamp: { type: Date, required: true, index: true },
  sequence: { type: Number, required: true },
  payload: {
    price: { type: Number, required: true },
    volume: { type: Number, default: 0 },
    indicators: {
      rsi: Number,
      macd: Number,
      macdSignal: Number,
      macdHistogram: Number,
      priceChangePct: Number
    }
  }
}, { timestamps: true, collection: 'market_events' });

marketEventSchema.index({ symbol: 1, marketTimestamp: -1 });

module.exports = mongoose.models.MarketEvent || mongoose.model('MarketEvent', marketEventSchema);
