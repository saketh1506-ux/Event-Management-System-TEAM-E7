const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All admin routes require authenticated admin
router.use(authenticateToken, authorizeRoles('admin'));

// GET /api/admin/overview - System statistics
router.get('/overview', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const totalRegistrations = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'confirmed'").get().count;
    const totalOrganizers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'organizer'").get().count;

    return res.status(200).json({
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalRegistrations
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

// GET /api/admin/users (AR-02, AR-03, FR-10, UC-17, UC-18) - Manage users & organizers
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, status, created_at,
        (SELECT COUNT(*) FROM registrations r WHERE r.user_id = users.id AND r.status = 'confirmed') as active_registrations,
        (SELECT COUNT(*) FROM events e WHERE e.organizer_id = users.id) as events_created
      FROM users
      ORDER BY created_at DESC
    `).all();

    return res.status(200).json({ users });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!['user', 'organizer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  try {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    return res.status(200).json({ message: 'User role updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// PATCH /api/admin/users/:id/status - Toggle suspend/activate
router.patch('/users/:id/status', (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status specified.' });
  }

  // Prevent self-suspension
  if (parseInt(userId, 10) === req.user.id) {
    return res.status(400).json({ error: 'Admin cannot suspend their own account.' });
  }

  try {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    return res.status(200).json({ message: `User status changed to ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// GET /api/admin/events (AR-04, FR-10, UC-19) - All events with full stats
router.get('/events', (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as confirmed_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'cancelled') as cancelled_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      ORDER BY e.created_at DESC
    `).all();

    return res.status(200).json({ events });
  } catch (err) {
    console.error('Admin events fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin events.' });
  }
});

// GET /api/admin/reports (AR-06, UC-20) - System-level registration and capacity report
router.get('/reports', (req, res) => {
  try {
    const report = db.prepare(`
      SELECT e.id, e.title, e.category, e.date, e.capacity, e.status,
             u.name as organizer_name,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as confirmed_count,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'cancelled') as cancelled_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      ORDER BY confirmed_count DESC
    `).all();

    const formattedReport = report.map(r => ({
      ...r,
      occupancy_rate: r.capacity > 0 ? Math.round((r.confirmed_count / r.capacity) * 100) : 0
    }));

    return res.status(200).json({ report: formattedReport });
  } catch (err) {
    console.error('Admin reports fetch error:', err);
    return res.status(500).json({ error: 'Failed to generate system reports.' });
  }
});

module.exports = router;
