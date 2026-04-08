const express = require('express');
const http = require('http');
const { env } = require('../../shared/env');
const logger = require('../../shared/logger');
const { register } = require('../../shared/metrics');
const { connectMongo } = require('../../shared/mongo');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { createWsGateway } = require('./ws/wsGateway');
const { newTraceId } = require('../../shared/trace');
const { metrics } = require('../../shared/metrics');

const strategyRoutes = require('./routes/strategyRoutes');
const marketRoutes = require('./routes/marketRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const alertsRoutes = require('./routes/alertsRoutes');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(apiRateLimiter);

// Basic request tracing + metrics.
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] ? String(req.headers['x-trace-id']) : newTraceId();
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  const start = Date.now();
  res.on('finish', () => {
    const path = req.route?.path ? String(req.route.path) : req.path;
    metrics.apiRequestsTotal.inc({ method: req.method, path, status: String(res.statusCode) });
    metrics.apiRequestDurationMs.observe({ method: req.method, path }, Date.now() - start);
    logger.info('api_request', { traceId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api-server' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/strategies', strategyRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/backtests', backtestRoutes);
app.use('/api/alerts', alertsRoutes);

app.use((error, _req, res, _next) => {
  logger.error('api_error', { error: error.message, stack: error.stack });
  res.status(error.statusCode || 500).json({
    error: error.message || 'internal_server_error'
  });
});

connectMongo()
  .then(() => {
    const server = http.createServer(app);
    const ws = createWsGateway({ httpServer: server });
    server.listen(env.PORT, () => {
      logger.info('api_server_started', { port: env.PORT, wsPath: '/ws' });
      ws.start().catch((error) => {
        logger.error('ws_gateway_crashed', { error: error.message, stack: error.stack });
        process.exit(1);
      });
    });
  })
  .catch((error) => {
    logger.error('api_server_boot_failed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
