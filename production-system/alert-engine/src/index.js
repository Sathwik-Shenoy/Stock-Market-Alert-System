const express = require('express');
const { env } = require('../../shared/env');
const logger = require('../../shared/logger');
const { register } = require('../../shared/metrics');
const { startSubscriber } = require('./subscriber');

const app = express();

app.get('/health', (_req, res) => res.json({ ok: true, service: 'alert-engine' }));

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(env.PORT, () => {
  logger.info('alert_engine_started', { port: env.PORT });
  startSubscriber().catch((error) => {
    logger.error('alert_engine_crashed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
});
