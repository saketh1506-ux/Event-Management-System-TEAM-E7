const db = require('../db');

function logAdminAction(actorUserId, action, targetType, targetId, details = {}) {
  db.prepare(`
    INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(actorUserId, action, targetType, targetId, JSON.stringify(details));
}

module.exports = { logAdminAction };
