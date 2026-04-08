# Stock Market Monitoring System - Production Grade Redesign

## Architecture Overview

### Services
1. **ingestion-service**: Fetches stock data, handles rate limits, pushes events to Redis Pub/Sub.
2. **alert-engine**: Subscribes to stock events, evaluates alert rules, ensures idempotency, publishes alerts.
3. **api-server**: Exposes REST APIs for strategy management, backtesting, metrics, and historical data.

### Communication Flow

- ingestion-service → (Redis Pub/Sub) → alert-engine → (MongoDB, Redis) → api-server
- api-server ↔ MongoDB, Redis

### Event Flow (Text Diagram)

[Alpha Vantage API]
      |
      v
[ingestion-service] --(event: stock_update)--> [Redis Pub/Sub] --(event: stock_update)--> [alert-engine]
      |                                                                                       |
      |                                                                                       v
      |                                                                              [MongoDB, Redis]
      |
      v
[api-server] <----------------------------------------------------------- [alert-engine, ingestion-service]

- All services log to a central log aggregator (not shown here).
- Metrics endpoint exposed by each service.

---

## Folder Structure

services/
  ingestion-service/
    src/
      index.js
      publisher.js
      eventSchema.js
      redisClient.js
      logger.js
    package.json
  alert-engine/
    src/
      index.js
      subscriber.js
      ruleEngine.js
      strategyModel.js
      redisClient.js
      logger.js
    package.json
  api-server/
    src/
      index.js
      routes/
        strategies.js
        backtest.js
        metrics.js
      models/
        Alert.js
        BacktestResult.js
      middleware/
        rateLimiter.js
      logger.js
    package.json

shared/
  eventSchemas.js
  indicators.js
  utils.js

---

## Next Steps
- Implement event schema and publisher for ingestion-service.
- Commit architecture and folder structure.
