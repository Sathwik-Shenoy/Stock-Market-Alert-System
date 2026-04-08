const axios = require('axios');
const pRetry = require('p-retry');
const Bottleneck = require('bottleneck');
const debug = require('debug')('ingest:fetcher');

// AlphaVantage free limits ~5 req/minute; use limiter to avoid 429
const limiter = new Bottleneck({ minTime: 15000 }); // 4 requests/min ~= 15s gap (conservative)

async function fetchQuote(symbol) {
  const key = process.env.AV_KEY;
  if (!key) throw new Error('AV_KEY not set');

  const fn = async () => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    debug('fetch', symbol);
    const res = await axios.get(url, { timeout: 10000 });
    if (res.status !== 200) throw new Error('Bad response');
    return res.data;
  };

  // retry with exponential backoff on transient failures
  return pRetry(() => limiter.schedule(() => fn()), { retries: 5, factor: 2 });
}

module.exports = { fetchQuote };
