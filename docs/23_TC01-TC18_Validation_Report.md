# Issue #23: TC-01 to TC-18 Validation Report

**Test environment:** Node.js API suite on Windows using an isolated temporary SQLite database.

**Automated suite command:** `cd server && npm test`

**Actual automated result:** 24 passed, 0 failed, 0 skipped.

> Browser end-to-end execution, performance measurement, and responsive-interface evidence are not inferred from API-test results. Chrome, Edge, and Firefox verification remains manual unless a browser test and evidence are added separately.

## TC coverage

| Test case | Expected behaviour | Existing automated test reference | Actual execution result | Manual verification requirement | Final status |
|---|---|---|---|---|---|
| TC-01 | Create an account with valid details and allow login. | `TC-01: Create account with valid details` | Passed: account creation returned 201 and the suite continued to login-protected workflows. | None. | PASS |
| TC-02 | Reject an incorrect password and keep protected content inaccessible. | `TC-02: Reject invalid login`; `SEC-04-01` | Passed: login and missing-token cases returned the expected 401 responses. | None for API acceptance. Browser-level protected-route/navigation check remains optional evidence. | PASS |
| TC-03 | Search with a valid keyword and display matching event details. | `TC-03: Search and view an event` | Passed: search returned an array and the selected event details included capacity. | None. | PASS |
| TC-04 | Create an authenticated registration when capacity is available. | `TC-04, TC-06, TC-07...` | Passed: registration was created, confirmed, and subject to later lifecycle assertions. | None. | PASS |
| TC-05 | Reject registration for a full event without changing capacity. | `TC-05: Reject registration when event is full`; `TC-05A: Concurrent registrations cannot exceed capacity` | Passed: full and concurrent boundary requests were rejected with capacity unchanged/count asserted. | None. | PASS |
| TC-06 | Reject a duplicate registration for the same event. | `TC-04, TC-06, TC-07...` | Passed: the second registration returned 409. | None. | PASS |
| TC-07 | Cancel an existing registration and keep capacity consistent. | `TC-04, TC-06, TC-07...`; `TC-07A: Re-register after cancellation` | Passed: cancellation returned 200 and re-registration returned 201 with confirmed status. | None. | PASS |
| TC-08 | Allow an authorized organizer to create an event with the requested capacity. | `TC-08: Organizer creates event and sets capacity` | Passed: event creation returned 201 with capacity 75 and the requested title. | None. | PASS |
| TC-09 | Deny normal attendees access to admin endpoints. | `TC-09: Block unauthorized admin access`; `SEC-05-04` | Passed: attendee admin access returned 403 and failed authorization left database counts unchanged. | None. | PASS |
| TC-10 | Registration completes within 2 seconds under normal load. | No automated timing assertion exists in the suite. | PASS: five sequential successful registrations against a fresh temporary SQLite database averaged 3.79 ms and had a maximum of 9.25 ms. All five completed below the 2000 ms target. | No browser verification is required; browser testing was not performed. | PASS |
| TC-11 | Passwords must not be stored as readable plaintext. | `SEC-05-01: Seeded user passwords...` | Passed: seeded passwords were bcrypt hashes and compared successfully with their known passwords. | None. | PASS |
| TC-12 | Core screens remain usable and readable at desktop and mobile viewport sizes. | No browser automation or viewport assertion exists. | Not executed. | Inspect Explore Events, login/register, My Registrations, organizer dashboard, and admin console at representative desktop and mobile widths in each selected browser. Record navigation, overflow, text truncation, modal operation, and horizontal scrolling. | NOT VERIFIED |
| TC-13 | Repeated registration and cancellation must keep counts and capacity consistent. | `TC-13: Repeated registration and cancellation keeps counts consistent` | Passed: two register/cancel cycles kept confirmed count, cancelled count, event count, and available spots consistent. | None for API acceptance; browser refresh evidence is optional manual confirmation. | PASS |
| TC-14 | Major functions are separated into maintainable components/modules. | No automated structural-quality assertion is appropriate for this case. | Not mechanically executed. | Review the final structure against the architecture: Express routes, middleware, database layer, static client, and separation of concerns. Record reviewed paths and any finding. | NOT VERIFIED |
| TC-15 | An owner organizer can retrieve the participant report, while unauthorized users are denied. | `TC-15: Organizer registration report is returned to authorized owners only` | Passed: owner received confirmed participant details; another organizer and an attendee received 403. | Optional UI participant-report verification. | PASS |
| TC-16 | Malicious input is safely rejected and expired sessions require re-authentication. | `SEC-04-03: Protected endpoint rejects expired token`; `SEC-05-02: SQL injection login and malformed input...` | API passed: expired JWT and malformed/injection-style requests were rejected; database counts remained unchanged. Browser-level session verification has not been performed. | After expiry or logout, reload or invoke a protected UI workflow and confirm the application redirects or requires re-authentication without displaying protected data. | PARTIALLY VERIFIED â€” API PASS, browser verification pending |
| TC-17 | Authorized organizers can send an update and registered participants can receive it. | `TC-17: Organizer event update is available to registered attendees` | Passed: update creation returned 201; attendee dashboard returned the notification; attendee update creation returned 403. | Optional browser delivery/visibility check. | PASS |
| TC-18 | Authorized administrators can manage users/events and non-administrators are denied. | `TC-18: Administrator manages events while non-administrators are denied`; `SEC-05-03: Administrator can change a temporary user role...` | Passed: administrator removed the event and attendee hard-delete access returned 403; administrator role management and denial were also verified. | Optional browser admin-console action verification. | PASS |

## Manual verification checklist

### TC-10 â€” verified registration response-time benchmark

**Test setup**

- Event: `Tech Innovators Summit 2026`
- Event ID: `1`
- Event capacity: `50`
- Database: fresh temporary SQLite database outside the repository, selected through the `DATABASE_PATH` environment variable
- Initial confirmed registrations: `0`
- Five independent attendee accounts were created and authenticated.
- Registration requests were sent sequentially through the authenticated registration API; this was not a concurrent-load test.

**Measurement method**

1. Created one test event with ID `1` and five distinct attendee accounts in the temporary database.
2. Authenticated each attendee independently and retained its returned bearer token.
3. Sent `POST /api/events/1/register` once for each attendee with its own `Authorization: Bearer <token>` header and an empty JSON request body.
4. Timed the complete HTTP request from invocation through receipt of the response for each successful request.
5. Required HTTP `201`, confirmed registration status, and no duplicate registration for an attendee/event pair.
6. Calculated the average as the sum of the five measurements divided by five and the maximum as the largest individual measurement.
7. Verified the event's final confirmed registration count as `5`.

| Attendee | Endpoint | Status | Response time (ms) |
|---|---|---:|---:|
| 1 | `POST /api/events/1/register` | HTTP 201, confirmed | 9.25 |
| 2 | `POST /api/events/1/register` | HTTP 201, confirmed | 2.51 |
| 3 | `POST /api/events/1/register` | HTTP 201, confirmed | 3.09 |
| 4 | `POST /api/events/1/register` | HTTP 201, confirmed | 2.08 |
| 5 | `POST /api/events/1/register` | HTTP 201, confirmed | 2.04 |

**Calculated results and acceptance decision**

- Successful requests: `5`
- Final confirmed registrations: `5`
- Average response time: `3.79 ms`
- Maximum response time: `9.25 ms`
- Required registration threshold: less than `2000 ms`
- Result: **PASS** â€” every registration completed successfully, all measured times were below the threshold, and the final registration count was verified as 5.

The benchmark did not use concurrent load or browser testing. No event-listing performance claim is made by this benchmark.

### TC-12 â€” responsive and browser compatibility checklist

**Execution record:** Pending. No browser or viewport result is claimed.

| Browser and version | 1440 Ã— 900 desktop | 1024 Ã— 768 tablet | 390 Ã— 844 mobile | Evidence |
|---|---|---|---|---|
| Chrome | Pending | Pending | Pending | Screenshots/video and dated execution record required |
| Microsoft Edge | Pending | Pending | Pending | Screenshots/video and dated execution record required |
| Firefox | Pending | Pending | Pending | Screenshots/video and dated execution record required |

For each browser/viewport, verify:

- Page loads without console errors that block use.
- Login modal and registration modal fit the viewport; fields and buttons remain accessible.
- Event discovery, search, category filtering, and event cards remain readable.
- Event details, My Registrations, organizer dashboard, and admin console have no unintended horizontal page overflow.
- Navigation remains operable and labels do not overlap or become inaccessible.
- Long titles and venue/location text wrap or truncate without hiding controls.
- Registration and cancellation actions remain clickable and feedback is visible.
- Core flows are usable without zooming or scrolling outside the intended page layout.

Record pass/fail per screen and browser/viewport, and attach defect reproduction steps for any failure. Browser compatibility is not verified until each selected browser is actually executed.

### TC-14 â€” architecture review checklist

**Review metadata**

- Reviewer name: ______________
- Review date: ______________
- Reviewed commit: ______________
- Overall finding: ______________

Review the following actual project structure:

- Application/bootstrap: [server/server.js](../server/server.js).
- Database initialization and schema/persistence: [server/db.js](../server/db.js) and `server/database.sqlite`.
- Authentication and authorization: [server/middleware/auth.js](../server/middleware/auth.js) and [server/routes/auth.js](../server/routes/auth.js).
- API feature modules: [server/routes/events.js](../server/routes/events.js), [server/routes/users.js](../server/routes/users.js), and [server/routes/admin.js](../server/routes/admin.js).
- Automated API suite: [server/tests/api.test.js](../server/tests/api.test.js).
- Client entry point and markup: [client/index.html](../client/index.html).
- Client application logic: [client/js/app.js](../client/js/app.js).
- Styling: [client/css/style.css](../client/css/style.css).
- Package and dependency entry points: [server/package.json](../server/package.json) and [server/package-lock.json](../server/package-lock.json).
- CI configuration: [.github/workflows/api-tests.yml](../.github/workflows/api-tests.yml).

For each reviewed item, confirm and record Pass/Fail/Observation:

- HTTP setup, middleware ordering, static-file serving, and API routing are separate and understandable.
- Authentication and role authorization are centralized rather than duplicated inconsistently.
- Event, attendee-registration, user-dashboard, and administration concerns are separated into route modules.
- Database schema and data access initialization are isolated in the database layer.
- Client markup and behavior are separated sufficiently for maintainability.
- Automated tests use the application entry point and isolated database conventions.
- No unexplained cross-layer dependencies or duplicate implementations prevent maintenance.
- The architecture remains consistent with the documented component responsibilities.

**Findings**

| File/path | Checklist result | Finding or evidence |
|---|---|---|
| server/server.js | Pending | |
| server/routes/ | Pending | |
| server/middleware/auth.js | Pending | |
| server/db.js | Pending | |
| server/tests/api.test.js | Pending | |
| client/index.html + client/js/app.js + client/css/style.css | Pending | |
| .github/workflows/api-tests.yml | Pending | |

## Issue acceptance assessment

- All automated API cases with sufficient backend behavior are executed through the temporary SQLite suite.
- TC-10 registration latency is PASS: five isolated sequential registrations averaged 3.79 ms with a maximum of 9.25 ms, below the 2000 ms threshold.
- TC-12 remains pending because no Chrome, Edge, or Firefox viewport executions are recorded.
- TC-14 remains pending because no reviewer, date, commit, or findings are recorded.
- TC-16 is partially verified: API expired-token and malicious-input behavior passed, while browser-level expiration/re-authentication behavior remains pending.
- Defects discovered during any manual execution must be recorded separately with reproduction steps, resolution, and retest evidence.

## Overall recommendation

3. Sent `POST /api/events/1/register` once for each attendee with its own `Authorization: Bearer <token>` header and an empty JSON request body.
