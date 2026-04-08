const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: process.env.ENV_PATH || path.resolve(process.cwd(), '.env') });

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

module.exports = {
  required,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock_prod',
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || '',
    INGESTION_BATCH_SIZE: Number(process.env.INGESTION_BATCH_SIZE || 20),
    INGESTION_INTERVAL_MS: Number(process.env.INGESTION_INTERVAL_MS || 1000),
    ALPHA_RATE_LIMIT_PER_MIN: Number(process.env.ALPHA_RATE_LIMIT_PER_MIN || 5),
    DEFAULT_CACHE_TTL_SEC: Number(process.env.DEFAULT_CACHE_TTL_SEC || 15),
    ALERT_COOLDOWN_SEC: Number(process.env.ALERT_COOLDOWN_SEC || 60),
    PORT: Number(process.env.PORT || 3000)
  }
};
