const eventModel = require('../models/eventModel');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertEventOwner(event, user, action) {
  if (user.role !== 'admin' && event.organizer_id !== user.id) {
    throw createError(403, `You are not authorized to ${action} this event.`);
  }
}

function listEvents(filters) {
  return eventModel.findAll(filters).map(event => ({
    ...event,
    spots_left: Math.max(0, event.capacity - event.registered_count),
    is_full: event.registered_count >= event.capacity
  }));
}

function getEventDetails(eventId, user) {
  const event = eventModel.findDetailsById(eventId);
  if (!event) return null;

  let updates = [];
  if (user) {
    const isOwnerOrAdmin = user.role === 'admin' || event.organizer_id === user.id;
    const isRegistered = !isOwnerOrAdmin && eventModel.findConfirmedRegistration(eventId, user.id);
    if (isOwnerOrAdmin || isRegistered) updates = eventModel.findUpdates(eventId);
  }

  return {
    ...event,
    spots_left: Math.max(0, event.capacity - event.registered_count),
    is_full: event.registered_count >= event.capacity,
    updates
  };
}

function createEvent(data, userId) {
  const { title, description, category, location, date, time, capacity } = data;
  if (!title || !location || !date || !time || !capacity) {
    throw createError(400, 'Title, location, date, time, and capacity are required.');
  }

  const capacityText = String(capacity);
  if (!/^\d+$/.test(capacityText) || Number(capacityText) < 1) {
    throw createError(400, 'Capacity must be a positive integer greater than or equal to 1.');
  }

  return eventModel.createEvent({
    title: title.trim(),
    description: description ? description.trim() : '',
    category: category || 'General',
    location: location.trim(),
    date,
    time,
    capacity: Number(capacityText),
    organizerId: userId
  });
}

function updateEvent(eventId, data, user) {
  const existing = eventModel.findById(eventId);
  if (!existing) throw createError(404, 'Event not found.');
  assertEventOwner(existing, user, 'edit');

  const currentRegistrationCount = eventModel.findRegistrationCount(eventId);
  const newCapacity = data.capacity !== undefined ? parseInt(data.capacity, 10) : existing.capacity;
  if (newCapacity < currentRegistrationCount) {
    throw createError(400, `Cannot decrease capacity to ${newCapacity}. Current confirmed registrations are ${currentRegistrationCount}.`);
  }

  return eventModel.updateEvent(eventId, {
    title: data.title ? data.title.trim() : null,
    description: data.description !== undefined ? data.description.trim() : null,
    category: data.category || null,
    location: data.location ? data.location.trim() : null,
    date: data.date || null,
    time: data.time || null,
    capacity: newCapacity || null,
    status: data.status || null
  });
}

function deleteEvent(eventId, query, user) {
  const existing = eventModel.findById(eventId);
  if (!existing) throw createError(404, 'Event not found.');
  assertEventOwner(existing, user, 'cancel');

  const hardDelete = query.hard === 'true' && user.role === 'admin';
  if (hardDelete) {
    eventModel.removeEvent(eventId);
    return 'Event permanently removed by administrator.';
  }

  eventModel.cancelEvent(eventId);
  return 'Event marked as cancelled successfully.';
}

function registerForEvent(eventId, userId) {
  const event = eventModel.findById(eventId);
  if (!event) throw createError(404, 'Event not found.');
  if (event.status === 'cancelled') {
    throw createError(400, 'Cannot register for a cancelled event.');
  }

  const { spotsLeft } = eventModel.withImmediateTransaction(() => {
    const existingRegistration = eventModel.findRegistration(eventId, userId);
    if (existingRegistration && existingRegistration.status === 'confirmed') {
      throw createError(409, 'You are already registered for this event.');
    }

    const currentCount = eventModel.findRegistrationCount(eventId);
    if (currentCount >= event.capacity) {
      throw createError(400, 'Event is at full capacity. No more seats available.');
    }

    if (existingRegistration && existingRegistration.status === 'cancelled') {
      eventModel.reactivateRegistration(existingRegistration.id);
    } else {
      eventModel.createRegistration(eventId, userId);
    }

    return { spotsLeft: Math.max(0, event.capacity - currentCount - 1) };
  });

  return {
    event_id: Number(eventId),
    user_id: userId,
    status: 'confirmed',
    spots_left: spotsLeft
  };
}

function cancelRegistration(eventId, userId) {
  const registration = eventModel.findConfirmedRegistration(eventId, userId);
  if (!registration) {
    throw createError(404, 'Active registration not found for this event.');
  }
  eventModel.cancelConfirmedRegistration(registration.id);
}

function getParticipants(eventId, user) {
  const event = eventModel.findById(eventId);
  if (!event) throw createError(404, 'Event not found.');
  assertEventOwner(event, user, 'view participants for');

  const participants = eventModel.findParticipants(eventId);
  return {
    event_id: Number(eventId),
    event_title: event.title,
    capacity: event.capacity,
    confirmed_count: participants.filter(participant => participant.status === 'confirmed').length,
    cancelled_count: participants.filter(participant => participant.status === 'cancelled').length,
    participants
  };
}

function sendUpdate(eventId, data, user) {
  const { title, message } = data;
  if (!title || typeof title !== 'string' || !title.trim() || !message || typeof message !== 'string' || !message.trim()) {
    throw createError(400, 'Update title and message are required and cannot be empty.');
  }

  const event = eventModel.findById(eventId);
  if (!event) throw createError(404, 'Event not found.');
  assertEventOwner(event, user, 'send updates for');
  return eventModel.createUpdate(eventId, title.trim(), message.trim());
}

function getReport(eventId, user) {
  const event = eventModel.findReportEventById(eventId);
  if (!event) throw createError(404, 'Event not found.');
  assertEventOwner(event, user, 'generate reports for');

  const participants = eventModel.findParticipants(eventId);
  const confirmedCount = participants.filter(participant => participant.status === 'confirmed').length;
  const cancelledCount = participants.filter(participant => participant.status === 'cancelled').length;
  const capacity = Number(event.capacity);
  const availableSpots = Math.max(0, capacity - confirmedCount);
  const occupancyPercentage = capacity > 0
    ? Number(((confirmedCount / capacity) * 100).toFixed(2))
    : 0;

  return {
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
    attendees: participants.map(participant => ({
      registration_id: participant.registration_id,
      user_id: participant.user_id,
      name: participant.name,
      email: participant.email,
      status: participant.status,
      registered_at: participant.registered_at
    }))
  };
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