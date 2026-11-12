# Test Planning

Purpose: Test strategy, test cases, and validation results.

## Available evidence

- [`Project_Wide_Testing_Audit_Report.md`](Project_Wide_Testing_Audit_Report.md) records test results, security findings, performance measurements, browser versions, limitations, and screenshot evidence.
- [`evidence/`](evidence/) contains Chromium/Firefox screenshots for mobile, tablet, desktop, organizer, and administrator views.

## Rerun commands

From `server`:

```powershell
npm test
npm run benchmark:registration
npm run benchmark:event-catalog
npx playwright install chromium firefox
npm run test:e2e
```
