# Demonstration Run Script

Suggested length: 5-7 minutes. This script describes a local demonstration; it is not a recording or evidence that a public deployment exists.

## Before the demo

1. Follow [`DEPLOYMENT_GUIDE.md`](../08_Deployment/DEPLOYMENT_GUIDE.md) and start the application at `http://localhost:5000`.
2. If using the seeded demonstration accounts, configure all five `EMS_SEED_*_PASSWORD` variables before the database is first initialized. Use the passwords from the local `.env`; do not put those passwords in the recording or commit them.
3. Use disposable accounts and events for actions that change roles or event state.
4. Confirm `/api/health` responds before starting.

## Walkthrough

| Time | Actor / view | Demonstration | Expected result |
|---|---|---|---|
| 0:00-1:00 | Visitor / event catalog | Open the catalog, search or filter events, and open event details. | Public event information is visible; filters update results; the details dialog shows event information. |
| 1:00-2:00 | Attendee | Log in with a locally configured attendee account, register for an available event, then open the registrations dashboard. | Registration succeeds and appears in the attendee dashboard. |
| 2:00-2:30 | Attendee | Cancel the registration. | The UI confirms cancellation and removes the event from the confirmed registrations list. |
| 2:30-4:00 | Organizer | Open the organizer dashboard, create a disposable event, edit it, and cancel it. | The event is created and appears in the organizer view; edits are visible; cancellation is shown. |
| 4:00-5:00 | Organizer / attendee | Show participant or registration information and an event update/report where available. | Access is limited to the authorized owner/registered attendee as appropriate. |
| 5:00-6:00 | Administrator | Open the admin console and show user/event management. If demonstrating a role change, use a disposable account and restore or remove it afterward. | Admin-only controls are available to the administrator; changes are reflected in the UI. |
| 6:00-7:00 | Reviewer | Show the health endpoint and point to the automated test report. | Local health check responds; test claims can be checked against the recorded evidence. |

## Existing screenshot evidence

These are screenshots captured by the automated Chromium/Firefox workflows; they are not a continuous demo video:

- [Chromium catalog, mobile](../02_Test_Planning/evidence/catalog-chromium-375.png)
- [Chromium catalog, tablet](../02_Test_Planning/evidence/catalog-chromium-768.png)
- [Chromium catalog, desktop](../02_Test_Planning/evidence/catalog-chromium-1440.png)
- [Firefox catalog, mobile](../02_Test_Planning/evidence/catalog-firefox-375.png)
- [Firefox catalog, tablet](../02_Test_Planning/evidence/catalog-firefox-768.png)
- [Firefox catalog, desktop](../02_Test_Planning/evidence/catalog-firefox-1440.png)
- [Chromium organizer dashboard](../02_Test_Planning/evidence/organizer-dashboard-chromium.png)
- [Firefox organizer dashboard](../02_Test_Planning/evidence/organizer-dashboard-firefox.png)
- [Chromium admin dashboard](../02_Test_Planning/evidence/admin-dashboard-chromium.png)
- [Firefox admin dashboard](../02_Test_Planning/evidence/admin-dashboard-firefox.png)

No demonstration video is included.
