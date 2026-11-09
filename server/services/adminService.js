const adminModel = require('../models/adminModel');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getOverview() {
  return adminModel.getOverview();
}

function getUsers() {
  return adminModel.findUsers();
}

function updateUserRole(userId, role) {
  if (!['user', 'organizer', 'admin'].includes(role)) {
    throw createError(400, 'Invalid role specified.');
  }

  const changes = adminModel.updateUserRole(userId, role);
  if (changes === 0) {
    throw createError(404, 'User not found.');
  }

  return 'User role updated successfully.';
}

function updateUserStatus(userId, status, actingUserId) {
  if (!['active', 'suspended'].includes(status)) {
    throw createError(400, 'Invalid status specified.');
  }

  if (parseInt(userId, 10) === actingUserId) {
    throw createError(400, 'Admin cannot suspend their own account.');
  }

  const changes = adminModel.updateUserStatus(userId, status);
  if (changes === 0) {
    throw createError(404, 'User not found.');
  }

  return `User status changed to ${status}.`;
}

function recordAdminAction(adminUserId, action, targetId) {
  adminModel.recordAdminAction(adminUserId, action, targetId);
}

function getEvents() {
  return adminModel.findEvents();
}

function getReports() {
  return adminModel.findReportRows().map(report => ({
    ...report,
    occupancy_rate: report.capacity > 0
      ? Math.round((report.confirmed_count / report.capacity) * 100)
      : 0
  }));
}

module.exports = {
  getOverview,
  getUsers,
  updateUserRole,
  updateUserStatus,
  recordAdminAction,
  getEvents,
  getReports
};
