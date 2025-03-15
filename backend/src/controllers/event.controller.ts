import { Request, Response } from 'express';
import eventModel from '../models/event.model';
import subscriptionModel from '../models/subscription.model';

export default {
  getEventById: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const event = await eventModel.findById(parseInt(eventId));
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Event not found',
            status: 404
          }
        });
      }
      
      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Get event by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get event',
          status: 500
        }
      });
    }
  },
  
  getGuildEvents: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const events = await eventModel.findByGuildId(parseInt(guildId));
      
      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Get guild events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get guild events',
          status: 500
        }
      });
    }
  },
  
  createEvent: async (req: Request, res: Response) => {
    try {
      console.log('Creating event with data:', req.body);
      
      const eventData = {
        ...req.body,
        created_by: req.user.id,
        // Initialize empty event_details if not provided
        event_details: req.body.event_details || {}
      };
      
      console.log('Processed event data:', eventData);
      const event = await eventModel.create(eventData);
      console.log('Event created successfully:', event);
      
      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create event',
          status: 500
        }
      });
    }
  },
  
  updateEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Event not found',
            status: 404
          }
        });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Permission denied',
            status: 403
          }
        });
      }
      
      const updatedEvent = await eventModel.update(parseInt(eventId), req.body);
      
      res.json({
        success: true,
        data: updatedEvent
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update event',
          status: 500
        }
      });
    }
  },
  
  deleteEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Event not found',
            status: 404
          }
        });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Permission denied',
            status: 403
          }
        });
      }
      
      const deletedEvent = await eventModel.deleteEvent(parseInt(eventId));
      
      res.json({
        success: true,
        data: deletedEvent
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete event',
          status: 500
        }
      });
    }
  },
  
  subscribeToEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Check if user is already subscribed
      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id
      );
      
      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Already subscribed to this event',
            status: 400
          }
        });
      }
      
      const subscriptionData = {
        event_id: parseInt(eventId),
        user_id: req.user.id,
        ...req.body
      };
      
      const subscription = await subscriptionModel.create(subscriptionData);
      
      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Subscribe to event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to subscribe to event',
          status: 500
        }
      });
    }
  },
  
  updateSubscription: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Get existing subscription
      const existingSubscription = await subscriptionModel.findByEventAndUser(
        parseInt(eventId),
        req.user.id
      );
      
      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Subscription not found',
            status: 404
          }
        });
      }
      
      const updatedSubscription = await subscriptionModel.update(
        existingSubscription.id,
        req.body
      );
      
      res.json({
        success: true,
        data: updatedSubscription
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update subscription',
          status: 500
        }
      });
    }
  },
  
  getEventSubscribers: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const subscribers = await subscriptionModel.findByEventId(parseInt(eventId));
      
      res.json({
        success: true,
        data: subscribers
      });
    } catch (error) {
      console.error('Get event subscribers error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get event subscribers',
          status: 500
        }
      });
    }
  }
};