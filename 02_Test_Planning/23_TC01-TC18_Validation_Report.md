
# Issue #23: TC-01 to TC-18 Validation Report

## Test environment and execution

**Test environment:** Node.js backend API suite on Windows, using an isolated temporary SQLite database.

**Automated test command:**

```powershell
cd server
node --test tests/api.test.js
```

**Latest execution result (11 November 2026):**

- Total tests: 68
- Passed: 68
- Failed: 0
- Cancelled: 0
- Skipped: 0
- Duration: approximately 18.45 seconds

**Overall automated backend status: PASS**

The backend suite covers authentication, authorization, event management, registration, transaction consistency, input validation, administration, and security boundary conditions.

Browser end-to-end execution, responsive-interface inspection, and performance benchmarking are documented separately. API test results alone do not establish browser compatibility.

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
| TC-10 | Complete event registration within two seconds under the measured conditions. | Separate registration benchmark | Five sequential registrations averaged 3.79 ms; maximum 9.25 ms. | PASS for measured workload |
| TC-11 | Store passwords securely rather than in plaintext. | `SEC-05-01`; `SEC-01-01`; `SEC-01-02` | bcrypt password hashing and salting checks passed. | PASS |
| TC-12 | Maintain usable responsive layouts across devices and browsers. | Responsive implementation and recorded Edge inspections | Edge mobile at 375px and desktop layout inspected; full browser/viewport matrix not established by this report. | PARTIALLY VERIFIED |
| TC-13 | Maintain registration and capacity consistency through repeated operations. | Registration lifecycle and NFR-06 transaction tests | Registration, cancellation, rollback, and concurrency checks passed. | PASS |
| TC-14 | Separate application functionality into maintainable architectural modules. | Architecture review checklist | Project structure identified; formal review findings not yet recorded. | PENDING REVIEW |
| TC-15 | Allow event owners to retrieve participant reports while denying unauthorized access. | `FR-10-01` through `FR-10-08` | Ownership authorization, occupancy calculations, and CSV export checks passed. | PASS |
| TC-16 | Reject malicious input and prevent expired or revoked sessions from accessing protected APIs. | `SEC-03`; `SEC-04`; `SEC-05` | Backend security tests passed; browser-level re-authentication verification not recorded. | PARTIALLY VERIFIED |
| TC-17 | Allow authorized organizers to publish updates for registered attendees. | `FR-09-01` through `FR-09-07` | Update publishing, authorization, and attendee retrieval passed. | PASS |
| TC-18 | Allow administrators to manage users/events while enforcing role restrictions. | `SEC-05-03`; `SEC-05-05`; administration API tests | Role management, access restrictions, and self-demotion protection passed. | PASS |

## Additional backend boundary testing

The latest backend test run includes the following additional cases.

| Test ID | Test description | Result |
|---|---|---|
| SEC-01-03 | Reject passwords exceeding bcrypt's 72-byte limit. | PASS |
| SEC-01-04 | Reject Unicode passwords exceeding 72 UTF-8 bytes. | PASS |
| SEC-01-05 | Accept passwords exactly 72 bytes long. | PASS |
| NFR-06-02 | Prevent duplicate registrations during concurrent re-registration after cancellation. | PASS |
| SEC-05-05 | Prevent an administrator from demoting their own account. | PASS |

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

### Test setup

- Event: `Tech Innovators Summit 2026`
- Event ID: `1`
- Event capacity: `50`
- Database: Fresh temporary SQLite database selected through `DATABASE_PATH`
- Initial confirmed registrations: `0`
- Five independent attendee accounts were created and authenticated.
- Registration requests were sent sequentially.

### Measurement method

1. Create a test event and five attendee accounts.
2. Authenticate each attendee independently.
3. Send `POST /api/events/1/register` with each attendee's bearer token.
4. Measure the HTTP request duration through receipt of the response.
5. Verify HTTP 201 and confirmed registration status.
6. Calculate average and maximum response times.
7. Verify the final confirmed registration count.

### Recorded results

| Attendee | Endpoint | Status | Response time |
|---|---|---|---:|
| 1 | `POST /api/events/1/register` | HTTP 201 | 9.25 ms |
| 2 | `POST /api/events/1/register` | HTTP 201 | 2.51 ms |
| 3 | `POST /api/events/1/register` | HTTP 201 | 3.09 ms |
| 4 | `POST /api/events/1/register` | HTTP 201 | 2.08 ms |
| 5 | `POST /api/events/1/register` | HTTP 201 | 2.04 ms |

**Benchmark summary:**

- Successful requests: 5
- Final confirmed registrations: 5
- Average response time: 3.79 ms
- Maximum response time: 9.25 ms
- Required threshold: Less than 2000 ms
- Result: PASS

All five measured requests completed below the threshold.

This benchmark represents local sequential registration requests. It does not establish concurrent-load performance or production network latency.

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

### Recorded manual verification

The existing validation record documents:

- Microsoft Edge at a 375px mobile viewport: manually inspected.
- Microsoft Edge desktop layout: manually inspected, with exact width unspecified.

Additional frontend automated and cross-browser testing should be referenced through its actual test reports and execution evidence. This report does not assume that all browser/viewport combinations passed without those results.

### Browser verification matrix

| Browser | Desktop | Tablet | Mobile |
|---|---|---|---|
| Chrome | Evidence to be reconciled | Evidence to be reconciled | Evidence to be reconciled |
| Microsoft Edge | Previously inspected | Not established here | 375px previously inspected |
| Firefox | Evidence to be reconciled | Evidence to be reconciled | Evidence to be reconciled |

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

**TC-12 status: PARTIALLY VERIFIED based on the evidence recorded in this report.**

## TC-14: Architecture review

### Review metadata

- Reviewer: To be recorded
- Review date: To be recorded
- Reviewed commit: To be recorded
- Overall finding: Pending formal review

### Architecture components to review

| Component | Project path | Review status |
|---|---|---|
| Application entry point | `server/server.js` | Pending |
| Database initialization | `server/db.js` | Pending |
| Authentication middleware | `server/middleware/auth.js` | Pending |
| Authentication routes | `server/routes/auth.js` | Pending |
| Event routes | `server/routes/events.js` | Pending |
| User routes | `server/routes/users.js` | Pending |
| Administration routes | `server/routes/admin.js` | Pending |
| Controllers | `server/controllers/` | Pending |
| Services | `server/services/` | Pending |
| Models | `server/models/` | Pending |
| API tests | `server/tests/api.test.js` | Pending |
| Client markup | `client/index.html` | Pending |
| Client application logic | `client/js/app.js` | Pending |
| Client styling | `client/css/style.css` | Pending |
| CI workflow | `.github/workflows/api-tests.yml` | Pending |

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

The passing API tests support behavioural correctness but do not replace a formal architecture review.

**TC-14 status: PENDING REVIEW.**

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

The browser-level session checklist includes:

1. Log in using a valid account.
2. Open a protected workflow.
3. Log out.
4. Attempt to access a protected workflow again.
5. Confirm that protected actions are rejected or re-authentication is required.
6. Confirm that protected information is not incorrectly exposed after session expiry.

The backend security checks passed. Browser-level session-expiration evidence is not established by this report.

**TC-16 status: PARTIALLY VERIFIED.**

## Issue acceptance assessment

### Completed verification

- The complete backend suite passed: 68/68 tests.
- Authentication and password boundary checks passed.
- Registration lifecycle and concurrency checks passed.
- Transaction rollback consistency checks passed.
- Event ownership and authorization checks passed.
- Administrator role restrictions passed.
- Input validation and security boundary checks passed.
- TC-10 registration response-time benchmark met its measured target.

### Remaining documentation or review items

- Reconcile TC-12 with the completed frontend automated and cross-browser testing evidence.
- Complete and record the TC-14 architecture review.
- Record browser-level session-expiration and re-authentication evidence for TC-16 if required for full acceptance.

## Overall recommendation

The Event Management System backend has successfully completed its latest automated verification run with **68 tests passed, 0 failed, and 0 skipped**.

The additional backend boundary tests verify password-length restrictions, concurrent re-registration consistency, and administrator self-demotion protection.

The recorded registration benchmark also meets its stated performance threshold.

The automated backend verification is ready for review. Full acceptance of all 18 test cases should additionally account for the outstanding architecture review and any manual browser evidence not yet incorporated into this report.

**Final backend automated testing status: PASS (68/68).**
