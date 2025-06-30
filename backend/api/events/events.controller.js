const Event = require('../../models/event');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { APIFeatures, formatResponse } = require('../../utils/apiFeatures');
const { invalidateCache } = require('../../middleware/cache');
const fs = require('fs').promises;
const path = require('path');
const eventService = require('../../services/eventService');
const mongoose = require('mongoose');

const getEvent = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Etkinlik bulunamadı' });
    }
    res.json(event);
  } catch (error) {
    logger.error('Etkinlik detayı getirilirken hata:', error);
    res.status(500).json({ message: 'Etkinlik detayı getirilirken bir hata oluştu' });
  }
};

const createNewEvent = async (req, res) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (error) {
    logger.error('Etkinlik oluşturulurken hata:', error);
    res.status(500).json({ message: 'Etkinlik oluşturulurken bir hata oluştu' });
  }
};

const updateEventDetails = async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ message: 'Etkinlik bulunamadı' });
    }
    res.json(event);
  } catch (error) {
    logger.error('Etkinlik güncellenirken hata:', error);
    res.status(500).json({ message: 'Etkinlik güncellenirken bir hata oluştu' });
  }
};

const removeEvent = async (req, res) => {
  try {
    const event = await eventService.deleteEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Etkinlik bulunamadı' });
    }
    res.json({ message: 'Etkinlik başarıyla silindi' });
  } catch (error) {
    logger.error('Etkinlik silinirken hata:', error);
    res.status(500).json({ message: 'Etkinlik silinirken bir hata oluştu' });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    if (event.participants.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    event.participants.push(req.user.id);
    await event.save();

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error registering for event:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering for event'
    });
  }
};

const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!event.participants.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Not registered for this event'
      });
    }

    event.participants = event.participants.filter(
      participant => participant.toString() !== req.user.id
    );
    await event.save();

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error unregistering from event:', error);
    res.status(500).json({
      success: false,
      message: 'Error unregistering from event'
    });
  }
};

const getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.user', 'firstName lastName email phone studentNumber department');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Etkinlik bulunamadı'
      });
    }

    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu etkinliğin kayıtlarını görme yetkiniz yok'
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        registrations: event.registrations,
        count: event.registrations.length
      }
    });
  } catch (error) {
    logger.error('Get event registrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const addEventFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Etkinlik bulunamadı'
      });
    }

    if (event.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Sadece tamamlanmış etkinliklere değerlendirme yapabilirsiniz'
      });
    }

    const existingFeedback = event.feedback.find(
      feedback => feedback.user.toString() === req.user.id
    );

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        error: 'Bu etkinlik için zaten değerlendirme yapmışsınız'
      });
    }

    event.feedback.push({
      user: req.user.id,
      rating,
      comment
    });

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Değerlendirmeniz kaydedildi'
    });
  } catch (error) {
    logger.error('Add event feedback error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const getUpcomingEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    
    const events = await Event.getUpcomingEvents(limit);

    res.status(200).json({
      success: true,
      count: events.length,
      data: { events }
    });
  } catch (error) {
    logger.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getFeaturedEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    
    const events = await Event.getFeaturedEvents(limit);

    res.status(200).json({
      success: true,
      count: events.length,
      data: { events }
    });
  } catch (error) {
    logger.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const uploadEventImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir resim yükleyin'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı'
      });
    }

    event.image = req.file.path;
    await event.save();

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Resim yüklenirken bir hata oluştu',
      error: error.message
    });
  }
};

const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({
      isPublic: true,
      date: { $gte: new Date() }
    }).sort({ date: 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error('Get public events error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

module.exports = {
  getEvent,
  createNewEvent,
  updateEventDetails,
  removeEvent,
  registerForEvent,
  unregisterFromEvent,
  getEventRegistrations,
  addEventFeedback,
  getUpcomingEvents,
  getFeaturedEvents,
  uploadEventImage,
  getPublicEvents
}; 