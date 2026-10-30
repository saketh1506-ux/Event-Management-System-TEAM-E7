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
// --- FR-09: Organizer Event Announcements & Broadcast Updates ---

test('FR-09-01: An event owner (organizer) can publish a valid update', async () => {
  // Login as organizer (Saketh Narayanam, id: 2)
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(orgLogin.status, 200);
  const orgToken = orgLogin.body.token;

  // Create an event owned by this organizer
  const eventRes = await request('POST', '/api/events', {
    title: `FR09 Organizer Event ${Date.now()}`,
    description: 'Event for announcement verification',
    category: 'Workshop',
    location: 'Auditorium 2',
    date: '2026-12-15',
    time: '02:00 PM',
    capacity: 50
  }, orgToken);
  assert.strictEqual(eventRes.status, 201);
  const eventId = eventRes.body.event.id;

  // Publish update
  const updateRes = await request('POST', `/api/events/${eventId}/updates`, {
    title: 'Room Changed',
    message: 'The session has been moved to Lab 402.'
  }, orgToken);

  assert.strictEqual(updateRes.status, 201);
  assert.strictEqual(updateRes.body.update.title, 'Room Changed');
  assert.strictEqual(updateRes.body.update.message, 'The session has been moved to Lab 402.');
  assert.strictEqual(updateRes.body.update.event_id, eventId);
});

test('FR-09-02: An organizer cannot publish an update for another organizer\'s event (403)', async () => {
  // Organizer 1 creates event
  const org1Login = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  const org1Token = org1Login.body.token;

  const eventRes = await request('POST', '/api/events', {
    title: `Organizer 1 Event ${Date.now()}`,
    description: 'Owned by organizer 1',
    category: 'Seminar',
    location: 'Hall A',
    date: '2026-12-20',
    time: '10:00 AM',
    capacity: 40
  }, org1Token);
  assert.strictEqual(eventRes.status, 201);
  const eventId = eventRes.body.event.id;

  // Organizer 2 (Neeraj Gowda, id: 3) attempts to publish an update to Organizer 1's event
  const org2Login = await request('POST', '/api/auth/login', {
    email: 'neeraj@ems.com',
    password: 'Org@123'
  });
  assert.strictEqual(org2Login.status, 200);
  const org2Token = org2Login.body.token;

  const updateRes = await request('POST', `/api/events/${eventId}/updates`, {
    title: 'Unauthorized Announcement',
    message: 'This should be blocked.'
  }, org2Token);

  assert.strictEqual(updateRes.status, 403);
  assert.match(updateRes.body.error, /not authorized/i);
});

test('FR-09-03: Publishing update without authentication is rejected (401)', async () => {
  const updateRes = await request('POST', '/api/events/1/updates', {
    title: 'No Token Update',
    message: 'Anonymous update attempt'
  });

  assert.strictEqual(updateRes.status, 401);
});

test('FR-09-04: Publishing update with missing or whitespace-only title/message is rejected (400)', async () => {
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  const orgToken = orgLogin.body.token;

  // Missing title
  const res1 = await request('POST', '/api/events/1/updates', {
    message: 'Valid message without title'
  }, orgToken);
  assert.strictEqual(res1.status, 400);

  // Whitespace-only title
  const res2 = await request('POST', '/api/events/1/updates', {
    title: '   ',
    message: 'Valid message with whitespace title'
  }, orgToken);
  assert.strictEqual(res2.status, 400);

  // Whitespace-only message
  const res3 = await request('POST', '/api/events/1/updates', {
    title: 'Valid Title',
    message: '   \n  \t '
  }, orgToken);
  assert.strictEqual(res3.status, 400);
});

test('FR-09-05: Registered attendee can retrieve and view event updates via dashboard and details', async () => {
  // Organizer creates event
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  const orgToken = orgLogin.body.token;

  const eventRes = await request('POST', '/api/events', {
    title: `Registered Attendee Test ${Date.now()}`,
    description: 'Testing updates visibility for registered user',
    category: 'Technology',
    location: 'Main Hall',
    date: '2026-12-18',
    time: '03:00 PM',
    capacity: 30
  }, orgToken);
  assert.strictEqual(eventRes.status, 201);
  const eventId = eventRes.body.event.id;

  // Post update
  await request('POST', `/api/events/${eventId}/updates`, {
    title: 'Important Preparation Info',
    message: 'Please install Node.js v20+ before the workshop.'
  }, orgToken);

  // User logs in and registers
  const userLogin = await request('POST', '/api/auth/login', {
    email: 'likhith@ems.com',
    password: 'User@123'
  });
  const userToken = userLogin.body.token;

  const regRes = await request('POST', `/api/events/${eventId}/register`, {}, userToken);
  assert.strictEqual(regRes.status, 201);

  // 1. Check registered-events dashboard (/api/users/me/events)
  const dashboardRes = await request('GET', '/api/users/me/events', null, userToken);
  assert.strictEqual(dashboardRes.status, 200);
  const notification = dashboardRes.body.notifications.find(n => n.event_id === eventId);
  assert.ok(notification, 'Notification should appear on attendee dashboard');
  assert.strictEqual(notification.title, 'Important Preparation Info');

  // 2. Check event details endpoint (/api/events/:id) with attendee token
  const detailRes = await request('GET', `/api/events/${eventId}`, null, userToken);
  assert.strictEqual(detailRes.status, 200);
  assert.ok(Array.isArray(detailRes.body.event.updates));
  assert.strictEqual(detailRes.body.event.updates.length, 1);
  assert.strictEqual(detailRes.body.event.updates[0].title, 'Important Preparation Info');
});

test('FR-09-06: Unregistered user cannot access restricted event updates', async () => {
  // Organizer creates event and publishes update
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  const orgToken = orgLogin.body.token;

  const eventRes = await request('POST', '/api/events', {
    title: `Restricted Update Test ${Date.now()}`,
    description: 'Updates must be restricted to registered attendees',
    category: 'Technology',
    location: 'Lab 2',
    date: '2026-12-22',
    time: '11:00 AM',
    capacity: 25
  }, orgToken);
  const eventId = eventRes.body.event.id;

  await request('POST', `/api/events/${eventId}/updates`, {
    title: 'Confidential Access Link',
    message: 'Meeting link: https://secret.meet/xyz'
  }, orgToken);

  // 1. Anonymous visitor browsing public event details
  const publicRes = await request('GET', `/api/events/${eventId}`);
  assert.strictEqual(publicRes.status, 200);
  assert.strictEqual(publicRes.body.event.title, eventRes.body.event.title);
  assert.deepStrictEqual(publicRes.body.event.updates, [], 'Public browsing must not expose restricted updates');

  // 2. Authenticated user who is NOT registered for this event
  const userLogin = await request('POST', '/api/auth/login', {
    email: 'adil@ems.com',
    password: 'User@123'
  });
  const userToken = userLogin.body.token;

  // Check event details
  const userDetailRes = await request('GET', `/api/events/${eventId}`, null, userToken);
  assert.strictEqual(userDetailRes.status, 200);
  assert.deepStrictEqual(userDetailRes.body.event.updates, [], 'Unregistered authenticated user must not access updates');

  // Check user dashboard
  const userDashboard = await request('GET', '/api/users/me/events', null, userToken);
  assert.strictEqual(userDashboard.status, 200);
  const forbiddenNotif = userDashboard.body.notifications.find(n => n.event_id === eventId);
  assert.strictEqual(forbiddenNotif, undefined, 'Unregistered event update must not appear in user dashboard notifications');
});

test('FR-09-07: User who cancelled registration cannot access restricted event updates', async () => {
  // Organizer creates event and publishes update
  const orgLogin = await request('POST', '/api/auth/login', {
    email: 'organizer@ems.com',
    password: 'Org@123'
  });
  const orgToken = orgLogin.body.token;

  const eventRes = await request('POST', '/api/events', {
    title: `Cancelled User Test ${Date.now()}`,
    description: 'Testing cancelled registration update restriction',
    category: 'Technology',
    location: 'Seminar Room',
    date: '2026-12-28',
    time: '04:00 PM',
    capacity: 20
  }, orgToken);
  const eventId = eventRes.body.event.id;

  await request('POST', `/api/events/${eventId}/updates`, {
    title: 'Speaker Slide Decks',
    message: 'Attached slide deck for registered participants'
  }, orgToken);

  // User registers then cancels
  const userLogin = await request('POST', '/api/auth/login', {
    email: 'adil@ems.com',
    password: 'User@123'
  });
  const userToken = userLogin.body.token;

  const regRes = await request('POST', `/api/events/${eventId}/register`, {}, userToken);
  assert.strictEqual(regRes.status, 201);

  // Cancel registration
  const cancelRes = await request('DELETE', `/api/events/${eventId}/register`, {}, userToken);
  assert.strictEqual(cancelRes.status, 200);

  // 1. Event details should no longer expose updates
  const detailRes = await request('GET', `/api/events/${eventId}`, null, userToken);
  assert.strictEqual(detailRes.status, 200);
  assert.deepStrictEqual(detailRes.body.event.updates, [], 'Cancelled attendee must not receive updates via details');

  // 2. User dashboard notifications should not include updates for cancelled events
  const dashboardRes = await request('GET', '/api/users/me/events', null, userToken);
  assert.strictEqual(dashboardRes.status, 200);
  const notif = dashboardRes.body.notifications.find(n => n.event_id === eventId);
  assert.strictEqual(notif, undefined, 'Dashboard notifications must not include updates for cancelled registrations');
});
