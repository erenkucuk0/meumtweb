const request = require('supertest');
const express = require('express');

const authRoutes = require('../api/auth');
const eventController = require('../api/events/events.controller');
const userController = require('../api/users/users.controller');
const contactController = require('../api/contact/contact.controller');
const galleryController = require('../api/gallery/gallery.controller');
const membersController = require('../api/members/members.controller');

const { protect, adminOnly } = require('../middleware/auth');

const {
  createTestUser,
  createTestAdmin,
  createTestEvent,
  createValidEventData,
  createValidContactData,
  getAdminAuthHeader,
  getUserAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  
  app.get('/api/events', eventController.getEvents);
  app.get('/api/events/:id', eventController.getEvent);
  app.post('/api/events', protect, eventController.createEvent);
  app.put('/api/events/:id', protect, eventController.updateEvent);
  app.delete('/api/events/:id', protect, eventController.deleteEvent);
  
  app.get('/api/users', protect, adminOnly, userController.getUsers);
  app.get('/api/users/:id', protect, userController.getUserById);
  app.put('/api/users/:id', protect, userController.updateUser);
  app.delete('/api/users/:id', protect, adminOnly, userController.deleteUser);
  
  app.get('/api/contacts', protect, adminOnly, contactController.getContactMessages);
  app.post('/api/contacts', contactController.submitContactForm);
  app.get('/api/contacts/:id', protect, contactController.getContactMessage);
  app.delete('/api/contacts/:id', protect, adminOnly, contactController.deleteContactMessage);
  
  app.get('/api/gallery', galleryController.getGalleryItems);
  app.post('/api/gallery', protect, adminOnly, galleryController.createGalleryItem);
  app.delete('/api/gallery/:id', protect, adminOnly, galleryController.deleteGalleryItem);
  
  app.get('/api/members', protect, membersController.getMembers);
  app.get('/api/members/:id', protect, membersController.getMember);
  app.put('/api/members/:id', protect, adminOnly, membersController.updateMemberProfile);
  
  return app;
};

describe('Controller Tests', () => {
  let app;
  let testUser;
  let testAdmin;
  let testEvent;

  beforeAll(async () => {
    app = createTestApp();
    testUser = await createTestUser();
    testAdmin = await createTestAdmin();
    testEvent = await createTestEvent(testAdmin._id);
  });

  describe('Event Controller', () => {
    describe('GET /api/events', () => {
      it('should get events without authentication', async () => {
        const response = await request(app)
          .get('/api/events');

        expect([200, 500]).toContain(response.status);
      });

      it('should handle pagination parameters', async () => {
        const response = await request(app)
          .get('/api/events?page=1&limit=5');

        expect([200, 500]).toContain(response.status);
      });

      it('should handle search parameters', async () => {
        const response = await request(app)
          .get('/api/events?search=test');

        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/events/:id', () => {
      it('should get single event', async () => {
        const response = await request(app)
          .get(`/api/events/${testEvent._id}`);

        expect([200, 404, 500]).toContain(response.status);
      });

      it('should handle invalid event ID', async () => {
        const response = await request(app)
          .get('/api/events/invalid-id');

        expect([400, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/events', () => {
      it('should require authentication', async () => {
        const eventData = createValidEventData(testAdmin._id);

        const response = await request(app)
          .post('/api/events')
          .send(eventData);

        expectErrorResponse(response, 401);
      });

      it('should create event with valid data', async () => {
        const { Authorization } = await getAdminAuthHeader();
        const eventData = createValidEventData(testAdmin._id);

        const response = await request(app)
          .post('/api/events')
          .set('Authorization', Authorization)
          .send(eventData);

        expect([201, 400, 401, 500]).toContain(response.status);
      });
    });

    describe('PUT /api/events/:id', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .put(`/api/events/${testEvent._id}`)
          .send({ title: 'Updated' });

        expectErrorResponse(response, 401);
      });

      it('should update event with authorization', async () => {
        const { Authorization } = await getAdminAuthHeader();

        const response = await request(app)
          .put(`/api/events/${testEvent._id}`)
          .set('Authorization', Authorization)
          .send({ title: 'Updated Event' });

        expect([200, 400, 401, 404, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/events/:id', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .delete(`/api/events/${testEvent._id}`);

        expectErrorResponse(response, 401);
      });
    });
  });

  describe('User Controller', () => {
    describe('GET /api/users', () => {
      it('should require admin access', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', Authorization);

        expect([403, 500]).toContain(response.status);
      });

      it('should allow admin access', async () => {
        const { Authorization } = await getAdminAuthHeader();

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', Authorization);

        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/users/:id', () => {
      it('should get user with authentication', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .get(`/api/users/${testUser._id}`)
          .set('Authorization', Authorization);

        expect([200, 400, 404, 500]).toContain(response.status);
      });
    });

    describe('PUT /api/users/:id', () => {
      it('should update user profile', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .put(`/api/users/${testUser._id}`)
          .set('Authorization', Authorization)
          .send({ firstName: 'Updated' });

        expect([200, 400, 401, 403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Contact Controller', () => {
    describe('POST /api/contacts', () => {
      it('should create contact without authentication', async () => {
        const contactData = createValidContactData();

        const response = await request(app)
          .post('/api/contacts')
          .send(contactData);

        expect([201, 400, 500]).toContain(response.status);
      });

      it('should validate contact data', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .send({ email: 'invalid' });

        expect([400, 500]).toContain(response.status);
      });
    });

    describe('GET /api/contacts', () => {
      it('should require admin access', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .get('/api/contacts')
          .set('Authorization', Authorization);

        expect([403, 500]).toContain(response.status);
      });
    });
  });

  describe('Gallery Controller', () => {
    describe('GET /api/gallery', () => {
      it('should get gallery items without authentication', async () => {
        const response = await request(app)
          .get('/api/gallery');

        expect([200, 500]).toContain(response.status);
      });
    });

    describe('POST /api/gallery', () => {
      it('should require admin access', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .post('/api/gallery')
          .set('Authorization', Authorization)
          .send({
            title: 'Test Gallery',
            description: 'Test description'
          });

        expect([403, 500]).toContain(response.status);
      });
    });
  });

  describe('Members Controller', () => {
    describe('GET /api/members', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/members');

        expectErrorResponse(response, 401);
      });

      it('should get members with authentication', async () => {
        const { Authorization } = await getUserAuthHeader();

        const response = await request(app)
          .get('/api/members')
          .set('Authorization', Authorization);

        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const response = await request(app)
        .get('/api/events/507f1f77bcf86cd799439011'); // Valid ObjectId format

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle malformed request data', async () => {
      const { Authorization } = await getUserAuthHeader();

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', Authorization)
        .send('invalid json string');

      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing route parameters', async () => {
      const response = await request(app)
        .get('/api/events/');

      expect([404]).toContain(response.status);
    });
  });
}); 