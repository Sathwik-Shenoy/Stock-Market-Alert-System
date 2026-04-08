# Stock Market Monitoring System (Elite, Durable, Event-Driven)

This repo contains the original MERN app plus a production-grade event-driven backend under `production-system/`.

## Final Data Flow (Exact)

### Streams
- Market ticks: `stream:market.ticks.v1`
  - Producer: `ingestion-service`
  - Consumer group: `alert-engine.v1`
- Alerts: `stream:alerts.v1`
  - Producer: `alert-engine`
  - Consumer group: `ws-gateway.v1` (inside `api-server`)

### Tick Event (stored in `data` field)
Shape (JSON):
```json
{
  "eventId": "sha256(source|symbol|marketTimestamp|sequence)",
  "schemaVersion": "1.0.0",
  "eventType": "market.tick",
  "source": "alpha_vantage|synthetic",
  "symbol": "AAPL",
  "marketTimestamp": "2026-04-08T09:35:00.000Z",
  "ingestTimestamp": "2026-04-08T09:35:01.111Z",
  "sequence": 102034,
  "traceId": "32hex",
  "payload": {
    "price": 192.33,
    "volume": 294334,
    "indicators": {}
  }
}
```

### `stream:market.ticks.v1` record (fields)
- `eventId`, `symbol`, `marketTimestamp`, `sequence`, `traceId`, `data` (full JSON)

### End-to-end path
```text
ingestion-service
  XADD stream:market.ticks.v1 (durable append, bounded MAXLEN)
    -> alert-engine XREADGROUP (at-least-once)
      -> Mongo bulkWrite upsert market_events (idempotent)
      -> per-symbol ordered evaluation (sequence)
      -> Mongo upsert alert_notifications (dedupeKey unique)
      -> XADD stream:alerts.v1 (only when alert upsert inserts)
        -> api-server ws-gateway XREADGROUP
          -> WebSocket push (/ws) + replay-from-Mongo on reconnect
```

## Reliability Model (Implemented)

### Delivery semantics
- Redis Streams + consumer groups provide **at-least-once** delivery.
- Exactly-once end-to-end is not claimed. Instead, the system achieves **exactly-once effects** for persisted state via idempotency.

### Idempotency and dedupe
- `market_events`: unique `eventId` (Mongo), inserted via `$setOnInsert` upsert.
- `alert_notifications`: unique `dedupeKey` where `dedupeKey = alert:<ruleId>:<eventId>` ensures the same tick cannot create multiple alerts for the same strategy.
- WebSocket delivery is best-effort (clients can reconnect + replay from Mongo).

### Crash recovery
- Consumers reclaim stuck messages via `XAUTOCLAIM` from the Pending Entries List (PEL) after a minimum idle time.
- Messages are `XACK`’d only after persistence + evaluation succeeds.

### Backpressure
- `alert-engine` reads in bounded batches (`STREAM_READ_COUNT`) and persists in bulk (`bulkWrite`).
- If consumers fall behind, the stream retains history (bounded by MAXLEN) instead of dropping.

## Strategy Engine

### JSON strategies
- `logic: AND|OR` + list of conditions (indicator/operator/value)

### DSL strategies (compiler)
Mini-language example:
```
RSI < 30 AND price_change < -2
```
Implementation:
- Tokenize -> parse -> AST
- Optimize (flatten associative ops, short-circuit ordering heuristic)
- Evaluate using indicator context computed from rolling closes

## WebSocket Delivery

WebSocket endpoint:
- `ws://<api-server>/ws`

Protocol:
- Client sends `{"type":"auth","userId":"<24hex>","since":"<ISO optional>"}` to authenticate and optionally replay.
- Client sends `{"type":"subscribe","symbols":["AAPL"],"strategies":["<strategyId>"]}` to filter deliveries.

Scaling note:
- Current gateway is production-grade for a single `api-server` instance.
- Multi-gateway requires routing/sharding so the consumer that reads an alert owns the user’s socket (not implemented yet).

## Replay / Reprocess

Tool: `production-system/tools/streams/replay.js`
- Create a new consumer group from an offset (`0-0` for full replay).
- Or reset group cursor (dangerous if PEL not cleared).

## Observability

- Structured JSON logs in all services include `traceId` (HTTP uses `x-trace-id`).
- Prometheus metrics: `/metrics` on all services.
  - API: `api_requests_total`, `api_request_duration_ms`
  - Streams: `stream_consume_failures_total`
  - Alert engine: `alerts_processed_total`, `alerts_emitted_total`, `alert_latency_ms`
  - Ingestion: `ingestion_rate`

