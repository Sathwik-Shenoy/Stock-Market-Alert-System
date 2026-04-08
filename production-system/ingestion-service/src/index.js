const express = require('express');
const logger = require('../../shared/logger');
const { register } = require('../../shared/metrics');
const { metrics } = require('../../shared/metrics');
const { env } = require('../../shared/env');
const { startIngestionLoop, redis, MARKET_STREAM } = require('./ingestor');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'ingestion-service' }));

// Load-test helper: generate synthetic ticks without calling Alpha Vantage.
// Limitation: bypasses external API and market time semantics.
app.post('/admin/generate', async (req, res) => {
  const { symbols = ['AAPL'], events = 1000, basePrice = 100, jitterPct = 0.2 } = req.body || {};
  const now = Date.now();

  const count = Number(events);
  for (const sym of symbols) {
    const endSeq = await redis.incrby(`seq:${sym}`, count);
    const startSeq = endSeq - count + 1;
    const pipeline = redis.pipeline();

    for (let i = 0; i < count; i += 1) {
      const sequence = startSeq + i;
      const price = basePrice * (1 + ((Math.random() * 2 - 1) * (jitterPct / 100)));
      const event = {
        eventId: `${sym}:${now}:${sequence}:${i}`,
        schemaVersion: '1.0.0',
        eventType: 'market.tick',
        source: 'synthetic',
        symbol: sym,
        marketTimestamp: new Date(now + i).toISOString(),
        ingestTimestamp: new Date().toISOString(),
        sequence,
        traceId: `${now}${sequence}`,
        payload: { price: Number(price.toFixed(4)), volume: 0, indicators: {} }
      };

      pipeline.xadd(
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
      );
    }

    await pipeline.exec();
    metrics.ingestionRate.inc({ symbol: sym }, count);
  }

  res.json({ ok: true, stream: MARKET_STREAM, generated: Number(events) * symbols.length });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(env.PORT, () => {
  logger.info('ingestion_service_started', { port: env.PORT });
  const enableAlpha = process.env.ENABLE_ALPHA_INGESTION !== 'false' && Boolean(env.ALPHA_VANTAGE_API_KEY);
  if (enableAlpha) {
    startIngestionLoop().catch((error) => {
      logger.error('ingestion_loop_crashed', { error: error.message, stack: error.stack });
      process.exit(1);
    });
  } else {
    logger.warn('alpha_ingestion_disabled', { reason: env.ALPHA_VANTAGE_API_KEY ? 'flag' : 'missing_api_key' });
  }
});
