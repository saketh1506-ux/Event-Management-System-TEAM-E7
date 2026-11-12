const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ems-playwright-'));
const databasePath = path.join(temporaryDirectory, 'database.sqlite');

process.once('exit', () => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } }
  ],
  webServer: {
    command: 'node server.js',
    cwd: __dirname,
    url: 'http://127.0.0.1:4173/api/health',
    timeout: 60000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'production',
      PORT: '4173',
      EMS_DATABASE_PATH: databasePath,
      JWT_SECRET: 'playwright-only-session-secret',
      EMS_SEED_ADMIN_PASSWORD: 'Admin@123',
      EMS_SEED_ORGANIZER_PASSWORD: 'Org@123',
      EMS_SEED_SECOND_ORGANIZER_PASSWORD: 'Org2@123',
      EMS_SEED_ATTENDEE_PASSWORD: 'User@123',
      EMS_SEED_SECOND_ATTENDEE_PASSWORD: 'User2@123'
    }
  }
});
