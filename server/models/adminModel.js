const db = require('../db');

function getOverview() {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
  const totalRegistrations = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'confirmed'").get().count;
  const totalOrganizers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'organizer'").get().count;

  return {
    totalUsers,
    totalOrganizers,
    totalEvents,
    totalRegistrations
  };
}

function findUsers() {
  return db.prepare(`
    SELECT id, name, email, role, status, created_at,
      (SELECT COUNT(*) FROM registrations r WHERE r.user_id = users.id AND r.status = 'confirmed') as active_registrations,
      (SELECT COUNT(*) FROM events e WHERE e.organizer_id = users.id) as events_created
    FROM users
    ORDER BY created_at DESC
  `).all();
}

function updateUserRole(userId, role) {
  return db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId).changes;
}

function updateUserStatus(userId, status) {
  return db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId).changes;
}

function recordAdminAction(adminUserId, action, targetId) {
  db.prepare(`
    INSERT INTO admin_audit_log (admin_user_id, action, target_id)
    VALUES (?, ?, ?)
  `).run(adminUserId, action, targetId);
}

function findEvents() {
  return db.prepare(`
    SELECT e.*, u.name as organizer_name, u.email as organizer_email,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as confirmed_count,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'cancelled') as cancelled_count
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    ORDER BY e.created_at DESC
  `).all();
}

function findReportRows() {
  return db.prepare(`
    SELECT e.id, e.title, e.category, e.date, e.capacity, e.status,
           u.name as organizer_name,
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as confirmed_count,
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'cancelled') as cancelled_count
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    ORDER BY confirmed_count DESC
  `).all();
}

module.exports = {
  getOverview,
  findUsers,
  updateUserRole,
  updateUserStatus,
  recordAdminAction,
  findEvents,
  findReportRows
};
