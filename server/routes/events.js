const express = require('express');
const eventController = require('../controllers/eventController');
const { authenticateToken, optionalAuthenticate, authorizeRoles } = require('../middleware/auth');
const { validatePayload, validateParams, eventSchemas } = require('../middleware/validate');

const router = express.Router();

router.get('/', eventController.listEvents);
router.get('/:id', validateParams('id'), optionalAuthenticate, eventController.getEventDetails);
router.post('/', authenticateToken, authorizeRoles('organizer', 'admin'), validatePayload(eventSchemas.create), eventController.createEvent);
router.put('/:id', validateParams('id'), authenticateToken, authorizeRoles('organizer', 'admin'), validatePayload(eventSchemas.update), eventController.updateEvent);
router.delete('/:id', validateParams('id'), authenticateToken, authorizeRoles('organizer', 'admin'), eventController.deleteEvent);
router.post('/:id/register', validateParams('id'), authenticateToken, eventController.registerForEvent);
router.delete('/:id/register', validateParams('id'), authenticateToken, eventController.cancelRegistration);
router.get('/:id/participants', validateParams('id'), authenticateToken, authorizeRoles('organizer', 'admin'), eventController.getParticipants);
router.post('/:id/updates', validateParams('id'), authenticateToken, authorizeRoles('organizer', 'admin'), validatePayload(eventSchemas.announcement), eventController.sendUpdate);
router.get('/:id/report', validateParams('id'), authenticateToken, authorizeRoles('organizer', 'admin'), eventController.getReport);

module.exports = router;