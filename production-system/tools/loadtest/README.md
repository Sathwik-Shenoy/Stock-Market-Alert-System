## Load Test (autocannon)

Prereqs:
- `docker compose up -d` from `production-system/`
- Start services on ports 4010/4020/4030

Install:
- `cd production-system/tools/loadtest && npm i`

Run:
- `API_BASE=http://127.0.0.1:4030 USER_ID=000000000000000000000001 node run.js`

Notes:
- This measures API response time only.
- Ingestion throughput + end-to-end alert latency are read from `/metrics` on each service.

