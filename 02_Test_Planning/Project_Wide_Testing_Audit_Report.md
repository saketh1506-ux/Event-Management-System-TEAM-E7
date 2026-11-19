# Project-Wide Testing Audit

## Summary

Audit completed on 12 November 2026. The baseline backend suite was independently rerun before changes: **68/68 passed**. After adding regression cases and Playwright coverage, the final test run comprised **94 test executions: 72 backend and 22 browser tests; all 94 passed**.

| Result | Count |
|---|---:|
| Executed test cases | 94 |
| Passed | 94 |
| Failed | 0 |
| Blocked | 0 |
| Not run (within the 94-case suite) | 0 |

The final test counts do not include benchmark scenarios, dependency audits, or the explicitly unrun follow-up activities listed below.

## Scope and environment

Inspected the frontend markup, application logic and styles; server entry point, routes, controllers, services, models, middleware and SQLite schema; existing API tests and benchmarks; package scripts/dependencies; CI workflow; and the requested test-planning documents.

| Item | Environment |
|---|---|
| OS | Microsoft Windows 11 Home Single Language, version 10.0.26200, build 26200 |
| Node.js | 22.23.4 |
| npm | 10.9.9 |
| Playwright | `@playwright/test` 1.65.0 |
| Chromium | Chrome for Testing 158.0.8127.18 |
| Firefox | 159.0 |
| Backend test database | Isolated temporary SQLite file |
| Browser test database | Isolated temporary SQLite file, removed after the run |
| Responsive viewports | 375x812, 768x1024, 1440x1000 |

Playwright ran one worker with no retries. The HTTP concurrency tests assert database invariants across concurrent requests without timing sleeps.

## Commands and results

Run commands from `server` unless noted otherwise.

| Command | Expected result | Actual result | Status |
|---|---|---|---|
| `npm test` (before changes) | Existing suite passes | 68 passed, 0 failed; 16.35 s | PASS |
| `npm test` (final) | All backend tests pass | 72 passed, 0 failed; 13.63 s | PASS |
| `npm run test:e2e` (final) | Chromium and Firefox workflows pass | 22 passed, 0 failed; 52.9 s | PASS |
| `npm run benchmark:registration` (final) | p95 below 2,000 ms | Successful p95 19.23 ms; duplicate p95 22.63 ms | PASS |
| `npm run benchmark:event-catalog` (final) | Catalog p95 below 3,000 ms | Unfiltered p95 647.07 ms; substring-search p95 43.02 ms | PASS |
| PowerShell `node --check` over `client` and `server`, excluding `node_modules` | All project JavaScript parses | 27 JavaScript files checked | PASS |
| `npm audit --omit=dev` | No production dependency advisories | 0 vulnerabilities | PASS |
| `npm audit` | Report all dependency advisories | 2 moderate advisories remain in development-only `nodemon` -> `minimatch` | FINDING |
| `npx playwright install chromium firefox` | Install browser engines | Chromium and Firefox installed successfully | PASS |

There is no production build, lint, or standalone unit-test script in the package manifest. The test scripts use the repository's existing Node test runner plus the newly added Playwright suite. A first `npm test` invocation from the repository root returned `ENOENT` because the only package manifest is under `server`; rerunning from `server` passed.

## Backend test coverage

The final `npm test` execution contains the existing 68 API cases plus four regression tests added during this audit.

| Test case IDs / areas | Objective and expected result | Actual result |
|---|---|---|
| TC-01, FR-01, SEC-01 | Registration/login, invalid and missing credentials, duplicate accounts, bcrypt storage and 72-byte UTF-8 boundaries | Account and password cases passed; 72-byte password works, longer ASCII/multibyte inputs are rejected |
| SEC-02, SEC-04, SEC-05 | Require authentication, reject invalid/expired/revoked sessions, enforce role/admin restrictions | Protected endpoints rejected unauthorized requests; role and session tests passed |
| SEC-04-07 (new) | Apply role changes and suspension to tokens already issued | Promotion/demotion took effect for the same token; suspended token received 401 |
| SEC-04-08 (new) | Fail closed if revocation storage cannot be read | Valid-token request received generic HTTP 500 rather than bypassing revocation lookup |
| TC-03, FR-02, FR-03 | Search, filtering, event details and catalog response fields | Search/filter/details passed; `created_at` was present in the event listing |
| TC-08, FR-07, FR-08 | Create, edit, cancel/delete events; validate fields, calendar dates, capacities and ownership | Expected statuses and ownership checks passed; impossible dates were rejected for creation and update without mutating the existing event |
| TC-04 through TC-07, NFR-06 | Registration, duplicate prevention, full capacity, cancellation, re-registration and concurrent operations | Capacity, row uniqueness and registration counts remained consistent; rollback test left no registration |
| FR-09 | Publish updates and limit update access to owners and registered attendees | Valid updates and access restrictions passed |
| FR-10, FR-11 | Registration reports, ownership, CSV output and admin moderation | Ownership, counts, formula escaping and missing-resource cases passed |
| SEC-03-11 (new) | Return a correct client error for an over-limit JSON body | HTTP 413 with `{ "error": "Request body too large." }` |
| Existing malformed-input/security tests | Reject malformed JSON, unexpected JSON types, malformed IDs and hostile input | Existing validation and sanitization assertions passed |

## Playwright workflow and responsive results

All rows below passed independently in Chromium 158.0.8127.18 and Firefox 159.0.

| Test ID | Objective / expected result | Chromium | Firefox |
|---|---|---|---|
| E2E-01 | Browse and filter events, search to an empty state, open details | PASS | PASS |
| E2E-02 | Register an account, sign in again, sign out | PASS | PASS |
| E2E-03 | Register for an event, view it in attendee dashboard, cancel it | PASS | PASS |
| E2E-04 | Organizer creates, edits and cancels an event | PASS | PASS |
| E2E-05 | Admin dashboard loads and a role change succeeds with an accessible control name | PASS | PASS |
| E2E-06 | Modal accessible name/labels, Tab and Shift+Tab trap, Escape close, focus restoration | PASS | PASS |
| E2E-07 | API failure message and expired-session sign-out behavior | PASS | PASS |
| E2E-08 | Attendee dashboard loading state remains visible until its API request completes | PASS | PASS |
| RESP-375 | No horizontal overflow; mobile navigation, event card and dialog fit at 375px | PASS | PASS |
| RESP-768 | No horizontal overflow; tablet navigation, event card and dialog fit at 768px | PASS | PASS |
| RESP-1440 | No horizontal overflow; desktop navigation, event card and dialog fit at 1440px | PASS | PASS |

The workflow tests also check form labels, modal roles/names, button names, and live status/alert semantics. This is a focused browser accessibility check, not a complete WCAG conformance audit.

### Screenshot evidence

Event catalog and viewport screenshots:

- [Chromium mobile, 375px](evidence/catalog-chromium-375.png)
- [Chromium tablet, 768px](evidence/catalog-chromium-768.png)
- [Chromium desktop, 1440px](evidence/catalog-chromium-1440.png)
- [Firefox mobile, 375px](evidence/catalog-firefox-375.png)
- [Firefox tablet, 768px](evidence/catalog-firefox-768.png)
- [Firefox desktop, 1440px](evidence/catalog-firefox-1440.png)

Dashboard screenshots:

- [Chromium organizer dashboard](evidence/organizer-dashboard-chromium.png)
- [Firefox organizer dashboard](evidence/organizer-dashboard-firefox.png)
- [Chromium admin dashboard](evidence/admin-dashboard-chromium.png)
- [Firefox admin dashboard](evidence/admin-dashboard-firefox.png)

No application failure remained in the final run, so there is no final failure trace. An initial Playwright authoring run had eight assertion/selector failures; selectors were corrected, and the final two-engine run passed all 22 cases.

## Performance results

Both benchmarks use temporary SQLite databases, localhost HTTP and synthetic data; they are not production traffic measurements.

### Registration benchmark

Workload: 60 distinct attendees, event capacity 80, concurrency 10.

| Scenario | Average | Median | p95 | Maximum | Throughput |
|---|---:|---:|---:|---:|---:|
| Successful registration (60 requests) | 15.77 ms | 15.49 ms | 19.23 ms | 22.91 ms | 579.85 req/s |
| Duplicate registration (60 requests) | 14.88 ms | 14.03 ms | 22.63 ms | 23.37 ms | — |

Both p95 values met the 2,000 ms target.

### Event catalog benchmark

Workload: 5,000 events, 7,500 registrations, 30 measured requests per scenario at concurrency 10.

| Scenario | Results | Average | Median | p95 | Maximum | Target |
|---|---:|---:|---:|---:|---:|---|
| Unfiltered catalog | 5,000 events | 542.23 ms | 611.88 ms | 647.07 ms | 668.09 ms | PASS (<3,000 ms) |
| Substring search (`Event 42`) | 111 events | 34.93 ms | 37.88 ms | 43.02 ms | 45.51 ms | PASS (<3,000 ms) |

Query plans used `idx_events_date_time` for unfiltered/date queries, `idx_events_category_date_time` for category queries, the FTS5 trigram index for search, and the covering `(event_id, status)` registration index for counts. Search uses a temporary B-tree for ordering.

## Security and quality findings

| Finding | Evidence / impact | Change and regression evidence |
|---|---|---|
| Stale JWT role/status claims could outlive admin demotion or suspension | Authorization used the token role for its 24-hour validity period | Middleware now loads current account role/status on authenticated requests and rejects inactive/missing accounts; SEC-04-07 covers promotion, demotion and suspension |
| Revocation database errors were caught and treated as “not revoked” | A failed lookup could bypass a revocation check | Removed the fail-open fallback; Express returns a server error instead of authorizing; SEC-04-08 covers lookup failure |
| Oversized JSON bodies fell through to generic server-error handling | Parser's `entity.too.large` error was not mapped to a client response | Added HTTP 413 response; SEC-03-11 verifies exact status/body |
| Demo login passwords were rendered in the public login modal | Hard-coded test passwords were visible in the served HTML | Removed the credentials from the client page |
| Admin role selectors lacked accessible names; toast messages were not announced | Keyboard/screen-reader semantics were incomplete | Added role-specific `aria-label` and status/alert live-region attributes; E2E-05/E2E-06 cover relevant behavior |
| Production dependency audit | Earlier lockfile contained vulnerable `body-parser`; `npm audit fix` updated it | Production audit now reports 0 vulnerabilities |
| Remaining development dependency advisories | Full `npm audit` reports 2 moderate `minimatch` advisories through `nodemon`; current `nodemon` declares `minimatch ^10.2.1`, while the advisory fix is in major 11 | Not force-overridden because it crosses the declared major dependency range; resolve with a compatible upstream update or explicit Node/runtime compatibility validation |

SQL statements use bound parameters; existing tests exercise injection-style inputs, XSS-related content, ownership checks, revocation, transaction rollback and concurrent capacity constraints. The server config uses wildcard CORS; production deployments should restrict origins to the intended client hosts. JWTs are stored in browser `localStorage`, so avoiding future client-side script injection remains important.

## Production and test changes

Production changes were limited to:

- Check current account role/status for each authenticated request and fail closed on revocation lookup errors.
- Return HTTP 413 for oversized JSON requests.
- Remove displayed demo passwords and improve admin control/toast accessibility.

Test/tooling changes:

- Added four backend regression tests.
- Added Playwright configuration, 11 scenarios per browser, browser install/test scripts, CI steps and ignored test output.
- Added the required benchmark-only JWT secret to the registration benchmark child server; before this, production mode failed startup because `JWT_SECRET` was absent.

No API response contract was changed except returning the appropriate 413 for oversized request bodies. No commits, pushes, branch changes, resets, rebases, or pull requests were performed.

## Limitations and follow-up

| Check | Status | Notes |
|---|---|---|
| Microsoft Edge / physical device checks | NOT RUN | Chromium and Firefox were run at the requested viewports; the prior Edge note is historical only. |
| Remote GitHub Actions run | NOT RUN | Workflow is configured but was not triggered from this local audit. |
| Full WCAG/axe or assistive-technology audit | NOT RUN | Browser tests cover keyboard, focus, labels, names and basic semantics only. |
| Production-network/load and memory profiling | NOT RUN | Existing synthetic local benchmarks were rerun; production-like load and memory were not measured. |
| Database schema migration for pre-existing databases | NOT RUN | `CREATE TABLE IF NOT EXISTS` does not add `events.created_at` to an older table; deployment schema history must be checked before upgrading an older database. |
| Lint/production build | NOT RUN | No lint or build script is configured in the project manifest. |
| Legacy planning-document architecture descriptions | FOLLOW-UP | Some inspected DOCX files describe React and MongoDB/MySQL, but the verified implementation is a vanilla JavaScript frontend with an Express/SQLite backend. These mismatches were not silently treated as implementation evidence; the older DOCX descriptions remain to be reconciled. |

The exact `created_at` schema/query behavior and TC-14 architecture checklist are documented in the NFR-01 and TC-01-to-TC-18 reports.
