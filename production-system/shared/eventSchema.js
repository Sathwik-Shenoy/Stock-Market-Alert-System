const crypto = require('crypto');

const EVENT_VERSION = '1.0.0';

function createTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function createEventId({ source, symbol, marketTimestamp, sequence }) {
  const raw = `${source}|${symbol}|${marketTimestamp}|${sequence}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildMarketEvent({ source = 'alpha_vantage', symbol, price, volume, marketTimestamp, sequence, indicators = {} }) {
  const eventId = createEventId({ source, symbol, marketTimestamp, sequence });

  return {
    eventId,
    schemaVersion: EVENT_VERSION,
    eventType: 'market.tick',
    source,
    symbol,
    marketTimestamp,
    ingestTimestamp: new Date().toISOString(),
    sequence,
    traceId: createTraceId(),
    payload: {
      price,
      volume,
      indicators
    }
  };
}

function validateMarketEvent(event) {
  const required = ['eventId', 'eventType', 'schemaVersion', 'symbol', 'marketTimestamp', 'sequence', 'payload'];
  for (const key of required) {
    if (event[key] === undefined || event[key] === null) {
      return { ok: false, reason: `missing_${key}` };
    }
  }

  if (event.eventType !== 'market.tick') {
    return { ok: false, reason: 'invalid_event_type' };
  }

  if (typeof event.payload.price !== 'number') {
    return { ok: false, reason: 'invalid_price' };
  }

  return { ok: true };
}

module.exports = {
  EVENT_VERSION,
  buildMarketEvent,
  validateMarketEvent,
  createEventId,
  createTraceId
};
