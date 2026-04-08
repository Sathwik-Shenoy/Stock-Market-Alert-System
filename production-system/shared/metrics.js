const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const metrics = {
  ingestionRate: new client.Counter({
    name: 'ingestion_rate',
    help: 'Count of ingested market events',
    labelNames: ['symbol'],
    registers: [register]
  }),
  streamConsumeFailuresTotal: new client.Counter({
    name: 'stream_consume_failures_total',
    help: 'Total stream consume failures',
    labelNames: ['service', 'stream'],
    registers: [register]
  }),
  alertsProcessedTotal: new client.Counter({
    name: 'alerts_processed_total',
    help: 'Total alerts processed by alert engine',
    labelNames: ['rule_id', 'symbol', 'result'],
    registers: [register]
  }),
  alertsEmittedTotal: new client.Counter({
    name: 'alerts_emitted_total',
    help: 'Total alerts emitted into alerts stream',
    labelNames: ['symbol'],
    registers: [register]
  }),
  alertLatencyMs: new client.Histogram({
    name: 'alert_latency_ms',
    help: 'Latency between event time and alert emission in milliseconds',
    labelNames: ['symbol'],
    buckets: [10, 20, 50, 100, 200, 500, 1000, 2500, 5000],
    registers: [register]
  }),
  apiRequestsTotal: new client.Counter({
    name: 'api_requests_total',
    help: 'Total API requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register]
  }),
  apiRequestDurationMs: new client.Histogram({
    name: 'api_request_duration_ms',
    help: 'API request duration in milliseconds',
    labelNames: ['method', 'path'],
    buckets: [5, 10, 20, 50, 100, 200, 500, 1000, 2500, 5000],
    registers: [register]
  })
};

module.exports = { register, metrics };
