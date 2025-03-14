import { Request, Response } from 'express';
import eventModel from '../models/event.model';
import subscriptionModel from '../models/subscription.model';

export default {
  getEventById: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const event = await eventModel.findById(parseInt(eventId));
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Get event by ID error:', error);
      res.status(500).json({ error: 'Failed to get event' });
    }
  },
  
  getGuildEvents: async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      
      const events = await eventModel.findByGuildId(parseInt(guildId));
      
      res.json(events);
    } catch (error) {
      console.error('Get guild events error:', error);
      res.status(500).json({ error: 'Failed to get guild events' });
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
      
      res.status(201).json(event);
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },
  
  updateEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const updatedEvent = await eventModel.update(parseInt(eventId), req.body);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  },
  
  deleteEvent: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event exists and user has permission
      const existingEvent = await eventModel.findById(parseInt(eventId));
      
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (existingEvent.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const deletedEvent = await eventModel.delete(parseInt(eventId));
      
      res.json(deletedEvent);
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
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
        return res.status(400).json({ error: 'Already subscribed to this event' });
      }
      
      const subscriptionData = {
        event_id: parseInt(eventId),
        user_id: req.user.id,
        ...req.body
      };
      
      const subscription = await subscriptionModel.create(subscriptionData);
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Subscribe to event error:', error);
      res.status(500).json({ error: 'Failed to subscribe to event' });
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
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const updatedSubscription = await subscriptionModel.update(
        existingSubscription.id,
        req.body
      );
      
      res.json(updatedSubscription);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  },
  
  getEventSubscribers: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const subscribers = await subscriptionModel.findByEventId(parseInt(eventId));
      
      res.json(subscribers);
    } catch (error) {
      console.error('Get event subscribers error:', error);
      res.status(500).json({ error: 'Failed to get event subscribers' });
    }
  }
};