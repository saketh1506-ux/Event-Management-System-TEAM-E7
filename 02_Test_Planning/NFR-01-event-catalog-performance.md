
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
| Unfiltered catalog (5,000 events) | Previously recorded final | 484.97 ms | 555.90 ms | 623.66 ms | 640.90 ms | Met |
| Substring search (111 events) | Baseline | 73.50 ms | 80.74 ms | 93.15 ms | 93.84 ms | Met |
| Substring search (111 events) | Previously recorded final | 32.00 ms | 34.04 ms | 46.08 ms | 46.96 ms | Met |
| Unfiltered catalog (5,000 events) | Audit rerun (12 Nov 2026) | 542.23 ms | 611.88 ms | 647.07 ms | 668.09 ms | Met |
| Substring search (111 events) | Audit rerun (12 Nov 2026) | 34.93 ms | 37.88 ms | 43.02 ms | 45.51 ms | Met |

Both audit-rerun p95 measurements are below the 3-second target for the stated workload. The rerun is a separate local measurement, not a statistically controlled comparison with the earlier run.

## Query-plan verification

The benchmark prints `EXPLAIN QUERY PLAN` output for the catalog query, including the correlated registration count:

- Unfiltered listing and exact-date filtering use `idx_events_date_time`.
- Category filtering uses `idx_events_category_date_time`, which also provides date/time ordering.
- Search uses the trigram FTS5 index on title, description, and location. The registration count uses the existing covering `idx_registrations_event_status` index.
- Search still sorts its matching rows by date and time; the category and unfiltered/date plans do not require a temporary sort.

Ordinary B-tree indexes do not accelerate the existing contains-search pattern (`LIKE '%term%'`). The FTS5 trigram index applies the same `LIKE` behavior and is synchronized by event insert/update/delete triggers; existing event rows are indexed on first initialization. Patterns without a run of three literal characters retain the original direct-`LIKE` query path.

### `created_at` schema and query behavior

`server/db.js` declares `events.created_at` as `DATETIME DEFAULT CURRENT_TIMESTAMP`. Event creation in `server/models/eventModel.js` omits this field from its `INSERT`, so SQLite supplies the insertion timestamp (UTC text in `YYYY-MM-DD HH:MM:SS` form). The event catalog model selects `e.created_at` directly; it does not calculate the value or use it for catalog filtering or ordering. Detail and organizer queries that select `e.*` also return the stored field. The admin event list separately orders by `e.created_at DESC`.

The API test `FR-02: Event listing preserves search, category, date, status, organizer, and capacity fields` verifies that the catalog response contains a nonempty `created_at`. `CREATE TABLE IF NOT EXISTS` initializes this column for new databases; it is not itself a migration that adds the column to an older pre-existing database schema.

The event catalog listing also preserves description, organizer email, confirmed-registration counting, existing filters, and date/time ordering. The benchmark changes query execution and indexes without intentionally removing response fields.
