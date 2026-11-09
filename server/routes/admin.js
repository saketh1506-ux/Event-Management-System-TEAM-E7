const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validatePayload, validateParams, adminSchemas } = require('../middleware/validate');
const auditAdminAction = require('../middleware/auditAdminAction');

// All admin routes require authenticated admin
router.use(authenticateToken, authorizeRoles('admin'));

// GET /api/admin/overview - System statistics
router.get('/overview', adminController.getOverview);

// GET /api/admin/users (AR-02, AR-03, FR-10, UC-17, UC-18) - Manage users & organizers
router.get('/users', adminController.getUsers);

// PATCH /api/admin/users/:id/role - Update user role
router.patch(
  '/users/:id/role',
  validateParams('id'),
  validatePayload(adminSchemas.updateRole),
  auditAdminAction,
  adminController.updateUserRole
);

// PATCH /api/admin/users/:id/status - Toggle suspend/activate
router.patch(
  '/users/:id/status',
  validateParams('id'),
  validatePayload(adminSchemas.updateStatus),
  auditAdminAction,
  adminController.updateUserStatus
);

// GET /api/admin/events (AR-04, FR-10, UC-19) - All events with full stats
router.get('/events', adminController.getEvents);

// GET /api/admin/reports (AR-06, UC-20) - System-level registration and capacity report
router.get('/reports', adminController.getReports);

module.exports = router;
