const { createClient } = require('redis');
const { ingestionRate, EVENT_CHANNEL } = require('stock-shared');
const { fetchQuote } = require('./fetcher');
const debug = require('debug')('ingest:index');

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (e) => console.error('redis', e));

async function publish(event) {
  await redis.connect();
  await redis.publish(EVENT_CHANNEL, JSON.stringify(event));
  ingestionRate.inc();
  await redis.disconnect();
}

// Simulate streaming by pulling a batch of symbols and publishing with seq numbers
async function run() {
  const symbols = (process.env.SYMBOLS || 'AAPL,MSFT,GOOGL').split(',');
  let seq = 0;
  while (true) {
    const promises = symbols.map(async (s) => {
      try {
        const data = await fetchQuote(s);
        const quote = data['Global Quote'] || {};
        const price = parseFloat(quote['05. price'] || '0');
        const timestamp = new Date().toISOString();
        const event = { id: `${s}:${Date.now()}:${++seq}`, symbol: s, price, timestamp, seq };
        await publish(event);
        debug('published', event.id);
      } catch (err) {
        console.error('fetch/publish error', s, err.message);
      }
    });
    await Promise.all(promises);
    // batch interval
    await new Promise((r) => setTimeout(r, Number(process.env.BATCH_MS || 15000)));
  }
}

if (require.main === module) run().catch((e) => { console.error(e); process.exit(1); });
