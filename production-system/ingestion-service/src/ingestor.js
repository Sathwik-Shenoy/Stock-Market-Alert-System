const { env } = require('../../shared/env');
const logger = require('../../shared/logger');
const { createRedis } = require('../../shared/redis');
const { buildMarketEvent } = require('../../shared/eventSchema');
const { metrics } = require('../../shared/metrics');
const { fetchGlobalQuote } = require('./alphaClient');
const { TokenBucket } = require('./rateLimiter');

const MARKET_STREAM = 'stream:market.ticks.v1';
const WATCHLIST_KEY = 'watchlist:symbols';
const LAST_PRICE_KEY_PREFIX = 'cache:last_price:';
const LAST_TS_KEY_PREFIX = 'ordering:last_ts:';

const tokenBucket = new TokenBucket({
  capacity: env.ALPHA_RATE_LIMIT_PER_MIN,
  refillPerSec: env.ALPHA_RATE_LIMIT_PER_MIN / 60
});

const redis = createRedis();

async function getWatchlistSymbols() {
  const symbols = await redis.smembers(WATCHLIST_KEY);
  if (symbols.length) return symbols;
  return ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'TSLA'];
}

async function nextSequence(symbol) {
  return redis.incr(`seq:${symbol}`);
}

async function processSymbol(symbol) {
  await tokenBucket.removeToken();

  let quote;
  try {
    quote = await fetchGlobalQuote(symbol);
  } catch (error) {
    const cached = await redis.get(`${LAST_PRICE_KEY_PREFIX}${symbol}`);
    if (!cached) {
      logger.error('ingestion_failed_no_cache', { symbol, error: error.message });
      return;
    }

    const parsed = JSON.parse(cached);
    quote = {
      symbol,
      price: parsed.price,
      volume: parsed.volume || 0,
      marketTimestamp: new Date().toISOString(),
      fromCache: true
    };

    logger.warn('ingestion_fallback_cached_data', { symbol, error: error.message });
  }

  const lastTs = await redis.get(`${LAST_TS_KEY_PREFIX}${symbol}`);
  const marketTsMs = new Date(quote.marketTimestamp).getTime();
  if (lastTs && marketTsMs < Number(lastTs)) {
    logger.warn('out_of_order_tick_dropped', { symbol, marketTimestamp: quote.marketTimestamp, lastTs });
    return;
  }

  const sequence = await nextSequence(symbol);
  const event = buildMarketEvent({
    symbol,
    price: quote.price,
    volume: quote.volume,
    marketTimestamp: quote.marketTimestamp,
    sequence,
    indicators: {}
  });

  await redis.multi()
    .set(`${LAST_TS_KEY_PREFIX}${symbol}`, String(marketTsMs), 'EX', 86400)
    .set(`${LAST_PRICE_KEY_PREFIX}${symbol}`, JSON.stringify({ price: quote.price, volume: quote.volume }), 'EX', env.DEFAULT_CACHE_TTL_SEC)
    // Durable stream append. `MAXLEN ~` bounds memory while preserving recent history.
    .xadd(
      MARKET_STREAM,
      'MAXLEN',
      '~',
      200000,
      '*',
      'eventId',
      event.eventId,
      'symbol',
      event.symbol,
      'marketTimestamp',
      event.marketTimestamp,
      'sequence',
      String(event.sequence),
      'traceId',
      event.traceId,
      'data',
      JSON.stringify(event)
    )
    .exec();

  metrics.ingestionRate.inc({ symbol });
  logger.info('market_event_appended', { symbol, eventId: event.eventId, sequence, traceId: event.traceId, fromCache: Boolean(quote.fromCache) });
}

async function startIngestionLoop() {
  logger.info('ingestion_loop_started', { intervalMs: env.INGESTION_INTERVAL_MS, batchSize: env.INGESTION_BATCH_SIZE });

  while (true) {
    const symbols = await getWatchlistSymbols();
    for (let i = 0; i < symbols.length; i += env.INGESTION_BATCH_SIZE) {
      const batch = symbols.slice(i, i + env.INGESTION_BATCH_SIZE);
      await Promise.all(batch.map((symbol) => processSymbol(symbol)));
    }
    await new Promise((resolve) => setTimeout(resolve, env.INGESTION_INTERVAL_MS));
  }
}

module.exports = { startIngestionLoop, redis, MARKET_STREAM };
