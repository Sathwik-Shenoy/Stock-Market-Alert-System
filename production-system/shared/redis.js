const Redis = require('ioredis');
const { env } = require('./env');

function createRedis() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
    enableReadyCheck: true
  });
}

module.exports = { createRedis };
