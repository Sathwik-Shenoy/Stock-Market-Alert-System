const axios = require('axios');
const { env } = require('../../shared/env');
const { withRetry } = require('../../shared/retry');
const logger = require('../../shared/logger');

const baseURL = 'https://www.alphavantage.co/query';

async function fetchGlobalQuote(symbol) {
  return withRetry(async () => {
    const res = await axios.get(baseURL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: env.ALPHA_VANTAGE_API_KEY
      },
      timeout: 5000
    });

    const quote = res.data?.['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error(`bad_response_for_${symbol}`);
    }

    return {
      symbol,
      price: Number(quote['05. price']),
      volume: Number(quote['06. volume'] || 0),
      marketTimestamp: quote['07. latest trading day']
        ? new Date(`${quote['07. latest trading day']}T00:00:00.000Z`).toISOString()
        : new Date().toISOString()
    };
  }, {
    maxAttempts: 4,
    baseDelayMs: 300,
    maxDelayMs: 4000,
    onRetry: ({ attempt, delayMs, error }) => {
      logger.warn('alpha_vantage_retry', { symbol, attempt, delayMs, error: error.message });
    }
  });
}

module.exports = { fetchGlobalQuote };
