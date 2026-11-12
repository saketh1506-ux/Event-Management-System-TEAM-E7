# NFR-02 Registration Processing Latency

## Problem

Registration processing must complete in under 2 seconds while preserving duplicate prevention, capacity safety, cancellation and concurrent registration behavior.

## Test Conditions

- API: local Express server on an available `127.0.0.1` port
- Database: isolated temporary SQLite database
- Successful registrations: 60
- Concurrent worker level: 10
- Setup excluded from measured registration requests
- Event capacity: 80
- Node.js HTTP benchmark script: `server/tests/registration-performance.js`
- Run command: `npm run benchmark:registration`

## Reproduction

Use Node.js 18 or newer, because the benchmark uses the built-in Fetch API. Install the locked server dependencies before running it:

```powershell
cd server
npm ci
```

The benchmark creates an isolated temporary directory below the operating system temporary directory and places `benchmark.sqlite` inside it. It chooses an available loopback port, starts `server/server.js` as a child process with production mode, sets `EMS_DATABASE_PATH` to the temporary database and points the benchmark at the child server.

Run the benchmark from the `server` directory:

```powershell
npm run benchmark:registration
```

The benchmark defaults to 60 registration requests at concurrency 10. These settings can be reproduced explicitly:

```powershell
$env:EMS_BENCHMARK_REQUESTS="60"
$env:EMS_BENCHMARK_CONCURRENT="10"
npm run benchmark:registration
Remove-Item Env:EMS_BENCHMARK_REQUESTS, Env:EMS_BENCHMARK_CONCURRENT
```

The benchmark server is stopped when the run finishes and a `finally` cleanup removes the temporary directory, including SQLite `benchmark.sqlite`, `benchmark.sqlite-wal`, `benchmark.sqlite-shm` and any other files created below that directory. Cleanup also runs after benchmark failures. The normal `server/database.sqlite` is not used because `EMS_DATABASE_PATH` is overridden with the temporary database path, and the script refuses the normal database path.

`successful_registration` reports timings for authenticated POST requests that create registrations. `duplicate_registration` reports requests expected to receive HTTP 409 for existing registrations. `average_ms` is the arithmetic mean, `median_ms` is the conventional even-sample or odd-sample median, `p95_ms` is the nearest-rank 95th percentile, and `max_ms` is the slowest request. `throughput_requests_per_second` is calculated from successful registrations divided by the measured registration batch duration.

## Baseline

The baseline was measured before the Issue #22 database change.

| Metric | Successful registrations |
|---|---:|
| Average | 20.08 ms |
| Median | 19.48 ms |
| p95 | 26.68 ms |
| Maximum | 31.15 ms |
| Throughput | 456.82 requests/second |

The duplicate-registration condition measured 15.23 ms average, 18.39 ms p95 and 18.99 ms maximum.

## Investigation and Bottleneck

The registration API already uses a synchronous, atomic SQLite `BEGIN IMMEDIATE` transaction and a unique `(event_id, user_id)` constraint. This preserves duplicate prevention and capacity safety under concurrency.

The registration count query filters registrations by both `event_id` and `status`. The existing unique registration index starts with `event_id` but also returns rows for every status for that event. Without a status-aware index, capacity checks become increasingly less efficient as cancelled registrations accumulate. No evidence indicated transaction misuse, synchronous application processing, or repeated write operations that warranted a route rewrite.

## Optimization

Added an index on `(event_id, status)` to support confirmed-registration counts and other event/status queries:

- `idx_registrations_event_status`

The registration route and transaction boundaries were not rewritten because the baseline target was already satisfied and the existing atomic implementation was correct.

## Historical Before/After Comparison

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Average | 20.08 ms | 18.85 ms | -1.23 ms |
| Median | 19.48 ms | 18.22 ms | -1.26 ms |
| p95 | 26.68 ms | 25.42 ms | -1.26 ms |
| Maximum | 31.15 ms | 29.41 ms | -1.74 ms |
| Throughput | 456.82 req/s | 493.09 req/s | +36.27 req/s |

The optimized duplicate-registration condition measured 13.69 ms average, 16.10 ms p95 and 16.59 ms maximum.

The under-2-second target was achieved in both baseline and optimized measurements. The optimized maximum response time remained 29.41 ms for successful registrations.

## Audit rerun (12 November 2026)

Environment: Windows 11 build 26200, Node.js 22.23.4, 60 distinct attendees, capacity 80, concurrency 10, isolated temporary SQLite database.

| Metric | Successful registrations | Duplicate registrations |
|---|---:|---:|
| Average | 15.77 ms | 14.88 ms |
| Median | 15.49 ms | 14.03 ms |
| p95 | 19.23 ms | 22.63 ms |
| Maximum | 22.91 ms | 23.37 ms |

Successful-registration throughput was 579.85 requests/second. Both measured p95 values met the under-2-second target. This concurrent run is not directly comparable to the prior recorded measurements.

The first audit attempt exposed that the benchmark launched its production-mode server without `JWT_SECRET`, causing startup to fail. The benchmark now supplies an isolated benchmark-only secret; the rerun completed and emitted the measurements above.

## Test Results

- Historical baseline API suite: 45 passed, 0 failed
- Current project audit API suite: 72 passed, 0 failed
- Current API suite duration: 13.51 seconds
- Existing concurrent capacity test passed.
- Existing duplicate registration, cancellation, full-event and re-registration coverage passed.
- Existing FR-06, FR-09, FR-10, SEC-04 and SEC-05 tests passed with the complete suite.

## Remaining Limitations

- The benchmark measures local loopback HTTP latency and SQLite on the current host; it does not represent production network or deployment latency.
- Throughput is limited to the benchmark's fixed concurrency of 10 and the availability of better-sqlite3 synchronous transactions.
