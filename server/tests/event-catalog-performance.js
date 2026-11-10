const { performance } = require('node:perf_hooks');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const eventCount = Number(process.env.EMS_EVENT_BENCHMARK_EVENTS || 5000);
const requestCount = Number(process.env.EMS_EVENT_BENCHMARK_REQUESTS || 30);
const concurrency = Number(process.env.EMS_EVENT_BENCHMARK_CONCURRENT || 10);
const searchTerm = 'Event 42';
const targetMs = 3000;
const serverDirectory = path.resolve(__dirname, '..');
const projectDatabasePath = path.resolve(serverDirectory, 'database.sqlite');

function percentile(values, percentage) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percentage / 100) * sorted.length) - 1];
}

function summarize(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    average_ms: Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2)),
    median_ms: Number(median.toFixed(2)),
    p95_ms: Number(percentile(latencies, 95).toFixed(2)),
    max_ms: Number(Math.max(...latencies).toFixed(2)),
    min_ms: Number(Math.min(...latencies).toFixed(2))
  };
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

function waitForServer(baseUrl, child) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    async function check() {
      if (child.exitCode !== null) {
        reject(new Error(`Benchmark server exited with code ${child.exitCode}.`));
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) return resolve();
      } catch (_) {
        // The server may still be initializing.
      }

      if (Date.now() >= deadline) {
        reject(new Error('Timed out waiting for the benchmark server.'));
        return;
      }
      setTimeout(check, 50);
    }
    check();
  });
}

function stopServer(child) {
  if (!child || child.exitCode !== null || child.killed) return Promise.resolve();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function fetchEvents(baseUrl, query = '') {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/events${query}`);
  const body = await response.json();
  return { elapsed: performance.now() - startedAt, status: response.status, body };
}

async function runBatch(baseUrl, query, expectedCount) {
  const results = [];
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < requestCount) {
      nextIndex += 1;
      results.push(await fetchEvents(baseUrl, query));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, runWorker));
  if (results.some(result => result.status !== 200 || result.body.events.length !== expectedCount)) {
    throw new Error(`One or more ${query || 'unfiltered'} event listing requests returned an unexpected status or event count.`);
  }
  return results;
}

function seedDatabase(databasePath) {
  process.env.EMS_DATABASE_PATH = databasePath;
  process.env.EMS_SEED_ADMIN_PASSWORD = 'BenchmarkOnly@123';
  process.env.EMS_SEED_ORGANIZER_PASSWORD = 'BenchmarkOnly@123';
  process.env.EMS_SEED_SECOND_ORGANIZER_PASSWORD = 'BenchmarkOnly@123';
  process.env.EMS_SEED_ATTENDEE_PASSWORD = 'BenchmarkOnly@123';
  process.env.EMS_SEED_SECOND_ATTENDEE_PASSWORD = 'BenchmarkOnly@123';
  const db = require('../db');
  db.prepare('DELETE FROM events').run();
  const organizerId = db.prepare('SELECT id FROM users WHERE email = ?').get('organizer@ems.com').id;
  const attendeeId = db.prepare('SELECT id FROM users WHERE email = ?').get('likhith@ems.com').id;
  const insertEvent = db.prepare(`
    INSERT INTO events (title, description, category, location, date, time, capacity, organizer_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  const insertRegistration = db.prepare(`
    INSERT INTO registrations (event_id, user_id, status)
    VALUES (?, ?, ?)
  `);
  const plans = {
    unfiltered: db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT e.id, e.title, e.description, e.category, e.location, e.date, e.time,
        e.capacity, e.organizer_id, e.status, u.name, u.email,
        (SELECT COUNT(*) FROM registrations r
         WHERE r.event_id = e.id AND r.status = 'confirmed')
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status != 'deleted'
      ORDER BY e.date ASC, e.time ASC
    `).all().map(row => row.detail),
    category: db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT e.id, e.title, e.description, e.category, e.location, e.date, e.time,
        e.capacity, e.organizer_id, e.status, u.name, u.email,
        (SELECT COUNT(*) FROM registrations r
         WHERE r.event_id = e.id AND r.status = 'confirmed')
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status != 'deleted' AND e.category = ?
      ORDER BY e.date ASC, e.time ASC
    `).all('Category 1').map(row => row.detail),
    date: db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT e.id, e.title, e.description, e.category, e.location, e.date, e.time,
        e.capacity, e.organizer_id, e.status, u.name, u.email,
        (SELECT COUNT(*) FROM registrations r
         WHERE r.event_id = e.id AND r.status = 'confirmed')
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status != 'deleted' AND e.date = ?
      ORDER BY e.date ASC, e.time ASC
    `).all('2027-01-01').map(row => row.detail),
    search: db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT e.id, e.title, e.description, e.category, e.location, e.date, e.time,
        e.capacity, e.organizer_id, e.status, u.name, u.email,
        (SELECT COUNT(*) FROM registrations r
         WHERE r.event_id = e.id AND r.status = 'confirmed')
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status != 'deleted'
        AND e.id IN (
          SELECT rowid FROM events_fts
          WHERE title LIKE ? OR description LIKE ? OR location LIKE ?
        )
      ORDER BY e.date ASC, e.time ASC
    `).all('%Event 42%', '%Event 42%', '%Event 42%').map(row => row.detail)
  };
  const seed = db.transaction(() => {
    for (let index = 0; index < eventCount; index += 1) {
      const eventId = insertEvent.run(
        `Catalog Event ${index}`,
        `Event catalog benchmark description ${index}`,
        `Category ${index % 10}`,
        `Benchmark Venue ${index % 100}`,
        `2027-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
        `${String(index % 12 || 12).padStart(2, '0')}:00`,
        100,
        organizerId
      ).lastInsertRowid;
      insertRegistration.run(eventId, organizerId, 'confirmed');
      if (index % 2 === 0) insertRegistration.run(eventId, attendeeId, 'cancelled');
    }
  });
  seed();
  db.close();
  return plans;
}

async function main() {
  if (![eventCount, requestCount, concurrency].every(Number.isInteger)
    || eventCount < 1 || requestCount < 1 || concurrency < 1) {
    throw new Error('Event count, request count, and concurrency must be positive integers.');
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ems-event-catalog-benchmark-'));
  const databasePath = path.join(temporaryDirectory, 'benchmark.sqlite');
  if (path.resolve(databasePath) === projectDatabasePath) {
    throw new Error('Refusing to use the project database for benchmarking.');
  }

  let server = null;
  try {
    const queryPlans = seedDatabase(databasePath);
    const port = await findAvailablePort();
    server = spawn(process.execPath, ['server.js'], {
      cwd: serverDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        EMS_DATABASE_PATH: databasePath,
        JWT_SECRET: 'event-catalog-benchmark-only-secret'
      },
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let serverErrors = '';
    server.stderr.setEncoding('utf8');
    server.stderr.on('data', chunk => { serverErrors += chunk; });

    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, server).catch(error => {
      throw new Error(`${error.message}${serverErrors ? `\n${serverErrors}` : ''}`);
    });

    const warmup = await fetchEvents(baseUrl);
    if (warmup.status !== 200 || warmup.body.events.length !== eventCount) {
      throw new Error(`Warmup listing returned ${warmup.status} and ${warmup.body.events?.length} events; expected ${eventCount}.`);
    }
    const searchWarmup = await fetchEvents(baseUrl, `?search=${encodeURIComponent(searchTerm)}`);
    const matchingEventCount = Array.from({ length: eventCount }, (_, index) =>
      `Catalog Event ${index}`.includes(searchTerm)).filter(Boolean).length;
    if (searchWarmup.status !== 200 || searchWarmup.body.events.length !== matchingEventCount) {
      throw new Error(`Search warmup returned ${searchWarmup.status} and ${searchWarmup.body.events?.length} events; expected ${matchingEventCount}.`);
    }

    const unfilteredStats = summarize((await runBatch(baseUrl, '', eventCount)).map(result => result.elapsed));
    const searchStats = summarize((await runBatch(
      baseUrl,
      `?search=${encodeURIComponent(searchTerm)}`,
      matchingEventCount
    )).map(result => result.elapsed));
    console.log(JSON.stringify({
      endpoint: 'GET /api/events',
      database: databasePath,
      events: eventCount,
      registrations: eventCount + Math.ceil(eventCount / 2),
      requests: requestCount,
      concurrency,
      warmup_requests_per_scenario: 1,
      target_ms: targetMs,
      query_plans: queryPlans,
      scenarios: {
        unfiltered: {
          result_count: eventCount,
          target_met_at_p95: unfilteredStats.p95_ms < targetMs,
          response_time: unfilteredStats
        },
        substring_search: {
          query: searchTerm,
          result_count: matchingEventCount,
          target_met_at_p95: searchStats.p95_ms < targetMs,
          response_time: searchStats
        }
      }
    }, null, 2));
    if (unfilteredStats.p95_ms >= targetMs || searchStats.p95_ms >= targetMs) {
      throw new Error(`Event catalog p95 exceeded the ${targetMs} ms target.`);
    }
  } finally {
    await stopServer(server);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
