const db = require('../db');

function findAll(filters) {
  const { search, category, status, date } = filters;
  let query = `
    SELECT e.*, u.name as organizer_name, u.email as organizer_email,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  } else {
    query += " AND e.status != 'deleted'";
  }

  if (category && category !== 'All') {
    query += ' AND e.category = ?';
    params.push(category);
  }

  if (date) {
    query += ' AND e.date = ?';
    params.push(date);
  }

  if (search && search.trim() !== '') {
    query += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY e.date ASC, e.time ASC';
  return db.prepare(query).all(...params);
}

function findById(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function findDetailsById(id) {
  return db.prepare(`
    SELECT e.*, u.name as organizer_name, u.email as organizer_email,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE e.id = ?
  `).get(id);
}

function findReportEventById(id) {
  return db.prepare(`
    SELECT e.*, u.name as organizer_name, u.email as organizer_email
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE e.id = ?
  `).get(id);
}

function findUpdates(eventId) {
  return db.prepare('SELECT * FROM event_updates WHERE event_id = ? ORDER BY sent_at DESC').all(eventId);
}

function findConfirmedRegistration(eventId, userId) {
  return db.prepare(`
    SELECT id FROM registrations
    WHERE event_id = ? AND user_id = ? AND status = 'confirmed'
  `).get(eventId, userId);
}

function findRegistration(eventId, userId) {
  return db.prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?').get(eventId, userId);
}

function findRegistrationCount(eventId) {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM registrations
    WHERE event_id = ? AND status = 'confirmed'
  `).get(eventId);
  return row ? row.count : 0;
}

function createEvent(event) {
  const result = db.prepare(`
    INSERT INTO events (title, description, category, location, date, time, capacity, organizer_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    event.title,
    event.description,
    event.category,
    event.location,
    event.date,
    event.time,
    event.capacity,
    event.organizerId
  );
  return findById(result.lastInsertRowid);
}

function updateEvent(id, event) {
  db.prepare(`
    UPDATE events
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        location = COALESCE(?, location),
        date = COALESCE(?, date),
        time = COALESCE(?, time),
        capacity = COALESCE(?, capacity),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(
    event.title,
    event.description,
    event.category,
    event.location,
    event.date,
    event.time,
    event.capacity,
    event.status,
    id
  );
  return findById(id);
}

function removeEvent(id) {
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
}

function cancelEvent(id) {
  db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(id);
}

function withImmediateTransaction(callback) {
  return db.transaction(callback).immediate();
}

function reactivateRegistration(registrationId) {
  db.prepare(`
    UPDATE registrations
    SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(registrationId);
}

function createRegistration(eventId, userId) {
  db.prepare(`
    INSERT INTO registrations (event_id, user_id, status)
    VALUES (?, ?, 'confirmed')
  `).run(eventId, userId);
}

function cancelConfirmedRegistration(registrationId) {
  db.prepare(`
    UPDATE registrations
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(registrationId);
}

function findParticipants(eventId) {
  return db.prepare(`
    SELECT r.id as registration_id, r.status, r.registered_at,
           u.id as user_id, u.name, u.email
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ?
    ORDER BY r.registered_at ASC
  `).all(eventId);
}

function createUpdate(eventId, title, message) {
  const result = db.prepare(`
    INSERT INTO event_updates (event_id, title, message)
    VALUES (?, ?, ?)
  `).run(eventId, title, message);
  return db.prepare('SELECT * FROM event_updates WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = {
  findAll,
  findById,
  findDetailsById,
  findReportEventById,
  findUpdates,
  findConfirmedRegistration,
  findRegistration,
  findRegistrationCount,
  createEvent,
  updateEvent,
  removeEvent,
  cancelEvent,
  withImmediateTransaction,
  reactivateRegistration,
  createRegistration,
  cancelConfirmedRegistration,
  findParticipants,
  createUpdate
};