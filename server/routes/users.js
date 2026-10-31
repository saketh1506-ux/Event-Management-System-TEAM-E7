const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/me/events (FR-06, UR-08, UC-08) - Registered events for current user
router.get('/me/events', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const registeredEvents = db.prepare(`
      SELECT e.*, r.id as registration_id, r.status as registration_status, r.registered_at,
             u.name as organizer_name, u.email as organizer_email,
             (SELECT COUNT(*) FROM registrations reg WHERE reg.event_id = e.id AND reg.status = 'confirmed') as registered_count
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON e.organizer_id = u.id
      WHERE r.user_id = ? AND r.status = 'confirmed'
      ORDER BY r.registered_at DESC
    `).all(userId);

    // Also get any updates ONLY for events where the user has a confirmed registration (FR-09)
    const confirmedEventIds = registeredEvents
      .filter(r => r.registration_status === 'confirmed')
      .map(e => e.id);

    let notifications = [];
    if (confirmedEventIds.length > 0) {
      const placeholders = confirmedEventIds.map(() => '?').join(',');
      notifications = db.prepare(`
        SELECT u.*, e.title as event_title
        FROM event_updates u
        JOIN events e ON u.event_id = e.id
        WHERE u.event_id IN (${placeholders})
        ORDER BY u.sent_at DESC
      `).all(...confirmedEventIds);
    }

    return res.status(200).json({
      registrations: registeredEvents,
      notifications
    });
  } catch (err) {
    console.error('Fetch user events error:', err);
    return res.status(500).json({ error: 'Failed to retrieve registered events.' });
  }
});

// GET /api/users/me/organized (Organizer created events)
router.get('/me/organized', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const organizedEvents = db.prepare(`
      SELECT e.*,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
      FROM events e
      WHERE e.organizer_id = ?
      ORDER BY e.created_at DESC
    `).all(userId);

    return res.status(200).json({ events: organizedEvents });
  } catch (err) {
    console.error('Fetch organized events error:', err);
    return res.status(500).json({ error: 'Failed to retrieve organized events.' });
  }
});

module.exports = router;
