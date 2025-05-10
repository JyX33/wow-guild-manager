import { Request, Response } from "express";
import { AppError, asyncHandler } from "../utils/error-handler.js";
import { ErrorCode } from "../../../shared/types/error.js";
import eventModel from "../models/event.model.js";
import subscriptionModel from "../models/subscription.model.js";
import {
  Event,
  EventFormValues,
  EventSubscription,
} from "../../../shared/types/event.js";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

import { UserRole, UserWithTokens } from "../../../shared/types/user.js"; // Ensure UserWithTokens and UserRole are imported
import { postEventToDiscord } from "../modules/discord/eventIntegration.js";
import logger from "../utils/logger.js";

interface EventRequest extends Request {
  body: EventFormValues;
  user: UserWithTokens; // Use the correct type
}

interface SubscriptionRequest extends Request {
  body: Omit<EventSubscription, "id" | "event_id" | "user_id">;
  user: UserWithTokens; // Use the correct type
}

export default {
  getEventById: asyncHandler(
    async (
      req: Request<{ eventId: string }>,
      res: Response<ApiResponse<Event>>,
    ) => {
      const { eventId } = req.params;

      const event = await eventModel.findById(parseInt(eventId));

      if (!event) {
        throw new AppError("Event not found", 404, {
          code: ErrorCode.NOT_FOUND,
          request: req,
        });
      }

      res.json({
        success: true,
        data: event,
      });
    },
  ),

  getGuildEvents: asyncHandler(
    async (
      req: Request<{ guildId: string }>,
      res: Response<ApiResponse<Event[]>>,
    ) => {
      const { guildId } = req.params;

      const events = await eventModel.findByGuildId(parseInt(guildId));

      res.json({
        success: true,
        data: events,
      });
    },
  ),

  createEvent: asyncHandler(
    async (req: EventRequest, res: Response<ApiResponse<Event>>) => {
      if (!req.body.guild_id || !req.body.title || !req.body.start_time) {
        throw new AppError("Missing required event fields", 400, {
          code: ErrorCode.VALIDATION_ERROR,
          request: req,
        });
      }

      const eventData: EventFormValues & { created_by: number } = {
        ...req.body,
        created_by: req.user.id,
        event_details: req.body.event_details || {},
      };

      const event = await eventModel.create(eventData);

      if (event) {
        logger.info(`Event ${event.id} created, triggering Discord post.`);
        postEventToDiscord(event).catch((err: unknown) => {
          logger.error(
            { err, eventId: event.id },
            "Error triggering postEventToDiscord after creation (background task)",
          );
        });
      }

      if (!event) {
        throw new AppError("Failed to create event", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.status(201).json({
        success: true,
        data: event,
      });
    },
  ),

  updateEvent: asyncHandler(
    async (
      req: EventRequest & { params: { eventId: string } },
      res: Response<ApiResponse<Event>>,
    ) => {
      const { eventId } = req.params;

      const existingEvent = await eventModel.findById(parseInt(eventId));

      if (!existingEvent) {
        throw new AppError("Event not found", 404, {
          code: ErrorCode.NOT_FOUND,
          request: req,
        });
      }

      // Authorization: ADMIN can update any event, USER can only update their own
      if (req.user.role === UserRole.USER) {
        if (existingEvent.created_by !== req.user.id) {
          throw new AppError(
            "Forbidden: You do not have permission to update this event",
            403,
            {
              code: ErrorCode.FORBIDDEN,
              request: req,
            },
          );
        }
      }
      // If ADMIN, bypass ownership check

      const updatedEvent = await eventModel.update(parseInt(eventId), req.body);

      if (updatedEvent) {
        logger.info(
          `Event ${updatedEvent.id} updated, triggering Discord post.`,
        );
        postEventToDiscord(updatedEvent).catch((err: unknown) => {
          logger.error(
            { err, eventId: updatedEvent.id },
            "Error triggering postEventToDiscord after update (background task)",
          );
        });
      }

      if (!updatedEvent) {
        throw new AppError("Failed to update event", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.json({
        success: true,
        data: updatedEvent,
      });
    },
  ),

  deleteEvent: asyncHandler(
    async (
      req: Request<{ eventId: string }> & { user: { id: number } },
      res: Response<ApiResponse<Event>>,
    ) => {
      const { eventId } = req.params;

      const existingEvent = await eventModel.findById(parseInt(eventId));

      if (!existingEvent) {
        throw new AppError("Event not found", 404, {
          code: ErrorCode.NOT_FOUND,
          request: req,
        });
      }

      // Authorization: ADMIN can delete any event, USER can only delete their own
      if (req.user.role === UserRole.USER) {
        if (existingEvent.created_by !== req.user.id) {
          throw new AppError(
            "Forbidden: You do not have permission to delete this event",
            403,
            {
              code: ErrorCode.FORBIDDEN,
              request: req,
            },
          );
        }
      }
      // If ADMIN, bypass ownership check

      const deletedEvent = await eventModel.deleteEvent(parseInt(eventId));

      if (!deletedEvent) {
        throw new AppError("Failed to delete event", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.json({
        success: true,
        data: deletedEvent,
      });
    },
  ),

  subscribeToEvent: asyncHandler(
    async (
      req: SubscriptionRequest & { params: { eventId: string } },
      res: Response<ApiResponse<EventSubscription>>,
    ) => {
      const { eventId } = req.params;

      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id,
      );

      if (existingSubscription) {
        throw new AppError("Already subscribed to this event", 400, {
          code: ErrorCode.VALIDATION_ERROR,
          request: req,
        });
      }

      const subscriptionData: Omit<EventSubscription, "id"> = {
        event_id: parseInt(eventId),
        user_id: req.user.id,
        ...req.body,
      };

      const subscription = await subscriptionModel.create(subscriptionData);

      if (!subscription) {
        throw new AppError("Failed to create subscription", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.status(201).json({
        success: true,
        data: subscription,
      });
    },
  ),

  updateSubscription: asyncHandler(
    async (
      req: SubscriptionRequest & { params: { eventId: string } },
      res: Response<ApiResponse<EventSubscription>>,
    ) => {
      const { eventId } = req.params;

      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id,
      );

      if (!existingSubscription) {
        throw new AppError("Subscription not found", 404, {
          code: ErrorCode.NOT_FOUND,
          request: req,
        });
      }

      const updatedSubscription = await subscriptionModel.update(
        existingSubscription.id,
        req.body,
      );

      if (!updatedSubscription) {
        throw new AppError("Failed to update subscription", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.json({
        success: true,
        data: updatedSubscription,
      });
    },
  ),

  getEventSubscribers: asyncHandler(
    async (
      req: Request<{ eventId: string }>,
      res: Response<ApiResponse<EventSubscription[]>>,
    ) => {
      const { eventId } = req.params;

      const subscribers = await subscriptionModel.findByEventId(
        parseInt(eventId),
      );

      res.json({
        success: true,
        data: subscribers,
      });
    },
  ), // Closing the getEventSubscribers function definition

  unsubscribeFromEvent: asyncHandler(
    async (
      req: Request<{ eventId: string }> & { user: { id: number } },
      res: Response<ApiResponse<{ message: string }>>,
    ) => {
      const { eventId } = req.params;
      const userId = req.user.id;

      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        userId,
      );

      if (!existingSubscription) {
        throw new AppError("Subscription not found", 404, {
          code: ErrorCode.NOT_FOUND,
          request: req,
        });
      }

      const deleted = await subscriptionModel.delete(existingSubscription.id);

      if (!deleted) {
        throw new AppError("Failed to delete subscription", 500, {
          code: ErrorCode.DATABASE_ERROR,
          request: req,
        });
      }

      res.json({
        success: true,
        data: { message: "Successfully unsubscribed from event" },
      });
    },
  ),
};
