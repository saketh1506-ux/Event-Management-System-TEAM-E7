# Local Setup and Deployment Guide

This guide covers a local run of the Express server and its bundled web client. It is not evidence that the application has been deployed to a public hosting provider.

## Requirements

- Node.js 22.x (the project was verified with Node.js 22.23.4).
- npm.
- Windows PowerShell examples are provided below; the same npm commands work from other shells.

`better-sqlite3` is a native Node.js module. If `npm ci` cannot install it for a different Node.js version or operating system, use a supported Node version or provide the platform's required native build tools.

## Install

From the repository root:

```powershell
Set-Location .\server
npm ci
```

## Configure

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Edit `server/.env` and set at least a strong, unique `JWT_SECRET`. Generate a 32-byte random value with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set `PORT` if the default `5000` is unavailable. `EMS_DATABASE_PATH` selects the SQLite file; when run from `server`, the example value `./database.sqlite` resolves to `server/database.sqlite`.

The five `EMS_SEED_*_PASSWORD` values are optional for ordinary use. They are all required to seed the local demo accounts and sample events, and seeding occurs only when the database contains no users. Set distinct local-only passwords; do not reuse test credentials or use demo accounts in a public deployment. The app loads `server/.env` on startup.

## Start and verify

From `server`:

```powershell
npm start
```

Open `http://localhost:5000`. Verify the health endpoint from another PowerShell window:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

The API should return a healthy status and timestamp. Stop the foreground server with `Ctrl+C`.

## Test before deployment

From `server`:

```powershell
npm test
npx playwright install chromium firefox
npm run test:e2e
```

The automated suites use temporary databases; they do not validate an existing deployment or an existing production database.

## Existing databases and public hosting

- Back up and inspect an existing SQLite database before replacing application files. The schema initializer uses `CREATE TABLE IF NOT EXISTS`; it does not migrate every historical schema change. In particular, verify older databases for the current `events.created_at` column before upgrading.
- Configure durable storage for the SQLite database and a tested backup/restore process before hosting outside a developer machine.
- The current server enables wildcard CORS. Restrict allowed origins before exposing it publicly.
- Configure HTTPS at the hosting platform or reverse proxy, protect environment secrets, and use platform-specific health monitoring.

No public deployment, hosting configuration, production database migration, or deployment smoke test is represented by this guide. Capture those separately after an actual deployment.
