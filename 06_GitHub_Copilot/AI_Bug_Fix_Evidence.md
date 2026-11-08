# AI-Assisted Bug-Fix Evidence: Invalid Event Calendar Dates

## Original bug

Event creation and updates accepted impossible dates such as `2026-02-31`. The date strings matched the required `YYYY-MM-DD` shape, but that alone did not establish that the date exists on the calendar.

## AI-assisted investigation

The investigation traced event create and update requests to their schemas in `server/middleware/validate.js`. Both schemas used `Date.parse()` after checking the date format. A direct runtime check confirmed that JavaScript returns a timestamp for `Date.parse('2026-02-31')` rather than rejecting the impossible date. Invoking both schemas with that date confirmed they accepted it before the fix.

## Fix

`server/middleware/validate.js` now checks the date format, constructs a UTC date from its year/month/day components, and confirms that the resulting components exactly match the input. Event creation and updates both use this strict calendar-date check. Existing error text and the `YYYY-MM-DD` format requirement are retained.

## Regression tests added

`server/tests/api.test.js` now has an API regression test that checks creation and update behavior:

- Rejects `2026-02-31`, `2026-04-31`, and `2025-02-29`.
- Accepts `2024-02-29` and `2026-11-05`.
- Captures the existing event before each invalid update and checks that its database record is unchanged afterward.

## Checks completed

- `node --check server/middleware/validate.js` — passed.
- `node --check server/tests/api.test.js` — passed.
- Isolated schema checks — passed: all three impossible dates were rejected and both valid dates were accepted for create and update.
- `git diff --check -- server/middleware/validate.js server/tests/api.test.js` — passed with no whitespace errors.

These schema checks are not a substitute for the API regression test; they do not exercise HTTP requests or the database-backed unchanged-event assertion.

## Why full API testing is pending

The API suite could not load because the `jsonwebtoken` dependency was missing. Restoring dependencies with `npm ci` failed while building `better-sqlite3`: no prebuilt binary was available for the installed Node.js 26.13.0 runtime, and Visual Studio C++ build tools were unavailable. The full API suite and the new database-backed regression test have **not** passed or completed.

## Human verification required

1. Use a Node.js version compatible with the project's locked `better-sqlite3` dependency, or provide the required native build tools.
2. From `server/`, install dependencies from the lockfile and run `npm test`.
3. Confirm the new API regression test completes successfully, including HTTP rejection for all three impossible dates, acceptance of both valid dates, and no database changes after rejected updates.
4. Record the actual test output and environment before marking full API retesting complete.

No prompts, screenshots, or full API test results are represented here; none were captured for this evidence.
