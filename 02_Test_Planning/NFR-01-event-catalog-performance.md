
# NFR-01 Event Catalog Performance

## Benchmark conditions

Run from `server` with `npm run benchmark:event-catalog`. The benchmark creates a temporary SQLite database, starts an isolated production-mode API on loopback, and removes the database and server when finished. Database setup and one warmup request per scenario are excluded from the measured samples.

Default workload:

- 5,000 active events and 7,500 registrations (one confirmed registration per event and a cancelled registration for half the events)
- 30 measured requests per scenario at concurrency 10
- Unfiltered `GET /api/events` returning 5,000 events
- Substring-search `GET /api/events?search=Event%2042` returning 111 events
- Latency includes the loopback HTTP request, response transfer, and JSON parsing
- Target: p95 below 3,000 ms

The measurements below were taken on the same Windows host with Node.js 22.23.4. They are local synthetic-load measurements, not a guarantee of production network latency.

## Baseline and final results

Baseline was captured before changing the event query or adding event indexes. The baseline query plans scanned the events table; the unfiltered and search plans also used temporary B-trees for ordering.

| Scenario | Version | Average | Median | p95 | Maximum | p95 target |
|---|---|---:|---:|---:|---:|---|
| Unfiltered catalog (5,000 events) | Baseline | 722.00 ms | 814.78 ms | 940.55 ms | 954.24 ms | Met |
| Unfiltered catalog (5,000 events) | Final | 484.97 ms | 555.90 ms | 623.66 ms | 640.90 ms | Met |
| Substring search (111 events) | Baseline | 73.50 ms | 80.74 ms | 93.15 ms | 93.84 ms | Met |
| Substring search (111 events) | Final | 32.00 ms | 34.04 ms | 46.08 ms | 46.96 ms | Met |

Both final p95 measurements are below the 3-second target for the stated workload.

## Query-plan verification

The benchmark prints `EXPLAIN QUERY PLAN` output for the catalog query, including the correlated registration count:

- Unfiltered listing and exact-date filtering use `idx_events_date_time`.
- Category filtering uses `idx_events_category_date_time`, which also provides date/time ordering.
- Search uses the trigram FTS5 index on title, description, and location. The registration count uses the existing covering `idx_registrations_event_status` index.
- Search still sorts its matching rows by date and time; the category and unfiltered/date plans do not require a temporary sort.

Ordinary B-tree indexes do not accelerate the existing contains-search pattern (`LIKE '%term%'`). The FTS5 trigram index applies the same `LIKE` behavior and is synchronized by event insert/update/delete triggers; existing event rows are indexed on first initialization. Patterns without a run of three literal characters retain the original direct-`LIKE` query path.

The event catalog listing preserves the response fields required by the client and automated API tests, including `created_at`, description, and organizer email. Confirmed-registration counting, existing filters, date/time ordering, and client/test-required response fields remain intact. The performance improvements use optimized query execution and indexes without intentionally removing these API response fields.
