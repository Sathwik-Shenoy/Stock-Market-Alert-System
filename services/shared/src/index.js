const { createClient } = require('redis');
const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (e) => console.error('Redis error', e));

const promClient = require('prom-client');

// Prometheus metrics
const alertsProcessed = new promClient.Counter({ name: 'alerts_processed_total', help: 'Total alerts processed' });
const alertLatency = new promClient.Histogram({ name: 'alert_latency_ms', help: 'Alert processing latency ms', buckets: [10,50,100,500,1000,5000] });
const ingestionRate = new promClient.Counter({ name: 'ingestion_rate', help: 'Ingestion events published' });

const EVENT_CHANNEL = process.env.EVENT_CHANNEL || 'stock_updates';

const EVENT_SCHEMA = {
  version: '1.0',
  type: 'stock_update',
  // Example payload fields: symbol, price, timestamp, seq
};

module.exports = { client, EVENT_CHANNEL, EVENT_SCHEMA, promClient, alertsProcessed, alertLatency, ingestionRate };
