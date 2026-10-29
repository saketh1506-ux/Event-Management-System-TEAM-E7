process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { JWT_SECRET } = require('../middleware/auth');

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 
      'Content-Type': 'application/json',
      'Connection': 'close'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers, agent: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`${method} ${path} failed: ${err.message}`, { cause: err }));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        return reject(new Error('Could not get test server address'));
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
    server.on('error', reject);
  });
});

test.after(async () => {
  if (server && server.listening) {
    await new Promise(resolve => server.close(resolve));
  }
});

test('TC-01: Create account with valid details (FR-01)', async () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const res = await request('POST', '/api/auth/register', {
    name: 'New Attendee',
    email: uniqueEmail,
    password: 'Password123'
  });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.email, uniqueEmail);
});

test('TC-02: Reject invalid login (FR-01, NFR-04)', async () => {
  const res = await request('POST', '/api/auth/login', {
    email: 'admin@ems.com',
    password: 'WrongPassword'
  });

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error);
});

test('TC-03: Search and view an event (FR-02, FR-03)', async () => {
  // Search
  const listRes = await request('GET', '/api/events?search=Tech');
  assert.strictEqual(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.events));
  assert.ok(listRes.body.events.length > 0);

  const eventId = listRes.body.events[0].id;

  // View details
  const detailRes = await request('GET', `/api/events/${eventId}`);
  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailRes.body.event.id, eventId);
  assert.ok(detailRes.body.event.capacity >= 1);
});

test('TC-04, TC-06, TC-07: Register, Prevent Duplicate, and Cancel registration (FR-04, FR-05)', async () => {
  // Login as user
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(loginRes.status, 200);
  const userToken = loginRes.body.token;

  // Register for event 1
  const regRes = await request('POST', '/api/events/1/register', {}, userToken);
  // Status might be 201 if first time, or if already registered we test duplicate
  if (regRes.status === 201) {
    assert.strictEqual(regRes.body.registration.status, 'confirmed');

    // Duplicate registration attempt (TC-06)
    const dupRes = await request('POST', '/api/events/1/register', {}, userToken);
    assert.strictEqual(dupRes.status, 409);

    // Cancel registration (TC-07)
    const cancelRes = await request('DELETE', '/api/events/1/register', {}, userToken);
    assert.strictEqual(cancelRes.status, 200);
  } else {
    // Already registered, test duplicate rejection directly
    assert.strictEqual(regRes.status, 409);
    // Cancel it
    const cancelRes = await request('DELETE', '/api/events/1/register', {}, userToken);
    assert.strictEqual(cancelRes.status, 200);
    // Re-register
    const reReg = await request('POST', '/api/events/1/register', {}, userToken);
    assert.strictEqual(reReg.status, 201);
  }
});

test('TC-05: Reject registration when event is full (FR-04)', async () => {
  // Organizer login
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(orgLogin.status, 200);
  const orgToken = orgLogin.body.token;

  // Create event with capacity 1 and dynamic title to avoid collision
  const createRes = await request('POST', '/api/events', {
    title: `Limited Capacity Masterclass ${Date.now()}`,
    description: 'Testing capacity limit boundary',
    category: 'Workshop',
    location: 'Online',
    date: '2026-12-01',
    time: '11:00 AM',
    capacity: 1
  }, orgToken);
  assert.strictEqual(createRes.status, 201);
  const eventId = createRes.body.event.id;

  // User 1 login
  const user1 = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  // User 2 login
  const user2 = await request('POST', '/api/auth/login', {
    email: 'adil@ems.com',
    password: 'User@123'
  });

  assert.strictEqual(user1.status, 200);
  assert.strictEqual(user2.status, 200);

  // User 1 fills the only spot
  const reg1 = await request('POST', `/api/events/${eventId}/register`, {}, user1.body.token);
  assert.strictEqual(reg1.status, 201);

  // User 2 attempts to register - MUST BE REJECTED WITH 400
  const reg2 = await request('POST', `/api/events/${eventId}/register`, {}, user2.body.token);
  assert.strictEqual(reg2.status, 400);
  assert.match(reg2.body.error, /full capacity/i);
});

test('TC-05A: Concurrent registrations cannot exceed capacity (FR-04)', async () => {
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(orgLogin.status, 200);

  const createRes = await request('POST', '/api/events', {
    title: `Concurrent Capacity Boundary ${Date.now()}`,
    description: 'Testing simultaneous registration requests',
    category: 'Workshop',
    location: 'Online',
    date: '2026-12-02',
    time: '12:00 PM',
    capacity: 1
  }, orgLogin.body.token);
  assert.strictEqual(createRes.status, 201);
  const eventId = createRes.body.event.id;

  const user1Login = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  const user2Login = await request('POST', '/api/auth/login', {
    email: 'adil@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(user1Login.status, 200);
  assert.strictEqual(user2Login.status, 200);

  const responses = await Promise.all([
    request('POST', `/api/events/${eventId}/register`, {}, user1Login.body.token),
    request('POST', `/api/events/${eventId}/register`, {}, user2Login.body.token)
  ]);
  const statuses = responses.map(response => response.status).sort();

  assert.deepStrictEqual(statuses, [201, 400].sort());
  assert.ok(responses.some(response => response.status === 400 && /full capacity/i.test(response.body.error)));

  const detailRes = await request('GET', `/api/events/${eventId}`);
  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailRes.body.event.registered_count, 1);
  assert.strictEqual(detailRes.body.event.spots_left, 0);
});

test('TC-07A: Re-register after cancellation (FR-05)', async () => {
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(orgLogin.status, 200);

  const createRes = await request('POST', '/api/events', {
    title: `Re-registration Test ${Date.now()}`,
    description: 'Testing registration cancellation and reactivation',
    category: 'Workshop',
    location: 'Online',
    date: '2026-12-03',
    time: '01:00 PM',
    capacity: 2
  }, orgLogin.body.token);
  assert.strictEqual(createRes.status, 201);
  const eventId = createRes.body.event.id;

  const userLogin = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(userLogin.status, 200);
  const token = userLogin.body.token;

  const firstRegistration = await request('POST', `/api/events/${eventId}/register`, {}, token);
  assert.strictEqual(firstRegistration.status, 201);

  const cancellation = await request('DELETE', `/api/events/${eventId}/register`, {}, token);
  assert.strictEqual(cancellation.status, 200);

  const reRegistration = await request('POST', `/api/events/${eventId}/register`, {}, token);
  assert.strictEqual(reRegistration.status, 201);
  assert.strictEqual(reRegistration.body.registration.status, 'confirmed');
});

test('TC-08: Organizer creates event and sets capacity (FR-07, FR-08)', async () => {
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(orgLogin.status, 200);
  const orgToken = orgLogin.body.token;

  const eventData = {
    title: `Cloud Architecture Summit ${Date.now()}`,
    description: 'Architecting for resiliency',
    category: 'Seminar',
    location: 'PESU Convention Center',
    date: '2026-11-28',
    time: '10:00 AM',
    capacity: 75
  };

  const res = await request('POST', '/api/events', eventData, orgToken);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.event.capacity, 75);
  assert.strictEqual(res.body.event.title, eventData.title);
});

test('TC-09: Block unauthorized admin access (FR-10, NFR-04)', async () => {
  const userLogin = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(userLogin.status, 200);
  const userToken = userLogin.body.token;

  // Attempting admin route with standard user token
  const res = await request('GET', '/api/admin/users', null, userToken);
  assert.strictEqual(res.status, 403);
});

// --- SEC-04: Secure Session Handling & Token Expiry ---

test('SEC-04-01: Protected endpoint rejects request when token is missing (401)', async () => {
  const res = await request('GET', '/api/auth/me');
  assert.strictEqual(res.status, 401);
  assert.match(res.body.error, /access token required/i);
});

test('SEC-04-02: Protected endpoint rejects invalid or tampered token (401)', async () => {
  const res = await request('GET', '/api/auth/me', null, 'this.is.an.invalid.token');
  assert.strictEqual(res.status, 401);
  assert.match(res.body.error, /invalid or expired token/i);
});

test('SEC-04-03: Protected endpoint rejects expired token (401)', async () => {
  // Sign token that expired 1 hour ago
  const expiredToken = jwt.sign(
    { id: 4, name: 'Likhith Reddy', email: 'likhith@ems.com', role: 'user' },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );

  const res = await request('GET', '/api/auth/me', null, expiredToken);
  assert.strictEqual(res.status, 401);
  assert.match(res.body.error, /invalid or expired token/i);
});

test('SEC-04-04: Valid token authenticates correct user on protected endpoint (200)', async () => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(loginRes.status, 200);
  const token = loginRes.body.token;

  const res = await request('GET', '/api/auth/me', null, token);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'likhith@ems.com');
  assert.strictEqual(res.body.user.role, 'user');
});

test('SEC-04-05: Secure logout succeeds and revokes token in persistent database (200)', async () => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'adil@ems.com',
    password: 'User@123'
  });
  assert.strictEqual(loginRes.status, 200);
  const token = loginRes.body.token;

  // Verify token works before logout
  const beforeRes = await request('GET', '/api/auth/me', null, token);
  assert.strictEqual(beforeRes.status, 200);
  assert.strictEqual(beforeRes.body.user.email, 'adil@ems.com');

  // Perform secure logout
  const logoutRes = await request('POST', '/api/auth/logout', {}, token);
  assert.strictEqual(logoutRes.status, 200);
  assert.match(logoutRes.body.message, /logout successful|session terminated/i);

  // Attempting to use the revoked token must now be rejected (401)
  const afterRes = await request('GET', '/api/auth/me', null, token);
  assert.strictEqual(afterRes.status, 401);
  assert.match(afterRes.body.error, /revoked|invalid/i);
});

test('SEC-04-06: Logged-out token cannot perform state mutations (401)', async () => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  const token = loginRes.body.token;

  // Logout
  const logoutRes = await request('POST', '/api/auth/logout', {}, token);
  assert.strictEqual(logoutRes.status, 200);

  // Mutation attempt on event registration
  const regRes = await request('POST', '/api/events/1/register', {}, token);
  assert.strictEqual(regRes.status, 401);
  assert.match(regRes.body.error, /revoked|invalid/i);
});
