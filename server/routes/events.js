const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalAuthenticate, authorizeRoles } = require('../middleware/auth');

// Helper to get registration count for an event
function getRegistrationCount(eventId) {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM registrations
    WHERE event_id = ? AND status = 'confirmed'
  `).get(eventId);
  return row ? row.count : 0;
}

// GET /api/events (FR-02, UC-01, UC-02) - List, search, filter events
router.get('/', (req, res) => {
  try {
    const { search, category, status } = req.query;

    let query = `
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status (default active unless requested)
    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    } else {
      query += ` AND e.status != 'deleted'`;
    }

    if (category && category !== 'All') {
      query += ` AND e.category = ?`;
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY e.date ASC, e.time ASC`;

    const events = db.prepare(query).all(...params);

    // Calculate available spots and is_full
    const formattedEvents = events.map(evt => ({
      ...evt,
      spots_left: Math.max(0, evt.capacity - evt.registered_count),
      is_full: evt.registered_count >= evt.capacity
    }));

    return res.status(200).json({ events: formattedEvents });
  } catch (err) {
    console.error('Fetch events error:', err);
    return res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// GET /api/events/:id (FR-03, UC-03) - View event details
router.get('/:id', optionalAuthenticate, (req, res) => {
  try {
    const eventId = req.params.id;
    const event = db.prepare(`
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') as registered_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `).get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Only confirmed attendees, the event organizer, or an admin can access restricted event updates (FR-09)
    let updates = [];
    if (req.user) {
      const isOwnerOrAdmin = req.user.role === 'admin' || event.organizer_id === req.user.id;
      let isRegistered = false;
      if (!isOwnerOrAdmin) {
        const reg = db.prepare(`
          SELECT id FROM registrations
          WHERE event_id = ? AND user_id = ? AND status = 'confirmed'
        `).get(eventId, req.user.id);
        isRegistered = !!reg;
      }

      if (isOwnerOrAdmin || isRegistered) {
        updates = db.prepare(`
          SELECT * FROM event_updates WHERE event_id = ? ORDER BY sent_at DESC
        `).all(eventId);
      }
    }

    return res.status(200).json({
      event: {
        ...event,
        spots_left: Math.max(0, event.capacity - event.registered_count),
        is_full: event.registered_count >= event.capacity,
        updates
      }
    });
  } catch (err) {
    console.error('Fetch event detail error:', err);
    return res.status(500).json({ error: 'Failed to retrieve event details.' });
  }
});

// POST /api/events (FR-07, OR-01, OR-04, UC-11) - Create event (Organizer / Admin)
router.post('/', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const { title, description, category, location, date, time, capacity } = req.body;

  if (!title || !location || !date || !time || !capacity) {
    return res.status(400).json({ error: 'Title, location, date, time, and capacity are required.' });
  }

  const capacityText = String(capacity);
  if (!/^\d+$/.test(capacityText) || Number(capacityText) < 1) {
    return res.status(400).json({ error: 'Capacity must be a positive integer greater than or equal to 1.' });
  }

  const parsedCapacity = Number(capacityText);

  try {
    const result = db.prepare(`
      INSERT INTO events (title, description, category, location, date, time, capacity, organizer_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      title.trim(),
      description ? description.trim() : '',
      category || 'General',
      location.trim(),
      date,
      time,
      parsedCapacity,
      req.user.id
    );

    const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({
      message: 'Event created successfully.',
      event: newEvent
    });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ error: 'Failed to create event.' });
  }
});

// PUT /api/events/:id (FR-07, OR-02, UC-12) - Edit event (Organizer / Admin)
router.put('/:id', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const eventId = req.params.id;
  const { title, description, category, location, date, time, capacity, status } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Only creator organizer or admin can edit
    if (req.user.role !== 'admin' && existing.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this event.' });
    }

    const currentRegCount = getRegistrationCount(eventId);
    const newCapacity = capacity !== undefined ? parseInt(capacity, 10) : existing.capacity;

    if (newCapacity < currentRegCount) {
      return res.status(400).json({
        error: `Cannot decrease capacity to ${newCapacity}. Current confirmed registrations are ${currentRegCount}.`
      });
    }

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
      title ? title.trim() : null,
      description !== undefined ? description.trim() : null,
      category || null,
      location ? location.trim() : null,
      date || null,
      time || null,
      newCapacity || null,
      status || null,
      eventId
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    return res.status(200).json({
      message: 'Event updated successfully.',
      event: updated
    });
  } catch (err) {
    console.error('Update event error:', err);
    return res.status(500).json({ error: 'Failed to update event.' });
  }
});

// DELETE /api/events/:id (FR-07, OR-03, AR-05, UC-13, UC-19) - Cancel or Remove event
router.delete('/:id', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const eventId = req.params.id;

  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && existing.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to cancel this event.' });
    }

    // Organizers mark status as cancelled; Admins can delete permanently or mark cancelled
    const hardDelete = req.query.hard === 'true' && req.user.role === 'admin';

    if (hardDelete) {
      db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
      return res.status(200).json({ message: 'Event permanently removed by administrator.' });
    } else {
      db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(eventId);
      return res.status(200).json({ message: 'Event marked as cancelled successfully.' });
    }
  } catch (err) {
    console.error('Delete event error:', err);
    return res.status(500).json({ error: 'Failed to cancel event.' });
  }
});

// POST /api/events/:id/register (FR-04, FR-05, UR-06, TC-04, TC-05, TC-06) - Register for event
router.post('/:id/register', authenticateToken, (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;

  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot register for a cancelled event.' });
    }

    const registrationTransaction = db.transaction(() => {
      const existingReg = db.prepare(`
        SELECT * FROM registrations WHERE event_id = ? AND user_id = ?
      `).get(eventId, userId);

      if (existingReg && existingReg.status === 'confirmed') {
        const error = new Error('You are already registered for this event.');
        error.status = 409;
        throw error;
      }

      const currentCount = getRegistrationCount(eventId);
      if (currentCount >= event.capacity) {
        const error = new Error('Event is at full capacity. No more seats available.');
        error.status = 400;
        throw error;
      }

      if (existingReg && existingReg.status === 'cancelled') {
        db.prepare(`
          UPDATE registrations
          SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(existingReg.id);
      } else {
        db.prepare(`
          INSERT INTO registrations (event_id, user_id, status)
          VALUES (?, ?, 'confirmed')
        `).run(eventId, userId);
      }

      return {
        currentCount,
        spotsLeft: Math.max(0, event.capacity - currentCount - 1)
      };
    });

    const { spotsLeft } = registrationTransaction.immediate();
    return res.status(201).json({
      message: 'Registration successful! Confirmation has been recorded.',
      registration: {
        event_id: Number(eventId),
        user_id: userId,
        status: 'confirmed',
        spots_left: spotsLeft
      }
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register for event.' });
  }
});

// DELETE /api/events/:id/register (FR-05, UR-07, TC-07) - Cancel registration
router.delete('/:id/register', authenticateToken, (req, res) => {
  const eventId = req.params.id;
  const userId = req.user.id;

  try {
    const existing = db.prepare(`
      SELECT * FROM registrations WHERE event_id = ? AND user_id = ? AND status = 'confirmed'
    `).get(eventId, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Active registration not found for this event.' });
    }

    db.prepare(`
      UPDATE registrations
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.id);

    return res.status(200).json({
      message: 'Registration successfully cancelled. Your spot has been released.'
    });
  } catch (err) {
    console.error('Cancel registration error:', err);
    return res.status(500).json({ error: 'Failed to cancel registration.' });
  }
});

// GET /api/events/:id/participants (FR-08, OR-05, OR-06, UC-15) - View participants
router.get('/:id/participants', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const eventId = req.params.id;

  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to view participants for this event.' });
    }

    const participants = db.prepare(`
      SELECT r.id as registration_id, r.status, r.registered_at,
             u.id as user_id, u.name, u.email
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.registered_at ASC
    `).all(eventId);

    const confirmed = participants.filter(p => p.status === 'confirmed');
    const cancelled = participants.filter(p => p.status === 'cancelled');

    return res.status(200).json({
      event_id: Number(eventId),
      event_title: event.title,
      capacity: event.capacity,
      confirmed_count: confirmed.length,
      cancelled_count: cancelled.length,
      participants
    });
  } catch (err) {
    console.error('Fetch participants error:', err);
    return res.status(500).json({ error: 'Failed to retrieve participants.' });
  }
});

// POST /api/events/:id/updates (FR-09, OR-07, UC-16) - Send an event update
router.post('/:id/updates', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const eventId = req.params.id;
  const { title, message } = req.body;

  if (!title || typeof title !== 'string' || !title.trim() || !message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Update title and message are required and cannot be empty.' });
  }

  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to send updates for this event.' });
    }

    const result = db.prepare(`
      INSERT INTO event_updates (event_id, title, message)
      VALUES (?, ?, ?)
    `).run(eventId, title.trim(), message.trim());

    const update = db.prepare('SELECT * FROM event_updates WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Event update sent to all registered participants.',
      update
    });
  } catch (err) {
    console.error('Send update error:', err);
    return res.status(500).json({ error: 'Failed to post event update.' });
  }
});

// Helper to escape CSV field values safely against formula injection and delimiters (FR-10)
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Protect against spreadsheet formula injection (=, +, -, @, tab, CR, pipe, semicolon, or formula with leading whitespace)
  if (/^\s*[=+\-@|;\t\r\n]/.test(str)) {
    str = "'" + str;
  }
  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/events/:id/report (FR-10, UC-20, TC-15) - Generate registration report
router.get('/:id/report', authenticateToken, authorizeRoles('organizer', 'admin'), (req, res) => {
  const eventId = req.params.id;
  const format = (req.query.format || '').toLowerCase();

  try {
    const event = db.prepare(`
      SELECT e.*, u.name as organizer_name, u.email as organizer_email
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `).get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to generate reports for this event.' });
    }

    const participants = db.prepare(`
      SELECT r.id as registration_id, r.status, r.registered_at,
             u.id as user_id, u.name, u.email
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.registered_at ASC
    `).all(eventId);

    const confirmed = participants.filter(p => p.status === 'confirmed');
    const cancelled = participants.filter(p => p.status === 'cancelled');
    const confirmedCount = confirmed.length;
    const cancelledCount = cancelled.length;
    const capacity = Number(event.capacity);
    const availableSpots = Math.max(0, capacity - confirmedCount);
    const occupancyPercentage = capacity > 0
      ? Number(((confirmedCount / capacity) * 100).toFixed(2))
      : 0;

    const reportData = {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        date: event.date,
        time: event.time,
        status: event.status,
        organizer_name: event.organizer_name,
        organizer_email: event.organizer_email
      },
      summary: {
        capacity,
        confirmed_count: confirmedCount,
        cancelled_count: cancelledCount,
        available_spots: availableSpots,
        occupancy_rate: occupancyPercentage
      },
      generated_at: new Date().toISOString(),
      attendees: participants.map(p => ({
        registration_id: p.registration_id,
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        status: p.status,
        registered_at: p.registered_at
      }))
    };

    if (format === 'csv') {
      const csvLines = [];
      csvLines.push(`${escapeCsvValue('Event Registration Report')},${escapeCsvValue(event.title)}`);
      csvLines.push(`${escapeCsvValue('Event Date')},${escapeCsvValue(event.date + ' ' + event.time)}`);
      csvLines.push(`${escapeCsvValue('Location')},${escapeCsvValue(event.location)}`);
      csvLines.push(`${escapeCsvValue('Capacity')},${escapeCsvValue(capacity)}`);
      csvLines.push(`${escapeCsvValue('Confirmed Registrations')},${escapeCsvValue(confirmedCount)}`);
      csvLines.push(`${escapeCsvValue('Cancelled Registrations')},${escapeCsvValue(cancelledCount)}`);
      csvLines.push(`${escapeCsvValue('Available Spots')},${escapeCsvValue(availableSpots)}`);
      csvLines.push(`${escapeCsvValue('Occupancy Rate (%)')},${escapeCsvValue(occupancyPercentage + '%')}`);
      csvLines.push(`${escapeCsvValue('Report Generated At')},${escapeCsvValue(reportData.generated_at)}`);
      csvLines.push('');
      csvLines.push([
        escapeCsvValue('Registration ID'),
        escapeCsvValue('Attendee Name'),
        escapeCsvValue('Attendee Email'),
        escapeCsvValue('Status'),
        escapeCsvValue('Registered At')
      ].join(','));

      for (const att of reportData.attendees) {
        csvLines.push([
          escapeCsvValue(att.registration_id),
          escapeCsvValue(att.name),
          escapeCsvValue(att.email),
          escapeCsvValue(att.status),
          escapeCsvValue(att.registered_at)
        ].join(','));
      }

      const csvContent = csvLines.join('\r\n');
      const sanitizedFilename = `report-event-${eventId}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json(reportData);
  } catch (err) {
    console.error('Generate report error:', err);
    return res.status(500).json({ error: 'Failed to generate registration report.' });
  }
});

module.exports = router;
