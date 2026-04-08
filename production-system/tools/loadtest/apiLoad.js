const autocannon = require('autocannon');

function userIdFor(i) {
  // deterministic, valid ObjectId-like hex string
  return String(i).padStart(24, '0').slice(-24);
}

async function run({ title, url, connections, duration, symbols, users }) {
  const reqs = [];
  for (let i = 0; i < users; i += 1) {
    const userId = userIdFor(i + 1);
    for (const sym of symbols) {
      reqs.push({
        method: 'GET',
        path: `/api/market/latest/${sym}`,
        headers: { 'x-user-id': userId }
      });
    }
  }

  reqs.push({
    method: 'GET',
    path: `/api/alerts?page=1&limit=20`,
    headers: { 'x-user-id': userIdFor(1) }
  });

  console.log(`\n=== ${title} ===`);
  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
    requests: reqs
  });
  const summary = {
    connections,
    duration_sec: duration,
    reqs_avg: result.requests.average,
    reqs_p99: result.requests.p99,
    latency_avg_ms: result.latency.average,
    latency_p50_ms: result.latency.p50,
    latency_p90_ms: result.latency.p90,
    latency_p99_ms: result.latency.p99,
    throughput_avg_bps: result.throughput.average,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx
  };
  console.log(JSON.stringify(summary, null, 2));
  return result;
}

async function main() {
  const apiBase = process.env.API_BASE || 'http://127.0.0.1:4030';
  const symbols = (process.env.SYMBOLS || 'AAPL,MSFT,GOOG,AMZN,TSLA').split(',').map((s) => s.trim());
  const users = Number(process.env.USERS || 50);

  await run({
    title: 'API Mixed Load (latest quotes + alerts list)',
    url: apiBase,
    connections: Number(process.env.CONN || 200),
    duration: Number(process.env.DUR || 20),
    symbols,
    users
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
