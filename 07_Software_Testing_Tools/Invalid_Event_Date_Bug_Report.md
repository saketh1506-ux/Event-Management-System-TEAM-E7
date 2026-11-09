# Bug-Fix Evidence Report: Invalid Event Calendar Dates

## Bug

**Title:** Event creation and updates accepted impossible calendar dates  
**Date discovered:** November 5, 2026  
**Status:** Fix implemented; full API retesting pending

## Affected files

- `server/middleware/validate.js` - event create and update date validation.
- `server/tests/api.test.js` - API regression coverage.

## Reproduction steps

Authenticate as an organizer and use an otherwise valid date and event payload, changing only the date to an impossible calendar date such as `2026-02-31`.

### Event creation

Send `POST /api/events` with an organizer bearer token and a valid event payload, for example:

```json
{
  "title": "Calendar Date Reproduction",
  "description": "Reproduce invalid date acceptance",
  "category": "Workshop",
  "location": "Validation Hall",
  "date": "2026-02-31",
  "time": "10:00 AM",
  "capacity": 10
}
```

### Event update

Send `PUT /api/events/:id` with the owning organizer's bearer token and:

```json
{
  "date": "2026-02-31"
}
```

Before the fix, both requests passed date validation.

## Expected vs. actual behavior before the fix

- **Expected:** Reject an impossible calendar date with HTTP 400 and do not create or alter an event.
- **Actual before the fix:** The validator accepted an impossible date string, allowing the create or update route to proceed.

## Root cause

The create and update schemas relied on `Date.parse()` after checking the `YYYY-MM-DD` shape. JavaScript normalizes some impossible dates rather than treating them as invalid; for example, `Date.parse('2026-02-31')` returns a timestamp. Therefore, a non-NaN result did not prove that the date existed on the calendar.

## AI-assisted fix summary

An AI-assisted code investigation identified the shared weakness in the event create and update schemas. The fix adds a strict calendar-date check: it parses the year, month, and day components, constructs a UTC date, and verifies that the resulting components exactly match the input. Both schemas use this check while retaining the existing error response and date format.

## Regression test cases

The added API regression test covers these dates for both event creation and update:

| Date | Expected result |
|---|---|
| `2026-02-31` | Reject |
| `2026-04-31` | Reject |
| `2025-02-29` | Reject |
| `2024-02-29` | Accept |
| `2026-11-05` | Accept |

The test also captures the existing event before each invalid update and asserts that its database record is unchanged afterward.

## Test execution results

- **Passed - syntax checks:** `node --check` passed for both changed JavaScript files.
- **Passed - isolated schema checks:** The three impossible dates were rejected and the two valid dates were accepted for both create and update schemas.
- **Passed - diff check:** `git diff --check` reported no whitespace errors.
- **Not run to completion - full API suite:** The test runner could not load `jsonwebtoken` because server dependencies were missing. Restoring dependencies with `npm ci` then failed while building `better-sqlite3`: no prebuilt binary was available for the installed Node.js 26.13.0 runtime, and Visual Studio C++ build tools were unavailable.
- **Pending - API regression test:** The API test covering create/update requests and the unchanged-event assertion has not run end-to-end.

## Retest status

**Full API retesting is pending.** The schema checks do not substitute for running the database-backed API regression test. The regression test must be run in an environment with compatible dependencies and a supported/buildable `better-sqlite3` runtime before recording API-level pass results.

