import express from 'express';
import eventController from '../controllers/event.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Get all events for a guild
router.get('/guild/:guildId', authMiddleware.authenticate, eventController.getGuildEvents);

// Get a specific event by ID
router.get('/:eventId', authMiddleware.authenticate, eventController.getEventById);

// Create a new event
router.post('/', authMiddleware.authenticate, eventController.createEvent);

// Update an event
router.put('/:eventId', authMiddleware.authenticate, eventController.updateEvent);

// Delete an event
router.delete('/:eventId', authMiddleware.authenticate, eventController.deleteEvent);

// Subscribe to an event
router.post('/:eventId/subscribe', authMiddleware.authenticate, eventController.subscribeToEvent);

// Update subscription status
router.put('/:eventId/subscribe', authMiddleware.authenticate, eventController.updateSubscription);

// Get event subscribers
router.get('/:eventId/subscribers', authMiddleware.authenticate, eventController.getEventSubscribers);

export default router;