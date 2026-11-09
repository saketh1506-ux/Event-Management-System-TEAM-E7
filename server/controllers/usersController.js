const usersService = require('../services/usersService');

function getRegisteredEvents(req, res) {
  try {
    const result = usersService.getRegisteredEvents(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Fetch user events error:', error);
    return res.status(500).json({ error: 'Failed to retrieve registered events.' });
  }
}

function getOrganizedEvents(req, res) {
  try {
    const events = usersService.getOrganizedEvents(req.user.id);
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Fetch organized events error:', error);
    return res.status(500).json({ error: 'Failed to retrieve organized events.' });
  }
}

module.exports = {
  getRegisteredEvents,
  getOrganizedEvents
};
