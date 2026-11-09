const db = require('../db');

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserIdByEmail(email) {
  return db.prepare('SELECT id FROM users WHERE email = ?').get(email);
}

function createUser(name, email, password, role) {
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(name, email, password, role);

  return findPublicUserById(result.lastInsertRowid);
}

function findPublicUserById(userId) {
  return db.prepare(`
    SELECT id, name, email, role, status, created_at
    FROM users
    WHERE id = ?
  `).get(userId);
}

module.exports = {
  findUserByEmail,
  findUserIdByEmail,
  createUser,
  findPublicUserById
};
