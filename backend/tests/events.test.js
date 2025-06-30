const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const Event = require('../models/event');
const eventRoutes = require('../api/events/events.routes');
const { protect } = require('../middleware/auth');

const {
  createTestUser,
  createTestAdmin,
  createTestEvent,
  createValidEventData,
  getUserAuthHeader,
  getAdminAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
  return app;
};

describe('Events API Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/events', () => {
    it('should get events list', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id, { title: 'Test Event 1' });
      await createTestEvent(admin._id, { title: 'Test Event 2' });

      const response = await request(app)
        .get('/api/events');

      expectSuccessResponse(response, 200);
      expect(response.body.events).toBeDefined();
    });

    it('should support pagination', async () => {
      const admin = await createTestAdmin();
      
      for (let i = 0; i < 5; i++) {
        await createTestEvent(admin._id, { title: `Event ${i}` });
      }

      const response = await request(app)
        .get('/api/events?page=1&limit=3');

      expectSuccessResponse(response, 200);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support search', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id, { 
        title: 'Searchable Concert Event' 
      });

      const response = await request(app)
        .get('/api/events?search=Searchable');

      expectSuccessResponse(response, 200);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get single event', async () => {
      const admin = await createTestAdmin();
      const event = await createTestEvent(admin._id);

      const response = await request(app)
        .get(`/api/events/${event._id}`);

      const body = expectSuccessResponse(response, 200);
      expect(body.event._id).toBe(event._id.toString());
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/events/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/events', () => {
    it('should create event as admin', async () => {
      const { Authorization, user } = await getAdminAuthHeader();
      const eventData = createValidEventData(user._id, {
        title: 'New Admin Event'
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', Authorization)
        .send(eventData);

      const body = expectSuccessResponse(response, 201);
      expect(body.event.title).toBe('New Admin Event');
    });

    it('should require authentication', async () => {
      const eventData = createValidEventData('507f1f77bcf86cd799439011');

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expectErrorResponse(response, 401);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event as organizer', async () => {
      const { Authorization, user } = await getUserAuthHeader();
      const event = await createTestEvent(user._id);

      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', Authorization)
        .send(updateData);

      const body = expectSuccessResponse(response, 200);
      expect(body.event.title).toBe('Updated Event Title');
    });

    it('should not allow update by non-organizer', async () => {
      const organizer = await createTestUser();
      const { Authorization } = await getUserAuthHeader(); // Different user
      const event = await createTestEvent(organizer._id);

      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', Authorization)
        .send(updateData);

      expectErrorResponse(response, 403);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event as admin', async () => {
      const { Authorization } = await getAdminAuthHeader();
      const admin = await createTestAdmin({ email: 'admin2@meumt.edu.tr' });
      const event = await createTestEvent(admin._id);

      const response = await request(app)
        .delete(`/api/events/${event._id}`)
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });

    it('should require admin role for deletion', async () => {
      const { Authorization } = await getUserAuthHeader();
      const user = await createTestUser();
      const event = await createTestEvent(user._id);

      const response = await request(app)
        .delete(`/api/events/${event._id}`)
        .set('Authorization', Authorization);

      expectErrorResponse(response, 403);
    });
  });

  describe('Event Registration', () => {
    it('should register user for event', async () => {
      const { Authorization, user } = await getUserAuthHeader();
      const organizer = await createTestUser({ email: 'organizer@meumt.edu.tr' });
      const event = await createTestEvent(organizer._id, {
        registrationRequired: true,
        maxRegistrations: 50
      });

      const response = await request(app)
        .post(`/api/events/${event._id}/register`)
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });

    it('should unregister user from event', async () => {
      const { Authorization, user } = await getUserAuthHeader();
      const organizer = await createTestUser({ email: 'organizer2@meumt.edu.tr' });
      const event = await createTestEvent(organizer._id, {
        registrationRequired: true,
        registrations: [{
          user: user._id,
          status: 'registered'
        }]
      });

      const response = await request(app)
        .delete(`/api/events/${event._id}/register`)
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id, { eventType: 'concert' });
      await createTestEvent(admin._id, { eventType: 'workshop' });

      const response = await request(app)
        .get('/api/events?eventType=concert');

      expectSuccessResponse(response, 200);
    });

    it('should filter events by date range', async () => {
      const admin = await createTestAdmin();
      const tomorrow = new Date(Date.now() + 86400000);
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      
      await createTestEvent(admin._id, { date: tomorrow });
      await createTestEvent(admin._id, { date: nextWeek });

      const response = await request(app)
        .get(`/api/events?startDate=${tomorrow.toISOString()}&endDate=${nextWeek.toISOString()}`);

      expectSuccessResponse(response, 200);
    });
  });
}); 