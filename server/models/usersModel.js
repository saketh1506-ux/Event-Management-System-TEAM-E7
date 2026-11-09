const db = require('../db');

function findRegisteredEvents(userId) {
  return db.prepare(`
    SELECT e.*, r.id as registration_id, r.status as registration_status, r.registered_at,
           u.name as organizer_name, u.email as organizer_email,
           (SELECT COUNT(*) FROM registrations reg WHERE reg.event_id = e.id AND reg.status = 'confirmed') as registered_count
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    JOIN users u ON e.organizer_id = u.id
    WHERE r.user_id = ? AND r.status = 'confirmed'
    ORDER BY r.registered_at DESC
  `).all(userId);
}

function findNotifications(eventIds) {
  if (eventIds.length === 0) return [];
  const placeholders = eventIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT u.*, e.title as event_title
    FROM event_updates u
    JOIN events e ON u.event_id = e.id
    WHERE u.event_id IN (${placeholders})
    ORDER BY u.sent_at DESC
  `).all(...eventIds);
}

function findOrganizedEvents(userId) {
  return db.prepare(`
    SELECT e.*,
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
    FROM events e
    WHERE e.organizer_id = ?
    ORDER BY e.created_at DESC
  `).all(userId);
}

module.exports = {
  findRegisteredEvents,
  findNotifications,
  findOrganizedEvents
};
