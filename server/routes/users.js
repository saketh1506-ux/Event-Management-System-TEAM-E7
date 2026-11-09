const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/me/events (FR-06, UR-08, UC-08) - Registered events for current user
router.get('/me/events', authenticateToken, usersController.getRegisteredEvents);

// GET /api/users/me/organized (Organizer created events)
router.get('/me/organized', authenticateToken, usersController.getOrganizedEvents);

module.exports = router;
