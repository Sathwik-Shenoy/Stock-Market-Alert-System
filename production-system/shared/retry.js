const logger = require('./logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, {
  maxAttempts = 5,
  baseDelayMs = 250,
  maxDelayMs = 5000,
  factor = 2,
  onRetry = () => {}
} = {}) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn(attempt + 1);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw error;
      }

      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(factor, attempt - 1));
      const jitter = Math.floor(Math.random() * 100);
      const delayMs = expDelay + jitter;

      onRetry({ attempt, delayMs, error });
      logger.warn('retrying_operation', {
        attempt,
        delayMs,
        error: error.message
      });
      await sleep(delayMs);
    }
  }
}

module.exports = { withRetry };
