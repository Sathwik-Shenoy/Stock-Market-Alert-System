function parseMetric(text, metricName, labelFilter = {}) {
  // Very small Prometheus exposition parser for single-sample metrics.
  // Matches: metric{a="b"} 123
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.startsWith(metricName)) continue;
    const m = line.match(/^([a-zA-Z0-9_:]+)(\{([^}]*)\})?\s+([0-9.eE+-]+)$/);
    if (!m) continue;
    const labelsStr = m[3] || '';
    const value = Number(m[4]);
    const labels = {};
    if (labelsStr) {
      for (const part of labelsStr.split(',')) {
        const [k, v] = part.split('=');
        if (!k || !v) continue;
        labels[k.trim()] = v.trim().replace(/^"|"$/g, '');
      }
    }
    let ok = true;
    for (const [k, v] of Object.entries(labelFilter)) {
      if (labels[k] !== v) ok = false;
    }
    if (ok) return value;
  }
  return null;
}

function parseMetricSum(text, metricName, labelFilter = {}) {
  const lines = text.split('\n');
  let sum = 0;
  let found = false;
  for (const line of lines) {
    if (!line.startsWith(metricName)) continue;
    const m = line.match(/^([a-zA-Z0-9_:]+)(\{([^}]*)\})?\s+([0-9.eE+-]+)$/);
    if (!m) continue;
    const labelsStr = m[3] || '';
    const value = Number(m[4]);
    const labels = {};
    if (labelsStr) {
      for (const part of labelsStr.split(',')) {
        const [k, v] = part.split('=');
        if (!k || !v) continue;
        labels[k.trim()] = v.trim().replace(/^"|"$/g, '');
      }
    }
    let ok = true;
    for (const [k, v] of Object.entries(labelFilter)) {
      if (labels[k] !== v) ok = false;
    }
    if (!ok) continue;
    found = true;
    sum += value;
  }
  return found ? sum : null;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`http_${res.status}`);
  return res.text();
}

async function snapshot({ ingestionMetricsUrl, alertMetricsUrl }) {
  const [ing, al] = await Promise.all([fetchText(ingestionMetricsUrl), fetchText(alertMetricsUrl)]);
  return {
    ingestionRateTotal: parseMetricSum(ing, 'ingestion_rate'),
    alertsEmittedTotal: parseMetricSum(al, 'alerts_emitted_total'),
    alertLatencySum: parseMetricSum(al, 'alert_latency_ms_sum'),
    alertLatencyCount: parseMetricSum(al, 'alert_latency_ms_count')
  };
}

function delta(after, before) {
  const out = {};
  for (const k of Object.keys(after)) {
    const a = after[k] == null ? 0 : after[k];
    const b = before[k] == null ? 0 : before[k];
    out[k] = a - b;
  }
  return out;
}

async function main() {
  const ingestionBase = process.env.INGESTION_BASE || 'http://127.0.0.1:4010';
  const alertBase = process.env.ALERT_BASE || 'http://127.0.0.1:4020';

  const ingestionMetricsUrl = `${ingestionBase}/metrics`;
  const alertMetricsUrl = `${alertBase}/metrics`;

  const symbols = (process.env.SYMBOLS || 'AAPL,MSFT,GOOG,AMZN,TSLA').split(',').map((s) => s.trim());
  const events = Number(process.env.GEN_EVENTS || 2000);

  const before = await snapshot({ ingestionMetricsUrl, alertMetricsUrl });
  if (process.env.DEBUG === '1') console.log('before_snapshot', before);
  const t0 = Date.now();
  const tGen0 = Date.now();

  const genRes = await fetch(`${ingestionBase}/admin/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbols, events, basePrice: 100, jitterPct: 0.5 })
  });
  if (!genRes.ok) throw new Error(`generate_failed_${genRes.status}`);
  await genRes.json();
  const tGen1 = Date.now();

  // Wait for consumer to drain (best-effort).
  await new Promise((r) => setTimeout(r, Number(process.env.DRAIN_MS || 3000)));

  const after = await snapshot({ ingestionMetricsUrl, alertMetricsUrl });
  if (process.env.DEBUG === '1') console.log('after_snapshot', after);
  const t1 = Date.now();
  const dtSec = (t1 - t0) / 1000;
  const genSec = (tGen1 - tGen0) / 1000;

  const d = delta(after, before);
  const ingested = d.ingestionRateTotal ?? 0;
  const alerts = d.alertsEmittedTotal ?? 0;
  const avgLatency = (d.alertLatencyCount && d.alertLatencySum) ? (d.alertLatencySum / d.alertLatencyCount) : null;

  console.log('\n=== E2E Metrics ===');
  console.log(`generated_events: ${events * symbols.length}`);
  console.log(`generate_sec: ${genSec.toFixed(2)}`);
  console.log(`window_sec: ${dtSec.toFixed(2)}`);
  console.log(`producer_events_per_sec: ${(ingested / Math.max(genSec, 0.001)).toFixed(2)}`);
  console.log(`alerts_emitted_per_sec: ${(alerts / Math.max(dtSec, 0.001)).toFixed(2)}`);
  console.log(`avg_alert_latency_ms (approx): ${avgLatency == null ? 'n/a' : avgLatency.toFixed(2)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
