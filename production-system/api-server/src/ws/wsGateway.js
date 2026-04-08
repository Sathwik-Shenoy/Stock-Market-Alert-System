const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const { createRedis } = require('../../../shared/redis');
const { ensureConsumerGroup, safeXAck } = require('../../../shared/streams');
const logger = require('../../../shared/logger');
const AlertNotification = require('../../../shared/models/AlertNotification');
const { metrics } = require('../../../shared/metrics');

const ALERTS_STREAM = 'stream:alerts.v1';
const GROUP = 'ws-gateway.v1';

function fieldsToObject(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
  return obj;
}

function createWsGateway({ httpServer }) {
  const redis = createRedis();
  const consumer = createRedis();

  // userId -> Set(ws)
  const userSockets = new Map();
  // ws -> { userId, symbols:Set, strategies:Set }
  const socketState = new Map();

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function addSocket(userId, ws) {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(ws);
  }

  function removeSocket(ws) {
    const st = socketState.get(ws);
    if (st?.userId && userSockets.has(st.userId)) {
      userSockets.get(st.userId).delete(ws);
      if (userSockets.get(st.userId).size === 0) userSockets.delete(st.userId);
    }
    socketState.delete(ws);
  }

  function shouldDeliver(ws, alert) {
    const st = socketState.get(ws);
    if (!st?.userId) return false;
    if (String(st.userId) !== String(alert.userId)) return false;

    // If no explicit subscriptions, default allow (prevents silent drops).
    const hasFilters = (st.symbols && st.symbols.size > 0) || (st.strategies && st.strategies.size > 0);
    if (!hasFilters) return true;

    if (st.symbols?.has(alert.symbol)) return true;
    if (st.strategies?.has(String(alert.ruleId))) return true;
    return false;
  }

  async function replaySince(userId, sinceIso, ws) {
    if (!sinceIso) return;
    const since = new Date(String(sinceIso));
    if (Number.isNaN(since.getTime())) return;

    const items = await AlertNotification.find({
      userId: new mongoose.Types.ObjectId(userId),
      eventTimestamp: { $gte: since }
    })
      .sort({ eventTimestamp: 1 })
      .limit(200)
      .lean();

    for (const it of items) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'alert', source: 'replay', data: it }));
      }
    }
  }

  wss.on('connection', (ws) => {
    socketState.set(ws, { userId: null, symbols: new Set(), strategies: new Set() });

    ws.on('message', async (buf) => {
      let msg;
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        return;
      }

      if (msg.type === 'auth') {
        const userId = String(msg.userId || '');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          ws.send(JSON.stringify({ type: 'error', error: 'invalid_userId' }));
          ws.close();
          return;
        }
        const st = socketState.get(ws);
        st.userId = userId;
        addSocket(userId, ws);
        ws.send(JSON.stringify({ type: 'auth_ok', userId }));
        await replaySince(userId, msg.since, ws);
        return;
      }

      if (msg.type === 'subscribe') {
        const st = socketState.get(ws);
        for (const s of (msg.symbols || [])) st.symbols.add(String(s).toUpperCase());
        for (const id of (msg.strategies || [])) st.strategies.add(String(id));
        ws.send(JSON.stringify({ type: 'subscribed', symbols: [...st.symbols], strategies: [...st.strategies] }));
        return;
      }

      if (msg.type === 'unsubscribe') {
        const st = socketState.get(ws);
        for (const s of (msg.symbols || [])) st.symbols.delete(String(s).toUpperCase());
        for (const id of (msg.strategies || [])) st.strategies.delete(String(id));
        ws.send(JSON.stringify({ type: 'subscribed', symbols: [...st.symbols], strategies: [...st.strategies] }));
      }
    });

    ws.on('close', () => removeSocket(ws));
    ws.on('error', () => removeSocket(ws));
  });

  async function startAlertConsumerLoop() {
    const consumerName = `${process.pid}`;
    await ensureConsumerGroup(redis, { stream: ALERTS_STREAM, group: GROUP, startId: '0-0' });

    // Recover stuck deliveries first.
    try {
      const res = await consumer.xautoclaim(ALERTS_STREAM, GROUP, consumerName, 30000, '0-0', 'COUNT', 100);
      const messages = res?.[1] || [];
      for (const msg of messages) {
        const [id, fields] = msg;
        await handleStreamAlert({ id, fields });
        await safeXAck(consumer, { stream: ALERTS_STREAM, group: GROUP, id });
      }
    } catch (error) {
      logger.warn('ws_pending_recovery_failed', { error: error.message });
    }

    while (true) {
      try {
        const streams = await consumer.xreadgroup(
          'GROUP',
          GROUP,
          consumerName,
          'COUNT',
          100,
          'BLOCK',
          2000,
          'STREAMS',
          ALERTS_STREAM,
          '>'
        );
        if (!streams) continue;
        const [, entries] = streams[0];
        for (const entry of entries) {
          const [id, fields] = entry;
          await handleStreamAlert({ id, fields });
          await safeXAck(consumer, { stream: ALERTS_STREAM, group: GROUP, id });
        }
      } catch (error) {
        metrics.streamConsumeFailuresTotal.inc({ service: 'ws-gateway', stream: ALERTS_STREAM });
        logger.error('ws_stream_loop_failed', { error: error.message, stack: error.stack });
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  async function handleStreamAlert({ id, fields }) {
    const obj = fieldsToObject(fields);
    let alert;
    try {
      alert = JSON.parse(obj.data);
    } catch (error) {
      logger.warn('ws_bad_alert_json', { id, error: error.message });
      return;
    }

    const sockets = userSockets.get(String(alert.userId));
    if (!sockets || sockets.size === 0) return;

    const payload = JSON.stringify({ type: 'alert', source: 'stream', data: alert });
    for (const ws of sockets) {
      if (ws.readyState !== ws.OPEN) continue;
      if (!shouldDeliver(ws, alert)) continue;
      try {
        ws.send(payload);
      } catch {
        // If a client is slow or broken, keep system healthy by dropping this send.
      }
    }
  }

  return {
    wss,
    start: startAlertConsumerLoop
  };
}

module.exports = { createWsGateway };

