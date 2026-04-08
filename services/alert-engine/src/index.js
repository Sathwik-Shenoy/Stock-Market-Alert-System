const { createClient } = require('redis');
const mongoose = require('mongoose');
const { EVENT_CHANNEL, alertsProcessed, alertLatency } = require('stock-shared');
const { evaluateRule } = require('./ruleEngine');
const debug = require('debug')('alert:index');

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (e) => console.error('redis', e));

// minimal mongoose models
const AlertSchema = new mongoose.Schema({ strategyId: String, eventId: String, symbol: String, price: Number, timestamp: Date }, { timestamps: true });
AlertSchema.index({ strategyId: 1, eventId: 1 }, { unique: true });
const Alert = mongoose.model('Alert', AlertSchema);

const PriceCacheSchema = new mongoose.Schema({ symbol: String, priceHistory: [Number], updatedAt: Date });
PriceCacheSchema.index({ symbol: 1 });
const PriceCache = mongoose.model('PriceCache', PriceCacheSchema);

async function handleEvent(event) {
  const start = Date.now();
  const payload = JSON.parse(event);
  // dedupe by event id using DB unique index
  const strategies = JSON.parse(process.env.STRATEGIES || '[]');
  // fetch price history from DB cache
  let pc = await PriceCache.findOne({ symbol: payload.symbol }).lean();
  if (!pc) pc = { priceHistory: [payload.price] };
  else {
    pc.priceHistory.push(payload.price);
    if (pc.priceHistory.length > 200) pc.priceHistory.shift();
    await PriceCache.updateOne({ symbol: payload.symbol }, { $set: { priceHistory: pc.priceHistory, updatedAt: new Date() } }, { upsert: true });
  }

  for (const strat of strategies) {
    try {
      const context = { price: payload.price, priceHistory: pc.priceHistory };
      if (evaluateRule(strat, context)) {
        // idempotent insert
        try {
          await Alert.create({ strategyId: strat.id, eventId: payload.id, symbol: payload.symbol, price: payload.price, timestamp: payload.timestamp });
          alertsProcessed.inc();
          debug('alert created', strat.id, payload.id);
        } catch (e) {
          if (e.code === 11000) debug('duplicate alert skipped', strat.id, payload.id);
          else throw e;
        }
      }
    } catch (e) {
      console.error('strategy eval error', e);
    }
  }

  alertLatency.observe(Date.now() - start);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/stock', { serverSelectionTimeoutMS: 5000 });
  await redis.connect();
  const sub = redis.duplicate();
  await sub.connect();
  await sub.subscribe(EVENT_CHANNEL, (message) => { handleEvent(message).catch(console.error); });
  console.log('alert-engine subscribed to', EVENT_CHANNEL);
}

if (require.main === module) run().catch((e) => { console.error(e); process.exit(1); });
