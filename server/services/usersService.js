const usersModel = require('../models/usersModel');

function getRegisteredEvents(userId) {
  const registrations = usersModel.findRegisteredEvents(userId);
  const confirmedEventIds = registrations
    .filter(registration => registration.registration_status === 'confirmed')
    .map(event => event.id);
  const notifications = usersModel.findNotifications(confirmedEventIds);

  return { registrations, notifications };
}

function getOrganizedEvents(userId) {
  return usersModel.findOrganizedEvents(userId);
}

module.exports = {
  getRegisteredEvents,
  getOrganizedEvents
};
