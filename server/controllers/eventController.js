const eventService = require('../services/eventService');

function sendFailure(res, error, operation, responseMessage) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(`${operation}:`, error);
  return res.status(500).json({ error: responseMessage });
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^\s*[=+\-@|;\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function listEvents(req, res) {
  try {
    const events = eventService.listEvents(req.query);
    return res.status(200).json({ events });
  } catch (error) {
    return sendFailure(res, error, 'Fetch events error', 'Failed to retrieve events.');
  }
}

function getEventDetails(req, res) {
  try {
    const event = eventService.getEventDetails(req.params.id, req.user);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    return res.status(200).json({ event });
  } catch (error) {
    return sendFailure(res, error, 'Fetch event detail error', 'Failed to retrieve event details.');
  }
}

function createEvent(req, res) {
  try {
    const event = eventService.createEvent(req.body, req.user);
    return res.status(201).json({ message: 'Event created successfully.', event });
  } catch (error) {
    return sendFailure(res, error, 'Create event error', 'Failed to create event.');
  }
}

function updateEvent(req, res) {
  try {
    const event = eventService.updateEvent(req.params.id, req.body, req.user);
    return res.status(200).json({ message: 'Event updated successfully.', event });
  } catch (error) {
    return sendFailure(res, error, 'Update event error', 'Failed to update event.');
  }
}

function deleteEvent(req, res) {
  try {
    const message = eventService.deleteEvent(req.params.id, req.query, req.user);
    return res.status(200).json({ message });
  } catch (error) {
    return sendFailure(res, error, 'Delete event error', 'Failed to cancel event.');
  }
}

function registerForEvent(req, res) {
  try {
    const registration = eventService.registerForEvent(req.params.id, req.user.id);
    return res.status(201).json({
      message: 'Registration successful! Confirmation has been recorded.',
      registration
    });
  } catch (error) {
    return sendFailure(res, error, 'Register error', 'Failed to register for event.');
  }
}

function cancelRegistration(req, res) {
  try {
    eventService.cancelRegistration(req.params.id, req.user.id);
    return res.status(200).json({
      message: 'Registration successfully cancelled. Your spot has been released.'
    });
  } catch (error) {
    return sendFailure(res, error, 'Cancel registration error', 'Failed to cancel registration.');
  }
}

function getParticipants(req, res) {
  try {
    const result = eventService.getParticipants(req.params.id, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return sendFailure(res, error, 'Fetch participants error', 'Failed to retrieve participants.');
  }
}

function sendUpdate(req, res) {
  try {
    const update = eventService.sendUpdate(req.params.id, req.body, req.user);
    return res.status(201).json({
      message: 'Event update sent to all registered participants.',
      update
    });
  } catch (error) {
    return sendFailure(res, error, 'Send update error', 'Failed to post event update.');
  }
}

function getReport(req, res) {
  try {
    const report = eventService.getReport(req.params.id, req.user);
    if ((req.query.format || '').toLowerCase() !== 'csv') {
      return res.status(200).json(report);
    }

    const csvLines = [
      `${escapeCsvValue('Event Registration Report')},${escapeCsvValue(report.event.title)}`,
      `${escapeCsvValue('Event Date')},${escapeCsvValue(report.event.date + ' ' + report.event.time)}`,
      `${escapeCsvValue('Location')},${escapeCsvValue(report.event.location)}`,
      `${escapeCsvValue('Capacity')},${escapeCsvValue(report.summary.capacity)}`,
      `${escapeCsvValue('Confirmed Registrations')},${escapeCsvValue(report.summary.confirmed_count)}`,
      `${escapeCsvValue('Cancelled Registrations')},${escapeCsvValue(report.summary.cancelled_count)}`,
      `${escapeCsvValue('Available Spots')},${escapeCsvValue(report.summary.available_spots)}`,
      `${escapeCsvValue('Occupancy Rate (%)')},${escapeCsvValue(report.summary.occupancy_rate + '%')}`,
      `${escapeCsvValue('Report Generated At')},${escapeCsvValue(report.generated_at)}`,
      '',
      [
        escapeCsvValue('Registration ID'),
        escapeCsvValue('Attendee Name'),
        escapeCsvValue('Attendee Email'),
        escapeCsvValue('Status'),
        escapeCsvValue('Registered At')
      ].join(',')
    ];

    for (const attendee of report.attendees) {
      csvLines.push([
        escapeCsvValue(attendee.registration_id),
        escapeCsvValue(attendee.name),
        escapeCsvValue(attendee.email),
        escapeCsvValue(attendee.status),
        escapeCsvValue(attendee.registered_at)
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-event-${req.params.id}.csv"`);
    return res.status(200).send(csvLines.join('\r\n'));
  } catch (error) {
    return sendFailure(res, error, 'Generate report error', 'Failed to generate registration report.');
  }
}

module.exports = {
  listEvents,
  getEventDetails,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getParticipants,
  sendUpdate,
  getReport
};