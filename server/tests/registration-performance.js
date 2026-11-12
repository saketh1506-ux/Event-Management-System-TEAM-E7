const { performance } = require('node:perf_hooks');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const requestCount = Number(process.env.EMS_BENCHMARK_REQUESTS || 60);
const concurrency = Number(process.env.EMS_BENCHMARK_CONCURRENT || 10);
const serverDirectory = path.resolve(__dirname, '..');
const projectDatabasePath = path.resolve(serverDirectory, 'database.sqlite');

function percentile(values, percentage) {
  if (!values.length) throw new Error('Cannot calculate percentile for an empty sample.');
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentage / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function median(values) {
  if (!values.length) throw new Error('Cannot calculate median for an empty sample.');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(latencies) {
  const total = latencies.reduce((sum, value) => sum + value, 0);
  if (!latencies.length) throw new Error('Cannot summarize an empty latency sample.');

  return {
    average_ms: Number((total / latencies.length).toFixed(2)),
    median_ms: Number(median(latencies).toFixed(2)),
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
        if (response.ok) {
          resolve();
          return;
        }
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

async function api(baseUrl, method, urlPath, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let parsed = {};
  if (text) parsed = JSON.parse(text);

  return { status: response.status, body: parsed };
}

async function timedApi(baseUrl, method, urlPath, body, token) {
  const startedAt = performance.now();
  const result = await api(baseUrl, method, urlPath, body, token);
  return { elapsed: performance.now() - startedAt, ...result };
}

async function runBatch(items, worker) {
  const results = [];
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results.push(await worker(items[index], index));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

async function main() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ems-nfr02-benchmark-'));
  const databasePath = path.join(temporaryDirectory, 'benchmark.sqlite');
  if (path.resolve(databasePath) === projectDatabasePath) {
    throw new Error('Refusing to use the project database for benchmarking.');
  }

  let server = null;

  try {
    if (!Number.isInteger(requestCount) || requestCount < 1) {
      throw new Error('EMS_BENMARK_REQUESTS must be a positive integer.');
    }
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error('EMS_BENCHMARK_CONCURRENT must be a positive integer.');
    }

    const port = await findAvailablePort();
    server = spawn(process.execPath, ['server.js'], {
      cwd: serverDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        EMS_DATABASE_PATH: databasePath,
        JWT_SECRET: 'registration-benchmark-only-secret',
        EMS_SEED_ADMIN_PASSWORD: 'Admin@123',
        EMS_SEED_ORGANIZER_PASSWORD: 'Org@123',
        EMS_SEED_SECOND_ORGANIZER_PASSWORD: 'Org@123',
        EMS_SEED_ATTENDEE_PASSWORD: 'User@123',
        EMS_SEED_SECOND_ATTENDEE_PASSWORD: 'User@123'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, server);

    const suffix = `${Date.now()}-${process.pid}`;
    const organizerLogin = await api(baseUrl, 'POST', '/api/auth/login', {
      email: 'organizer@ems.com',
      password: 'Org@123'
    });
    if (organizerLogin.status !== 200) throw new Error('Organizer login failed');

    const event = await api(baseUrl, 'POST', '/api/events', {
      title: `Registration latency benchmark ${suffix}`,
      description: 'Isolated registration latency benchmark',
      category: 'Benchmark',
      location: 'Benchmark Hall',
      date: '2027-01-15',
      time: '10:00 AM',
      capacity: requestCount + 20
    }, organizerLogin.body.token);
    if (event.status !== 201) throw new Error(`Benchmark event creation failed: ${JSON.stringify(event.body)}`);

    const accounts = [];
    for (let index = 0; index < requestCount; index++) {
      const email = `latency-${suffix}-${index}@example.com`;
      const registration = await api(baseUrl, 'POST', '/api/auth/register', {
        name: `Latency User ${index}`,
        email,
        password: 'Password123'
      });
      if (registration.status !== 201) throw new Error(`Account setup failed: ${JSON.stringify(registration.body)}`);
      accounts.push(registration.body.token);
    }

    const registrationBatchStartedAt = performance.now();
    const registrationResults = await runBatch(accounts, async token => {
      return timedApi(baseUrl, 'POST', `/api/events/${event.body.event.id}/register`, {}, token);
    });
    const registrationBatchElapsedSeconds = (performance.now() - registrationBatchStartedAt) / 1000;

    if (registrationResults.some(result => result.status !== 201)) {
      throw new Error('Registration request returned an unexpected status');
    }

    const duplicateResults = await runBatch(accounts, async token => {
      return timedApi(baseUrl, 'POST', `/api/events/${event.body.event.id}/register`, {}, token);
    });
    if (duplicateResults.some(result => result.status !== 409)) {
      throw new Error('Duplicate registration request returned an unexpected status');
    }

    const latencies = registrationResults.map(result => result.elapsed);
    const throughput = latencies.length / Math.max(registrationBatchElapsedSeconds, 0.001);

    console.log(JSON.stringify({
      api_url: baseUrl,
      database: databasePath,
      requests: requestCount,
      concurrency,
      successful_registration: summarize(latencies),
      duplicate_registration: summarize(duplicateResults.map(result => result.elapsed)),
      throughput_requests_per_second: Number(throughput.toFixed(2))
    }, null, 2));
  } finally {
    await stopServer(server);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
