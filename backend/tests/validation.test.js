const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const Event = require('../models/event');
const Contact = require('../models/contact');

const {
  createValidUserData,
  createValidEventData,
  createValidContactData,
  createTestUser,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.post('/test/user', async (req, res) => {
    try {
      const user = new User(req.body);
      await user.validate();
      res.json({ success: true, message: 'Validation passed' });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error.message,
        errors: error.errors 
      });
    }
  });

  app.post('/test/event', async (req, res) => {
    try {
      const event = new Event(req.body);
      await event.validate();
      res.json({ success: true, message: 'Validation passed' });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error.message,
        errors: error.errors 
      });
    }
  });

  app.post('/test/contact', async (req, res) => {
    try {
      const contact = new Contact(req.body);
      await contact.validate();
      res.json({ success: true, message: 'Validation passed' });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error.message,
        errors: error.errors 
      });
    }
  });

  return app;
};

describe('Validation Middleware', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('User Validation', () => {
    it('should pass with valid user data', async () => {
      const validData = createValidUserData();

      const response = await request(app)
        .post('/test/user')
        .send(validData);

      expectSuccessResponse(response, 200);
    });

    it('should fail with invalid email', async () => {
      const invalidData = createValidUserData({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should fail with short password', async () => {
      const invalidData = createValidUserData({
        password: '123'
      });

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should fail with missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should fail without TC Kimlik or Student Number', async () => {
      const invalidData = createValidUserData();
      delete invalidData.tcKimlikNo;
      delete invalidData.studentNumber;

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('TC Kimlik No veya Öğrenci Numarası');
    });

    it('should validate TC Kimlik format', async () => {
      const invalidData = createValidUserData({
        tcKimlikNo: 'invalid-tc'
      });

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });
  });

  describe('Event Validation', () => {
    it('should pass with valid event data', async () => {
      const user = await createTestUser();
      const validData = createValidEventData(user._id);

      const response = await request(app)
        .post('/test/event')
        .send(validData);

      expectSuccessResponse(response, 200);
    });

    it('should fail with invalid event type', async () => {
      const user = await createTestUser();
      const invalidData = createValidEventData(user._id, {
        eventType: 'invalid-type'
      });

      const response = await request(app)
        .post('/test/event')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should fail with missing required fields', async () => {
      const invalidData = {
        title: 'Test Event'
      };

      const response = await request(app)
        .post('/test/event')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should require location name', async () => {
      const user = await createTestUser();
      const invalidData = createValidEventData(user._id);
      invalidData.location = { address: 'Test Address' }; // Missing name

      const response = await request(app)
        .post('/test/event')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should validate capacity minimum', async () => {
      const user = await createTestUser();
      const invalidData = createValidEventData(user._id, {
        capacity: -5
      });

      const response = await request(app)
        .post('/test/event')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });
  });

  describe('Contact Validation', () => {
    it('should pass with valid contact data', async () => {
      const validData = createValidContactData();

      const response = await request(app)
        .post('/test/contact')
        .send(validData);

      expectSuccessResponse(response, 200);
    });

    it('should fail with missing message', async () => {
      const invalidData = createValidContactData();
      delete invalidData.message;

      const response = await request(app)
        .post('/test/contact')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should fail with invalid email', async () => {
      const invalidData = createValidContactData({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/test/contact')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should validate phone format', async () => {
      const invalidData = createValidContactData({
        phone: 'invalid-phone'
      });

      const response = await request(app)
        .post('/test/contact')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should validate category enum', async () => {
      const invalidData = createValidContactData({
        category: 'invalid-category'
      });

      const response = await request(app)
        .post('/test/contact')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });
  });

  describe('Field Length Validation', () => {
    it('should validate maximum field lengths', async () => {
      const invalidData = createValidUserData({
        firstName: 'A'.repeat(101) // Too long
      });

      const response = await request(app)
        .post('/test/user')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });

    it('should validate event title length', async () => {
      const user = await createTestUser();
      const invalidData = createValidEventData(user._id, {
        title: 'A'.repeat(101) // Too long
      });

      const response = await request(app)
        .post('/test/event')
        .send(invalidData);

      expectErrorResponse(response, 400);
    });
  });

  describe('Special Character Validation', () => {
    it('should handle special characters in names', async () => {
      const validData = createValidUserData({
        firstName: 'Ömer',
        lastName: 'Çağlar'
      });

      const response = await request(app)
        .post('/test/user')
        .send(validData);

      expectSuccessResponse(response, 200);
    });

    it('should trim whitespace from fields', async () => {
      const dataWithWhitespace = createValidUserData({
        firstName: '  Test  ',
        lastName: '  User  '
      });

      const response = await request(app)
        .post('/test/user')
        .send(dataWithWhitespace);

      expectSuccessResponse(response, 200);
    });
  });
}); 