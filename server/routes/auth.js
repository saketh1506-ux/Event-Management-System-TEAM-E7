const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validatePayload, authSchemas } = require('../middleware/validate');

// POST /api/auth/register (FR-01, TC-01)
router.post('/register', validatePayload(authSchemas.register), authController.register);

// POST /api/auth/login (FR-01, TC-01, TC-02)
router.post('/login', validatePayload(authSchemas.login), authController.login);

// GET /api/auth/me (Get current authenticated user)
router.get('/me', authenticateToken, authController.getCurrentUser);

// POST /api/auth/logout (Secure Session Termination - SEC-04)
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
