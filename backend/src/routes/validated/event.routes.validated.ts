import express from "express";
import eventController from "../../controllers/event.controller.js";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { validate, ValidateTarget } from "../../middleware/validation.middleware.js";
import {
  guildIdParamSchema,
  eventIdParamSchema,
  createEventSchema,
  updateEventSchema,
  rsvpSchema
} from "../../schemas/index.js";
import { unwrapZodSchema } from "../../utils/zod-express.js";

const router = express.Router();

// Get all events for a guild
router.get(
  "/guild/:guildId", 
  authenticateJWT, 
  validate(guildIdParamSchema, ValidateTarget.PARAMS),
  eventController.getGuildEvents as express.RequestHandler
);

// Get a specific event by ID
router.get(
  "/:eventId", 
  authenticateJWT, 
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  eventController.getEventById as express.RequestHandler
);

// Create a new event
router.post(
  "/",
  authenticateJWT,
  validate(unwrapZodSchema(createEventSchema), ValidateTarget.BODY),
  eventController.createEvent as express.RequestHandler
);

// Update an event
router.put(
  "/:eventId",
  authenticateJWT,
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  validate(unwrapZodSchema(updateEventSchema), ValidateTarget.BODY),
  eventController.updateEvent as express.RequestHandler
);

// Delete an event
router.delete(
  "/:eventId", 
  authenticateJWT, 
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  eventController.deleteEvent as express.RequestHandler
);

// Subscribe to an event
router.post(
  "/:eventId/subscribe",
  authenticateJWT,
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  validate(rsvpSchema, ValidateTarget.BODY),
  eventController.subscribeToEvent as express.RequestHandler
);

// Update subscription status
router.put(
  "/:eventId/subscribe",
  authenticateJWT,
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  validate(rsvpSchema, ValidateTarget.BODY),
  eventController.updateSubscription as express.RequestHandler
);

// Get event subscribers
router.get(
  "/:eventId/subscribers",
  authenticateJWT,
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  eventController.getEventSubscribers as express.RequestHandler
);

// Unsubscribe from an event
router.delete(
  "/:eventId/subscribe",
  authenticateJWT,
  validate(eventIdParamSchema, ValidateTarget.PARAMS),
  eventController.unsubscribeFromEvent as express.RequestHandler
);

export default router;