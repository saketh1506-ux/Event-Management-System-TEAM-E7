const db = require('../db');

function auditAdminAction(req, res, next) {
  if (req.user.role !== 'admin') {
    return next();
  }

  try {
    const action = `${req.method} ${req.baseUrl}${req.route.path}`.replace(/\/$/, '');
    db.prepare(`
      INSERT INTO admin_audit_log (admin_user_id, action, target_id)
      VALUES (?, ?, ?)
    `).run(
      req.user.id,
      action,
      req.params.id ? Number(req.params.id) : null
    );
  } catch (error) {
    console.error('Admin action audit error:', error);
    return res.status(500).json({ error: 'Failed to record admin action.' });
  }

  return next();
}

module.exports = auditAdminAction;
