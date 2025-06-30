const Event = require('../models/event');
const logger = require('../utils/logger');

const createEvent = async (eventData) => {
  try {
    const event = await Event.create(eventData);
    return event;
  } catch (error) {
    logger.error('Error creating event:', error);
    throw error;
  }
};

const getAllEvents = async (query = {}) => {
  try {
    const events = await Event.find(query);
    return events;
  } catch (error) {
    logger.error('Error getting events:', error);
    throw error;
  }
};

const getEventById = async (id) => {
  try {
    const event = await Event.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  } catch (error) {
    logger.error(`Error getting event with id ${id}:`, error);
    throw error;
  }
};

const updateEvent = async (id, updateData) => {
  try {
    const event = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  } catch (error) {
    logger.error(`Error updating event with id ${id}:`, error);
    throw error;
  }
};

const deleteEvent = async (id) => {
  try {
    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  } catch (error) {
    logger.error(`Error deleting event with id ${id}:`, error);
    throw error;
  }
};

const addEventParticipant = async (eventId, userId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (event.participants.includes(userId)) {
      throw new Error('User already registered for this event');
    }
    
    event.participants.push(userId);
    await event.save();
    return event;
  } catch (error) {
    logger.error(`Error adding participant to event ${eventId}:`, error);
    throw error;
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addEventParticipant
}; 