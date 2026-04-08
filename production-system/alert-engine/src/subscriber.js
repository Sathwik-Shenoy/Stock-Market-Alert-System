const { createRedis } = require('../../shared/redis');
const { validateMarketEvent } = require('../../shared/eventSchema');
const { acquireLock } = require('../../shared/idempotency');
const { connectMongo } = require('../../shared/mongo');
const { env } = require('../../shared/env');
const logger = require('../../shared/logger');
const { metrics } = require('../../shared/metrics');
const { ensureConsumerGroup, safeXAck } = require('../../shared/streams');
const Strategy = require('../../shared/models/Strategy');
const AlertNotification = require('../../shared/models/AlertNotification');
const MarketEvent = require('../../shared/models/MarketEvent');
const { evaluateStrategy, buildIndicatorContext } = require('./ruleEngine');

const MARKET_STREAM = 'stream:market.ticks.v1';
const ALERTS_STREAM = 'stream:alerts.v1';
const GROUP = 'alert-engine.v1';

const redis = createRedis();
const consumer = createRedis();

async function appendClose(symbol, closePrice) {
  const key = `indicators:closes:${symbol}`;
  await redis.multi()
    .rpush(key, String(closePrice))
    .ltrim(key, -200, -1)
    .expire(key, 86400)
    .exec();

  const closes = await redis.lrange(key, 0, -1);
  return closes.map(Number);
}

async function getLastSequence(symbol) {
  const key = `ordering:last_seq:${symbol}`;
  return Number(await redis.get(key) || 0);
}

async function setLastSequence(symbol, seq) {
  const key = `ordering:last_seq:${symbol}`;
  await redis.set(key, String(seq), 'EX', 86400);
}

async function bulkUpsertMarketEvents(events) {
  const ops = events.map((event) => ({
    updateOne: {
      filter: { eventId: event.eventId },
      update: {
        $setOnInsert: {
          ...event,
          marketTimestamp: new Date(event.marketTimestamp),
          ingestTimestamp: new Date(event.ingestTimestamp),
          payload: event.payload
        }
      },
      upsert: true
    }
  }));

  if (!ops.length) return new Set();
  const res = await MarketEvent.bulkWrite(ops, { ordered: false });

  const inserted = new Set();
  const upsertedIds = res.getUpsertedIds?.() || res.upsertedIds || [];
  if (Array.isArray(upsertedIds)) {
    for (const up of upsertedIds) inserted.add(up.index);
  } else if (upsertedIds && typeof upsertedIds === 'object') {
    for (const k of Object.keys(upsertedIds)) inserted.add(Number(k));
  }
  return inserted;
}

async function processRule({ event, strategy, indicatorContext }) {
  const lockKey = `rule:${strategy._id}:event:${event.eventId}`;
  const lock = await acquireLock(redis, lockKey, 2000);
  if (!lock) {
    return;
  }

  const cooldownSec = Number.isFinite(strategy.cooldownSec) ? strategy.cooldownSec : env.ALERT_COOLDOWN_SEC;
  if (cooldownSec > 0) {
    const cooldownKey = `cooldown:rule:${strategy._id}`;
    const cooldownSet = await redis.set(cooldownKey, '1', 'EX', cooldownSec, 'NX');
    if (!cooldownSet) {
      metrics.alertsProcessedTotal.inc({ rule_id: String(strategy._id), symbol: event.symbol, result: 'suppressed_cooldown' });
      return;
    }
  }

  const evaluation = evaluateStrategy(strategy, indicatorContext);
  if (!evaluation.triggered) {
    metrics.alertsProcessedTotal.inc({ rule_id: String(strategy._id), symbol: event.symbol, result: 'no_match' });
    return;
  }

  // Exactly-once alert insert in Mongo for this (rule,event) pair.
  // Stream delivery is at-least-once, so this dedupeKey is the final authority.
  const dedupeKey = `alert:${strategy._id}:${event.eventId}`;

  const upsert = await AlertNotification.updateOne(
    { dedupeKey },
    {
      $setOnInsert: {
        dedupeKey,
        eventId: event.eventId,
        ruleId: strategy._id,
        userId: strategy.userId,
        symbol: event.symbol,
        eventTimestamp: new Date(event.marketTimestamp),
        matchedConditions: evaluation.evaluations.filter((x) => x.matched),
        deliveryStatus: 'pending'
      }
    },
    { upsert: true }
  );

  metrics.alertsProcessedTotal.inc({ rule_id: String(strategy._id), symbol: event.symbol, result: 'triggered' });
  metrics.alertLatencyMs.observe({ symbol: event.symbol }, Date.now() - new Date(event.marketTimestamp).getTime());

  // At-least-once alert fanout via a durable stream.
  // Duplicates are prevented by Mongo unique `dedupeKey` + downstream client replay from DB.
  if (upsert.upsertedCount === 1) {
    const alertEvent = {
      schemaVersion: '1.0.0',
      eventType: 'alert.triggered',
      traceId: event.traceId,
      eventId: event.eventId,
      symbol: event.symbol,
      ruleId: String(strategy._id),
      userId: String(strategy.userId),
      eventTimestamp: event.marketTimestamp,
      dedupeKey,
      matchedConditions: evaluation.evaluations.filter((x) => x.matched)
    };

    await redis.xadd(
      ALERTS_STREAM,
      'MAXLEN',
      '~',
      200000,
      '*',
      'userId',
      alertEvent.userId,
      'symbol',
      alertEvent.symbol,
      'ruleId',
      alertEvent.ruleId,
      'traceId',
      alertEvent.traceId || '',
      'data',
      JSON.stringify(alertEvent)
    );
  }

  if (upsert.upsertedCount === 1) {
    metrics.alertsEmittedTotal.inc({ symbol: event.symbol });
  }

  logger.info('alert_triggered', {
    eventId: event.eventId,
    symbol: event.symbol,
    ruleId: String(strategy._id),
    userId: String(strategy.userId),
    traceId: event.traceId,
    matchedConditions: evaluation.evaluations.filter((x) => x.matched)
  });
}

function fieldsToObject(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

async function processEvent(event) {
  const valid = validateMarketEvent(event);
  if (!valid.ok) {
    logger.warn('event_validation_failed', { reason: valid.reason, eventId: event.eventId, traceId: event.traceId });
    return;
  }

  const lastSeq = await getLastSequence(event.symbol);
  if (lastSeq && event.sequence <= lastSeq) {
    logger.warn('out_of_order_event_dropped', { eventId: event.eventId, symbol: event.symbol, sequence: event.sequence, lastSeq, traceId: event.traceId });
    return;
  }

  const closes = await appendClose(event.symbol, event.payload.price);
  const indicatorContext = buildIndicatorContext({ event, closes });

  const strategies = await Strategy.find({ symbol: event.symbol, isActive: true }).lean();
  await Promise.all(strategies.map((strategy) => processRule({ event, strategy, indicatorContext })));
  await setLastSequence(event.symbol, event.sequence);
}

async function processStreamMessage({ id, fields }) {
  let event;
  try {
    const obj = fieldsToObject(fields);
    event = JSON.parse(obj.data);
  } catch (error) {
    logger.warn('invalid_stream_event', { id, error: error.message });
    return;
  }
  await processEvent(event);
}

async function startSubscriber() {
  await connectMongo();
  const consumerName = `${process.pid}`;
  await ensureConsumerGroup(redis, { stream: MARKET_STREAM, group: GROUP, startId: '0-0' });

  // Crash recovery: claim stale pending messages from other consumers.
  // Limitation: relies on Redis 6.2+ XAUTOCLAIM.
  async function recoverPending() {
    try {
      const res = await consumer.xautoclaim(MARKET_STREAM, GROUP, consumerName, 30000, '0-0', 'COUNT', 100);
      const nextStart = res?.[0];
      const messages = res?.[1] || [];
      const batch = [];
      for (const msg of messages) {
        const [id, fields] = msg;
        try {
          const obj = fieldsToObject(fields);
          const event = JSON.parse(obj.data);
          batch.push({ id, fields, event });
        } catch (error) {
          logger.warn('invalid_stream_event', { id, error: error.message });
          await safeXAck(consumer, { stream: MARKET_STREAM, group: GROUP, id });
        }
      }

      const inserted = await bulkUpsertMarketEvents(batch.map((m) => m.event));
      const bySymbol = new Map();
      batch.forEach((m, idx) => {
        if (!inserted.has(idx)) return;
        const sym = m.event.symbol;
        if (!bySymbol.has(sym)) bySymbol.set(sym, []);
        bySymbol.get(sym).push(m);
      });

      const tasks = [];
      for (const arr of bySymbol.values()) {
        arr.sort((a, b) => a.event.sequence - b.event.sequence);
        tasks.push((async () => {
          for (const m of arr) await processEvent(m.event);
        })());
      }
      await Promise.all(tasks);

      for (const m of batch) {
        await safeXAck(consumer, { stream: MARKET_STREAM, group: GROUP, id: m.id });
      }
      return nextStart;
    } catch (error) {
      logger.warn('pending_recovery_failed', { error: error.message });
      return '0-0';
    }
  }

  await recoverPending();

  const COUNT = Number(process.env.STREAM_READ_COUNT || 50);
  while (true) {
    try {
      const streams = await consumer.xreadgroup(
        'GROUP',
        GROUP,
        consumerName,
        'COUNT',
        COUNT,
        'BLOCK',
        2000,
        'STREAMS',
        MARKET_STREAM,
        '>'
      );

      if (!streams) continue;

      const [, entries] = streams[0];
      const messages = [];
      for (const entry of entries) {
        const [id, fields] = entry;
        try {
          const obj = fieldsToObject(fields);
          const event = JSON.parse(obj.data);
          const valid = validateMarketEvent(event);
          if (!valid.ok) {
            logger.warn('event_validation_failed', { reason: valid.reason, eventId: event.eventId, traceId: event.traceId });
            await safeXAck(consumer, { stream: MARKET_STREAM, group: GROUP, id });
            continue;
          }
          messages.push({ id, fields, event });
        } catch (error) {
          logger.warn('invalid_stream_event', { id, error: error.message });
          await safeXAck(consumer, { stream: MARKET_STREAM, group: GROUP, id });
        }
      }

      // Durable persistence (idempotent upsert). Inserted indices are the only ones that must be evaluated.
      const inserted = await bulkUpsertMarketEvents(messages.map((m) => m.event));

      // Group inserted events by symbol and process in order to keep indicator state consistent.
      const bySymbol = new Map();
      messages.forEach((m, idx) => {
        if (!inserted.has(idx)) return;
        const sym = m.event.symbol;
        if (!bySymbol.has(sym)) bySymbol.set(sym, []);
        bySymbol.get(sym).push(m);
      });

      const symbolTasks = [];
      for (const [sym, arr] of bySymbol.entries()) {
        arr.sort((a, b) => a.event.sequence - b.event.sequence);
        symbolTasks.push((async () => {
          for (const m of arr) {
            await processEvent(m.event);
          }
        })());
      }
      await Promise.all(symbolTasks);

      // Ack all messages after persistence + evaluation.
      for (const m of messages) {
        await safeXAck(consumer, { stream: MARKET_STREAM, group: GROUP, id: m.id });
      }
    } catch (error) {
      metrics.streamConsumeFailuresTotal.inc({ service: 'alert-engine', stream: MARKET_STREAM });
      logger.error('alert_engine_stream_loop_failed', { error: error.message, stack: error.stack });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

module.exports = { startSubscriber };
