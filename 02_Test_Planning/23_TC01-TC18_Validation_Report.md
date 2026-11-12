
# Issue #23: TC-01 to TC-18 Validation Report

## Test environment and execution

**Test environment:** Windows 11 (build 26200), Node.js 22.23.4, isolated temporary SQLite database.

**Automated test commands:**

```powershell
cd server
npm test
npm run test:e2e
```

**Latest execution result (12 November 2026):**

- Backend tests: 72
- Playwright browser tests: 22
- Total tests: 94
- Passed: 94
- Failed: 0
- Cancelled: 0
- Skipped: 0
- Backend duration: 13.51 seconds
- Playwright duration: 53.7 seconds

**Overall automated test status: PASS**

The backend suite covers authentication, authorization, event management, registration, transaction consistency, input validation, administration, and security boundaries. Playwright exercises application workflows in Chromium and Firefox, including responsive viewports and keyboard-accessibility behavior.

Performance and dependency-audit measurements are recorded in the project-wide audit report and the NFR benchmark reports.

## TC-01 to TC-18 coverage

| Test case | Expected behaviour | Automated test reference or evidence | Execution result | Final status |
|---|---|---|---|---|
| TC-01 | Create an account with valid details and allow login. | `TC-01: Create account with valid details` | Account creation and authentication workflow passed. | PASS |
| TC-02 | Reject an incorrect password and prevent unauthorized access. | `TC-02: Reject invalid login`; `SEC-04-01` | Invalid credentials and missing-token requests were rejected. | PASS |
| TC-03 | Search for events and retrieve matching event details. | `TC-03: Search and view an event` | Search and event-detail retrieval passed. | PASS |
| TC-04 | Register an authenticated attendee when capacity is available. | `TC-04, TC-06, TC-07` | Registration creation and confirmation passed. | PASS |
| TC-05 | Reject registration when an event is full. | `TC-05`; `TC-05A` | Full-capacity and concurrent-registration protection passed. | PASS |
| TC-06 | Prevent duplicate registrations for the same event. | `TC-04, TC-06, TC-07`; `NFR-06-02` | Duplicate registration rejected; concurrent re-registration consistency verified. | PASS |
| TC-07 | Cancel a registration and maintain consistent capacity. | `TC-04, TC-06, TC-07`; `TC-07A` | Cancellation and subsequent re-registration passed. | PASS |
| TC-08 | Allow authorized organizers to create events with defined capacities. | `TC-08: Organizer creates event and sets capacity` | Authorized event creation passed. | PASS |
| TC-09 | Prevent normal attendees from accessing administrator endpoints. | `TC-09`; `SEC-05-04` | Unauthorized administration requests were rejected without unintended database changes. | PASS |
| TC-10 | Complete event registration within two seconds under the measured conditions. | `npm run benchmark:registration` | 60 concurrent registrations: p95 19.23 ms, maximum 22.91 ms; duplicate p95 22.63 ms. | PASS for measured workload |
| TC-11 | Store passwords securely rather than in plaintext. | `SEC-05-01`; `SEC-01-01`; `SEC-01-02` | bcrypt password hashing and salting checks passed. | PASS |
| TC-12 | Maintain usable responsive layouts across devices and browsers. | Playwright `RESP-375`, `RESP-768`, `RESP-1440` in Chromium and Firefox | Responsive interactions and overflow checks passed at 375px, 768px, and 1440px in both engines; screenshots recorded. | PASS for tested matrix |
| TC-13 | Maintain registration and capacity consistency through repeated operations. | Registration lifecycle and NFR-06 transaction tests | Registration, cancellation, rollback, and concurrency checks passed. | PASS |
| TC-14 | Separate application functionality into maintainable architectural modules. | Architecture review below; source inspection and 72 backend/22 browser tests | Layer boundaries and test database isolation verified; frontend remains a single App class with inline event handlers. | PASS with maintainability note |
| TC-15 | Allow event owners to retrieve participant reports while denying unauthorized access. | `FR-10-01` through `FR-10-08` | Ownership authorization, occupancy calculations, and CSV export checks passed. | PASS |
| TC-16 | Reject malicious input and prevent expired or revoked sessions from accessing protected APIs. | `SEC-03`; `SEC-04`; `SEC-05`; Playwright `E2E-07` | Invalid, expired, revoked, suspended-account and database-failure sessions were checked; browser expiry handling passed in both engines. | PASS for tested cases |
| TC-17 | Allow authorized organizers to publish updates for registered attendees. | `FR-09-01` through `FR-09-07` | Update publishing, authorization, and attendee retrieval passed. | PASS |
| TC-18 | Allow administrators to manage users/events while enforcing role restrictions. | `SEC-05-03`; `SEC-05-05`; administration API tests | Role management, access restrictions, and self-demotion protection passed. | PASS |

## Additional backend boundary testing

The latest backend test run includes the following additional cases.

| Test ID | Test description | Result |
|---|---|---|
| SEC-01-03 | Reject passwords exceeding bcrypt's 72-byte limit. | PASS |
| SEC-01-04 | Reject Unicode passwords exceeding 72 UTF-8 bytes. | PASS |
| SEC-01-05 | Accept passwords exactly 72 bytes long. | PASS |
| SEC-01-06 | Reject missing credentials and passwords exceeding 72 UTF-8 bytes. | PASS |
| NFR-06-02 | Prevent duplicate registrations during concurrent re-registration after cancellation. | PASS |
| SEC-05-05 | Prevent an administrator from demoting their own account. | PASS |
| SEC-04-07 | Apply role and suspension changes to existing tokens. | PASS |
| SEC-04-08 | Fail closed when the token-revocation database is unavailable. | PASS |
| SEC-03-11 | Return HTTP 413 for a request body over the JSON parser limit. | PASS |

### Password boundary verification

Registration and login validation enforce the 72-byte password boundary using UTF-8 byte length.

The tests confirm that:

- A password exceeding 72 bytes is rejected.
- A Unicode password exceeding 72 UTF-8 bytes is rejected.
- A password exactly 72 bytes long is accepted and can be used to log in.

### Concurrent re-registration verification

The NFR-06-02 test verifies that two simultaneous re-registration requests after cancellation do not create duplicate confirmed registrations.

The test confirms:

- One request succeeds.
- The competing request is rejected.
- Exactly one confirmed registration remains.
- Available capacity remains consistent.

### Administrator self-demotion protection

The SEC-05-05 test verifies that an administrator cannot change their own role to `user` or `organizer`.

The test confirms:

- Both self-demotion requests are rejected.
- The administrator retains the `admin` role.
- The administrator retains access to the protected administration overview.

## TC-10: Registration response-time benchmark

### Recorded results

The latest `npm run benchmark:registration` run used an isolated temporary database, 60 distinct attendees, capacity 80, and concurrency 10.

| Scenario | Requests | Average | Median | p95 | Maximum | Throughput |
|---|---:|---:|---:|---:|---:|---:|
| Successful registration | 60 | 15.77 ms | 15.49 ms | 19.23 ms | 22.91 ms | 579.85 req/s |
| Duplicate registration | 60 | 14.88 ms | 14.03 ms | 22.63 ms | 23.37 ms | — |

Both scenarios were below the 2,000 ms response-time target. Measurements are local loopback results and do not establish production network latency.

## TC-12: Responsive design and browser compatibility

### Implementation evidence

The project documentation records the following responsive and accessibility features:

- Collapsible mobile navigation.
- Responsive event-card grids.
- Media queries at 1024px, 768px, and 480px.
- Single-column form layouts on smaller screens.
- Mobile-friendly touch targets.
- Form labels and accessible icon-button descriptions.
- Modal dialog accessibility attributes.
- Keyboard navigation, focus handling, and Escape-key closing.
- Visible keyboard-focus indicators.

### Browser verification matrix

| Browser | Desktop (1440px) | Tablet (768px) | Mobile (375px) |
|---|---|---|---|
| Chromium / Chrome for Testing 158.0.8127.18 | PASS | PASS | PASS |
| Firefox 159.0 | PASS | PASS | PASS |
| Microsoft Edge | Not run | Not run | Historical manual inspection only |

### Responsive inspection checklist

For each selected browser and viewport, verify:

- Pages load without blocking errors.
- Login and registration forms remain accessible.
- Event search and filters remain usable.
- Event cards and descriptions remain readable.
- Navigation controls remain accessible.
- No unintended horizontal overflow occurs.
- Registration and cancellation controls remain usable.
- Organizer and administrator interfaces remain accessible.
- Modal dialogs fit the viewport.
- Keyboard interaction works as expected.

Screenshots are stored under [`evidence/`](evidence/): `catalog-{chromium,firefox}-{375,768,1440}.png`, `organizer-dashboard-{chromium,firefox}.png`, and `admin-dashboard-{chromium,firefox}.png`.

**TC-12 status: PASS for the tested Chromium/Firefox viewport matrix. Edge was not run in this audit.**

## TC-14: Architecture review

### Review metadata

- Reviewer: Repository source and test evidence review
- Review date: 12 November 2026
- Scope: Current worktree; no commit was created for this review.
- Overall finding: Layered backend responsibilities are evident and covered by tests. Frontend responsibilities are separated by file, but UI logic is concentrated in one `App` class and uses inline event handlers.

### Architecture components to review

| Component | Project path | Review status |
|---|---|---|
| Application entry point | `server/server.js` | PASS: middleware, routing, static hosting, and error handling are composed here. |
| Database initialization | `server/db.js` | PASS: SQLite schema, constraints, indexes, FTS triggers, and opt-in seed data are initialized separately. |
| Authentication middleware | `server/middleware/auth.js` | PASS after fix: tokens are checked against revocation and current active account state. |
| Authentication routes | `server/routes/auth.js` | PASS: routes delegate to controller and validation middleware. |
| Event routes | `server/routes/events.js` | PASS: route-level authentication, role gates, ID validation, and payload validation are explicit. |
| User routes | `server/routes/users.js` | PASS: protected endpoints are routed through authentication. |
| Administration routes | `server/routes/admin.js` | PASS: authentication and administrator authorization are applied to the router. |
| Controllers | `server/controllers/` | PASS: HTTP responses delegate domain behavior to services. |
| Services | `server/services/` | PASS: event, account, and admin rules are separate from SQL access. |
| Models | `server/models/` | PASS: database reads and writes are encapsulated in model modules. |
| API tests | `server/tests/api.test.js` | PASS: temporary SQLite database, transactional capacity checks, lifecycle and rollback tests. |
| Client markup | `client/index.html` | PASS: page structure and dialogs are separate from stylesheet and application code. |
| Client application logic | `client/js/app.js` | PARTIAL: responsibilities are grouped in one `App` class; inline handlers couple markup to the global `app` instance. |
| Client styling | `client/css/style.css` | PASS: responsive layouts and focus styles are in a separate stylesheet. |
| CI workflow | `.github/workflows/api-tests.yml` | PASS: API tests and Chromium/Firefox Playwright tests are configured; remote CI execution was not performed in this audit. |

### Architecture review checklist

Verify that:

1. HTTP routing and middleware responsibilities are separated.
2. Authentication and authorization checks are consistently enforced.
3. Controllers handle request and response responsibilities.
4. Services implement business rules.
5. Models encapsulate database operations.
6. Database initialization is separated from business logic.
7. Frontend markup, application logic, and styling are appropriately organized.
8. Tests use isolated database configurations.
9. No unnecessary duplicate implementations or cross-layer dependencies remain.
10. The implemented architecture matches documented responsibilities.

The checklist was verified by reading the actual route/controller/service/model/client files and by running the isolated backend and browser suites. No module rewrite was warranted.

**TC-14 status: PASS with the frontend maintainability note above.**

## TC-16: Security and session verification

### Backend security evidence

The automated suite verifies:

- Missing authentication tokens are rejected.
- Invalid or tampered tokens are rejected.
- Expired tokens are rejected.
- Logged-out tokens cannot perform protected mutations.
- Unauthorized users cannot access protected administration endpoints.
- SQL-injection-style input is rejected.
- Malformed JSON and invalid request bodies are rejected.
- Oversized inputs are rejected.
- XSS-related input is sanitized.
- Failed authorization and validation requests preserve database consistency.

### Browser-level verification

Playwright `E2E-02` verified login/logout and `E2E-07` verified that a locally stored invalid/expired token is cleared and the user is returned to the signed-out state in Chromium and Firefox. Backend `SEC-04-07` verifies that current role/suspension state is enforced for existing tokens; `SEC-04-08` verifies the revocation lookup fails closed.

**TC-16 status: PASS for tested API and browser cases.**

## Issue acceptance assessment

### Completed verification

- The complete backend suite passed: 72/72 tests.
- The Playwright suite passed: 22/22 tests across Chromium and Firefox.
- The 375px, 768px, and 1440px responsive matrix passed in both browsers.
- Authentication and password boundary checks passed.
- Registration lifecycle and concurrency checks passed.
- Transaction rollback consistency checks passed.
- Event ownership and authorization checks passed.
- Administrator role restrictions passed.
- Input validation and security boundary checks passed.
- TC-10 registration response-time benchmark met its measured target.

### Remaining documentation or review items

- Microsoft Edge was not executed in this audit; its prior manual note is historical and not part of the current browser pass.
- GitHub Actions was updated to run Playwright, but the remote workflow was not triggered here.
- Two moderate npm audit advisories remain in the development-only `nodemon` dependency chain; production dependencies audit cleanly.

## Overall recommendation

The Event Management System completed **94 automated checks: 72 backend tests and 22 Chromium/Firefox UI tests, all passing**.

The additional backend boundary tests verify password-length restrictions, concurrent re-registration consistency, and administrator self-demotion protection.

The recorded registration benchmark also meets its stated performance threshold.

The measured registration benchmark met its under-two-second target. TC-12, TC-14, and TC-16 now have automated or source-review evidence for the stated scope; Microsoft Edge and remote CI execution remain unverified.

**Final automated testing status: PASS (94/94).**
