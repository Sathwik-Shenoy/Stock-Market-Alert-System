const { createRedis } = require('../../../shared/redis');
const MarketEvent = require('../../../shared/models/MarketEvent');
const { loadHistoricalData } = require('../services/backtestService');

const redis = createRedis();

async function getLatestQuote(req, res, next) {
  try {
    const symbol = String(req.params.symbol || '').toUpperCase();
    const cacheKey = `cache:last_price:${symbol}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ symbol, source: 'redis_cache', ...JSON.parse(cached) });
    }

    const latest = await MarketEvent.findOne({ symbol }).sort({ marketTimestamp: -1 }).lean();
    if (!latest) {
      return res.status(404).json({ error: 'symbol_not_found' });
    }

    await redis.set(cacheKey, JSON.stringify({ price: latest.payload.price, volume: latest.payload.volume || 0 }), 'EX', 15);
    res.json({ symbol, source: 'mongo', price: latest.payload.price, volume: latest.payload.volume || 0 });
  } catch (error) {
    next(error);
  }
}

async function getHistorical(req, res, next) {
  try {
    const symbol = String(req.params.symbol || '').toUpperCase();
    const { startTime, endTime, page = 1, limit = 100 } = req.query;
    const response = await loadHistoricalData({ symbol, startTime, endTime, page, limit });
    res.json(response);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLatestQuote,
  getHistorical
};
