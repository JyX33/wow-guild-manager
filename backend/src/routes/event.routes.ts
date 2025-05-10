import express from "express";
import eventController from "../controllers/event.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all events for a guild
router.get("/guild/:guildId", authenticateJWT, eventController.getGuildEvents as express.RequestHandler);

// Get a specific event by ID
router.get("/:eventId", authenticateJWT, eventController.getEventById as express.RequestHandler);

// Create a new event
router.post("/", authenticateJWT, eventController.createEvent as express.RequestHandler);

// Update an event
router.put("/:eventId", authenticateJWT, eventController.updateEvent as express.RequestHandler);

// Delete an event
router.delete("/:eventId", authenticateJWT, eventController.deleteEvent as express.RequestHandler);

// Subscribe to an event
router.post(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.subscribeToEvent as express.RequestHandler,
);

// Update subscription status
router.put(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.updateSubscription as express.RequestHandler,
);

// Get event subscribers
router.get(
  "/:eventId/subscribers",
  authenticateJWT,
  eventController.getEventSubscribers as express.RequestHandler,
);

// Unsubscribe from an event
router.delete(
  "/:eventId/subscribe",
  authenticateJWT,
  eventController.unsubscribeFromEvent as express.RequestHandler,
);

export default router;
