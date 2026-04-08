const logger = require('./logger');

async function ensureConsumerGroup(redis, { stream, group, startId = '0-0' }) {
  try {
    // MKSTREAM creates the stream if it doesn't exist.
    await redis.xgroup('CREATE', stream, group, startId, 'MKSTREAM');
    logger.info('stream_group_created', { stream, group, startId });
  } catch (error) {
    if (String(error.message || '').includes('BUSYGROUP')) {
      return;
    }
    throw error;
  }
}

async function safeXAck(redis, { stream, group, id }) {
  try {
    await redis.xack(stream, group, id);
  } catch (error) {
    logger.warn('xack_failed', { stream, group, id, error: error.message });
  }
}

module.exports = {
  ensureConsumerGroup,
  safeXAck
};

