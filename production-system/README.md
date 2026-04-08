# Production Event-Driven Stock Monitoring System

## Services

- ingestion-service
- alert-engine
- api-server

## Durable Streams

- Market ticks stream: `stream:market.ticks.v1`
- Alert fanout stream: `stream:alerts.v1`

### Stream Message Schema

`stream:market.ticks.v1` fields:
- `eventId` (string)
- `symbol` (string)
- `marketTimestamp` (ISO string)
- `sequence` (stringified int)
- `traceId` (string)
- `data` (JSON string, full event payload)

`stream:alerts.v1` fields:
- `userId`, `symbol`, `ruleId`, `traceId`, `data`

## Event Schema (in `data`)

```json
{
  "eventId": "sha256(source|symbol|marketTimestamp|sequence)",
  "schemaVersion": "1.0.0",
  "eventType": "market.tick",
  "source": "alpha_vantage",
  "symbol": "AAPL",
  "marketTimestamp": "2026-04-08T09:35:00.000Z",
  "ingestTimestamp": "2026-04-08T09:35:01.111Z",
  "sequence": 102034,
  "payload": {
    "price": 192.33,
    "volume": 294334,
    "indicators": {
      "rsi": 45.9,
      "macd": 0.12,
      "macdSignal": 0.08,
      "macdHistogram": 0.04,
      "priceChangePct": 0.5
    }
  }
}
```

## Strategy JSON Format

```json
{
  "name": "Oversold + Drop",
  "symbol": "AAPL",
  "logic": "AND",
  "cooldownSec": 90,
  "conditions": [
    { "indicator": "RSI", "operator": "<", "value": 30 },
    { "indicator": "price_change", "operator": "<", "value": -2 }
  ]
}
```

## Text Flow Diagram (Final)

```text
Alpha Vantage (rate-limited)
       |
       v
ingestion-service
  - token bucket
  - retry/backoff
  - fallback to cache
       |
       v
Redis Streams: stream:market.ticks.v1
  - XADD (durable)
  - bounded MAXLEN
       |
       v
alert-engine
  - XREADGROUP consumer group (at-least-once)
  - XAUTOCLAIM recovery on restart
  - Mongo bulkWrite upsert (idempotent)
  - per-symbol ordered evaluation
  - rule eval (RSI/MACD/compound)
  - cooldown + lock
       |
       v
Redis Streams: stream:alerts.v1
  - per-alert durable fanout
       |
       v
api-server WebSocket gateway (/ws)
  - consumes alerts stream (at-least-once)
  - delivers to connected users
  - replay-from-Mongo on reconnect
       |
       v
MongoDB
  - market_events
  - strategies
  - alert_notifications
  - backtest_results
       ^
       |
api-server
  - strategy CRUD
  - historical pagination
  - backtest execution + persistence
  - latest quote cache read-through
```

## Env (per service)

Set these in each service runtime:

- `PORT`
- `MONGO_URI`
- `REDIS_URL`
- `ALPHA_VANTAGE_API_KEY` (ingestion-service)
- `ALPHA_RATE_LIMIT_PER_MIN` (ingestion-service)
- `INGESTION_INTERVAL_MS` (ingestion-service)
- `INGESTION_BATCH_SIZE` (ingestion-service)

## Notes

- Alpha Vantage is not true streaming. Ingestion simulates stream via controlled batching and emits real-time events internally.
- Redis Streams provide durable delivery + consumer groups (at-least-once).

## Replay / Reprocess

Tool: `production-system/tools/streams/replay.js`

- Create a new consumer group starting from an offset:
  - `node production-system/tools/streams/replay.js --stream stream:market.ticks.v1 --group alert-engine.v1 --mode newgroup --startId 0-0`
- Reset an existing group cursor (dangerous if you don’t understand PEL semantics):
  - `node production-system/tools/streams/replay.js --stream stream:market.ticks.v1 --group alert-engine.v1 --mode setid --startId 0-0`

## Load Test Results (Actual)

Environment:
- Local infra: `mongodb-memory-server` + `redis-memory-server` (single-node, not a Redis cluster)
- Services: 1 ingestion, 1 alert-engine, 1 api-server instance

E2E stream test (`GEN_EVENTS=2000`, 5 symbols, `DRAIN_MS=5000`):
- `generated_events`: 10000
- `producer_events_per_sec`: 91743.12
- `alerts_emitted_per_sec`: 391.31
- `avg_alert_latency_ms (approx)`: 580.56

API test (autocannon, mixed latest-quote + alerts list):
- 200 connections, 10s:
  - `reqs_avg`: 10484.4
  - `latency_p99_ms`: 57
  - `errors`: 0, `timeouts`: 0
- 1500 connections, 10s:
  - `reqs_avg`: 14048.9
  - `latency_p99_ms`: 72
  - `errors`: 895, `timeouts`: 12

Bottleneck analysis:
- First to break under high tick rates is `alert-engine` (Mongo write throughput + per-event strategy eval).
- First to break under high API concurrency is `api-server` (single Node event loop + connection pressure); errors/timeouts begin around ~1500 concurrent connections in this local run.
