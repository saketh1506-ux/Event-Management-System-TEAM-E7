const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.EMS_DATABASE_PATH
  ? path.resolve(process.env.EMS_DATABASE_PATH)
  : path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  // Users table (Roles: visitor, user, organizer, admin)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'organizer', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'General',
      location TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK(capacity >= 1),
      organizer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')),
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(event_id, user_id)
    );
  `);

  // Event Updates / Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  // Revoked / Blacklisted tokens table for secure session management (SEC-04)
  db.exec(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER,
      expires_at DATETIME,
      revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed demo accounts only when each password is explicitly configured.
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    const seedUsers = [
      { name: 'System Admin', email: 'admin@ems.com', role: 'admin', password: process.env.EMS_SEED_ADMIN_PASSWORD },
      { name: 'Saketh Narayanam', email: 'organizer@ems.com', role: 'organizer', password: process.env.EMS_SEED_ORGANIZER_PASSWORD },
      { name: 'Neeraj Gowda', email: 'neeraj@ems.com', role: 'organizer', password: process.env.EMS_SEED_SECOND_ORGANIZER_PASSWORD },
      { name: 'Likhith Reddy', email: 'likhith@ems.com', role: 'user', password: process.env.EMS_SEED_ATTENDEE_PASSWORD },
      { name: 'Adil Ahmed', email: 'adil@ems.com', role: 'user', password: process.env.EMS_SEED_SECOND_ATTENDEE_PASSWORD }
    ];

    if (seedUsers.some(user => !user.password)) {
      console.warn('Skipping demo account and event seed; configure all EMS_SEED_*_PASSWORD values to enable it.');
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = (pwd) => bcrypt.hashSync(pwd, salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, status)
      VALUES (?, ?, ?, ?, 'active')
    `);

    const seededUserIds = seedUsers.map(user => insertUser.run(
      user.name,
      user.email,
      hash(user.password),
      user.role
    ).lastInsertRowid);

    console.log('Seeded configured demo accounts.');

    // Seed sample events
    const insertEvent = db.prepare(`
      INSERT INTO events (title, description, category, location, date, time, capacity, organizer_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    insertEvent.run(
      'Tech Innovators Summit 2026',
      'Annual tech conference exploring emerging trends in Software Engineering, AI, and Cloud Architecture.',
      'Technology',
      'PES University Tech Park, Auditorium 1',
      '2026-11-15',
      '09:30 AM',
      50,
      seededUserIds[1]
    );

    insertEvent.run(
      'Full-Stack Web Development Workshop',
      'Hands-on masterclass building production-grade web systems with React, Node.js, and modern databases.',
      'Workshop',
      'Lab Block 3, Room 402',
      '2026-11-20',
      '02:00 PM',
      30,
      seededUserIds[1]
    );

    insertEvent.run(
      'HackPES 24-Hour Hackathon',
      'Join team hackathon to build collaborative solutions for sustainability and campus life.',
      'Hackathon',
      'Campus Innovation Hub',
      '2026-12-05',
      '10:00 AM',
      100,
      seededUserIds[2]
    );

    console.log('Seeded sample events');
  }
}

initDb();

Object.defineProperty(db, '_emsConfiguredDbPath', {
  value: dbPath,
  enumerable: false
});

module.exports = db;
