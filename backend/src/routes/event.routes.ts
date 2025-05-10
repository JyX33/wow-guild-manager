import express from "express";
import eventController from "../controllers/event.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all events for a guild
router.get("/guild/:guildId", authenticateJWT, eventController.getGuildEvents);

// Get a specific event by ID
router.get("/:eventId", authenticateJWT, eventController.getEventById);

// Create a new event
router.post("/", authenticateJWT, eventController.createEvent);

// Update an event
router.put("/:eventId", authenticateJWT, eventController.updateEvent);

// Delete an event
router.delete("/:eventId", authenticateJWT, eventController.deleteEvent);

// Subscribe to an event
router.post(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.subscribeToEvent,
);

// Update subscription status
router.put(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.updateSubscription,
);

// Get event subscribers
router.get(
  "/:eventId/subscribers",
  authenticateJWT,
  eventController.getEventSubscribers,
);

// Unsubscribe from an event
router.delete(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.unsubscribeFromEvent,
);

export default router;
