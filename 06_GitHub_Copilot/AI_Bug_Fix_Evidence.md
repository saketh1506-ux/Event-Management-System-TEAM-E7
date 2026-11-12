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
- From `server/`, `npm test` — passed on Node.js 22.23.4 / npm 10.9.9: 72 tests passed, 0 failed. The run included the database-backed event-date regression test for create and update.

The API regression test verifies HTTP behavior and that a rejected invalid update leaves the event record unchanged. No prompt transcript or screenshot of the AI interaction was captured; this file records the investigation and verification evidence in text.
