const { WebSocket } = require('ws');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, data: parsed };
}

async function main() {
  const ingestionBase = process.env.INGESTION_BASE || 'http://127.0.0.1:4010';
  const alertBase = process.env.ALERT_BASE || 'http://127.0.0.1:4020';
  const apiBase = process.env.API_BASE || 'http://127.0.0.1:4030';
  const userId = process.env.USER_ID || '000000000000000000000001';
  const symbol = process.env.SYMBOL || 'AAPL';

  const health = await Promise.all([
    httpJson(`${ingestionBase}/health`),
    httpJson(`${alertBase}/health`),
    httpJson(`${apiBase}/health`)
  ]);
  for (const h of health) {
    if (h.status !== 200) throw new Error(`health_failed:${h.status}`);
  }

  // Create an always-true strategy (no cooldown) so the test is deterministic.
  const stratRes = await httpJson(`${apiBase}/api/strategies`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: {
      name: `SmokeAlwaysFire-${Date.now()}`,
      symbol,
      cooldownSec: 0,
      dsl: 'price_change > -100'
    }
  });
  if (stratRes.status !== 201) throw new Error(`create_strategy_failed:${stratRes.status}`);

  const wsUrl = `${apiBase.replace('http', 'ws')}/ws`;
  const ws = new WebSocket(wsUrl);
  let firstAlertAt = null;

  const ready = new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  await ready;

  ws.send(JSON.stringify({ type: 'auth', userId }));
  ws.send(JSON.stringify({ type: 'subscribe', symbols: [symbol] }));

  ws.on('message', (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      if (msg.type === 'alert' && !firstAlertAt) {
        firstAlertAt = Date.now();
      }
    } catch {
      // ignore
    }
  });

  const t0 = Date.now();
  const gen = await httpJson(`${ingestionBase}/admin/generate`, {
    method: 'POST',
    body: { symbols: [symbol], events: 200, basePrice: 100, jitterPct: 0.5 }
  });
  if (gen.status !== 200) throw new Error(`generate_failed:${gen.status}`);

  // Wait up to 10s for first alert.
  for (let i = 0; i < 100; i += 1) {
    if (firstAlertAt) break;
    await sleep(100);
  }
  if (!firstAlertAt) throw new Error('ws_alert_not_received');

  // Confirm persisted alerts exist.
  const alerts = await httpJson(`${apiBase}/api/alerts?page=1&limit=10`, {
    headers: { 'x-user-id': userId }
  });
  if (alerts.status !== 200) throw new Error(`alerts_api_failed:${alerts.status}`);
  const count = Array.isArray(alerts.data?.items) ? alerts.data.items.length : 0;

  const [ingMetrics, alMetrics] = await Promise.all([
    fetch(`${ingestionBase}/metrics`).then((r) => r.text()),
    fetch(`${alertBase}/metrics`).then((r) => r.text())
  ]);

  ws.close();

  const out = {
    ok: true,
    symbol,
    strategyId: stratRes.data?._id,
    generated: gen.data?.generated,
    ws_first_alert_latency_ms: firstAlertAt - t0,
    alerts_api_items: count,
    evidence: {
      alerts_emitted_total_line: alMetrics.split('\n').find((l) => l.startsWith('alerts_emitted_total')) || null,
      ingestion_rate_line: ingMetrics.split('\n').find((l) => l.startsWith('ingestion_rate')) || null
    }
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

