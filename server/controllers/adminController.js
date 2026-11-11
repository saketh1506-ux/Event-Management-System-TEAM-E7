
const adminService = require('../services/adminService');

function getOverview(req, res) {
  try {
    const overview = adminService.getOverview();
    return res.status(200).json(overview);
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
}

function getUsers(req, res) {
  try {
    const users = adminService.getUsers();
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

function updateUserRole(req, res) {
  try {
    const message = adminService.updateUserRole(
      req.params.id,
      req.body.role,
      req.user.id
    );

    return res.status(200).json({ message });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update user role.' });
  }
}

function updateUserStatus(req, res) {
  try {
    const message = adminService.updateUserStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );

    return res.status(200).json({ message });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

function getEvents(req, res) {
  try {
    const events = adminService.getEvents();
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Admin events fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin events.' });
  }
}

function getReports(req, res) {
  try {
    const report = adminService.getReports();

    return res.status(200).json({ report });
  } catch (error) {
    console.error('Admin reports error:', error);
    return res.status(500).json({ error: 'Failed to generate system reports.' });
  }
}

module.exports = {
  getOverview,
  getUsers,
  updateUserRole,
  updateUserStatus,
  getEvents,
  getReports
};
