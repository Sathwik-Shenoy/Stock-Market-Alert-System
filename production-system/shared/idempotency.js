async function markEventProcessed(redis, namespace, eventId, ttlSec = 3600) {
  const key = `idem:${namespace}:${eventId}`;
  const result = await redis.set(key, '1', 'EX', ttlSec, 'NX');
  return result === 'OK';
}

async function acquireLock(redis, lockKey, ttlMs = 3000) {
  const result = await redis.set(`lock:${lockKey}`, '1', 'PX', ttlMs, 'NX');
  return result === 'OK';
}

module.exports = {
  markEventProcessed,
  acquireLock
};
