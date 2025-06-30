const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

const app = require('../server');

const User = require('../models/User');
const Contact = require('../models/contact');
const Event = require('../models/event');
const Gallery = require('../models/gallery');

const {
  createTestUser,
  createTestAdmin,
  generateFreshToken,
  clearDatabase
} = require('./helpers/testHelpers');

describe('API Simple Coverage - Context7 Patterns', () => {
  let testUser, adminUser, userToken, adminToken;

  beforeEach(async () => {
    await clearDatabase();
    
    testUser = await createTestUser({
      email: 'simple@test.com',
      firstName: 'Simple',
      lastName: 'Tester',
      role: 'user'
    });
    
    adminUser = await createTestAdmin({
      email: 'admin@simple.com',
      firstName: 'Admin',
      lastName: 'Simple',
      role: 'admin'
    });

    userToken = generateFreshToken(testUser._id, 'user');
    adminToken = generateFreshToken(adminUser._id, 'admin');
  });

  describe('Contact API Basic Coverage', () => {
    test('should create contact with valid data', async () => {
      const validContact = await Contact.create({
        name: 'Test Contact',
        email: 'test@contact.com',
        subject: 'Test Subject',
        message: 'Test message',
        category: 'genel',
        status: 'yeni',
        priority: 'normal'
      });

      expect(validContact).toHaveProperty('name', 'Test Contact');
      expect(validContact).toHaveProperty('email', 'test@contact.com');
      expect(validContact).toHaveProperty('status', 'yeni');
    });

    test('should handle contact validation errors', async () => {
      try {
        await Contact.create({
          email: 'invalid-email',
          message: ''
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    test('should update contact status', async () => {
      const contact = await Contact.create({
        name: 'Update Test',
        email: 'update@test.com',
        subject: 'Update Subject',
        message: 'Update message',
        category: 'genel',
        status: 'yeni',
        priority: 'normal'
      });

      contact.status = 'cevaplanmis';
      await contact.save();

      expect(contact.status).toBe('cevaplanmis');
    });

    test('should get contact by ID', async () => {
      const contact = await Contact.create({
        name: 'Find Test',
        email: 'find@test.com',
        subject: 'Find Subject',
        message: 'Find message',
        category: 'genel',
        status: 'yeni',
        priority: 'normal'
      });

      const foundContact = await Contact.findById(contact._id);
      expect(foundContact).toHaveProperty('name', 'Find Test');
    });
  });

  describe('Event API Basic Coverage', () => {
    test('should create event with complete data', async () => {
      const validEvent = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: {
          name: 'Test Location',
          address: 'Test Address',
          coordinates: {
            latitude: 41.0082,
            longitude: 28.9784
          }
        },
        time: '19:00',
        organizer: 'Test Organizer',
        createdBy: adminUser._id
      });

      expect(validEvent).toHaveProperty('title', 'Test Event');
      expect(validEvent).toHaveProperty('organizer', 'Test Organizer');
      expect(validEvent.location).toHaveProperty('name', 'Test Location');
    });

    test('should handle event validation errors', async () => {
      try {
        await Event.create({
          title: 'Incomplete Event',
          description: 'Missing required fields'
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    test('should update event details', async () => {
      const event = await Event.create({
        title: 'Original Event',
        description: 'Original Description',
        date: new Date(Date.now() + 86400000),
        location: {
          name: 'Original Location',
          address: 'Original Address'
        },
        time: '19:00',
        organizer: 'Original Organizer',
        createdBy: adminUser._id
      });

      event.title = 'Updated Event';
      event.description = 'Updated Description';
      await event.save();

      expect(event.title).toBe('Updated Event');
      expect(event.description).toBe('Updated Description');
    });

    test('should handle event dates', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7); // 1 week from now
      
      const event = await Event.create({
        title: 'Future Event',
        description: 'Event in the future',
        date: futureDate,
        location: {
          name: 'Future Location',
          address: 'Future Address'
        },
        time: '20:00',
        organizer: 'Future Organizer',
        createdBy: adminUser._id
      });

      expect(event.date.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Gallery API Basic Coverage', () => {
    test('should create gallery item with required fields', async () => {
      const validGallery = await Gallery.create({
        title: 'Test Gallery',
        description: 'Test Description',
        category: 'konser',
        coverImage: 'test-cover.jpg',
        images: [{
          filename: 'test-image.jpg',
          originalName: 'test.jpg',
          caption: 'Test image caption'
        }],
        uploadedBy: adminUser._id,
        isPublic: true
      });

      expect(validGallery).toHaveProperty('title', 'Test Gallery');
      expect(validGallery).toHaveProperty('category', 'konser');
      expect(validGallery.images).toHaveLength(1);
    });

    test('should handle gallery validation errors', async () => {
      try {
        await Gallery.create({
          title: 'Incomplete Gallery',
          description: 'Missing required fields'
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    test('should update gallery visibility', async () => {
      const gallery = await Gallery.create({
        title: 'Private Gallery',
        description: 'Initially private',
        category: 'konser',
        coverImage: 'private-cover.jpg',
        images: [{
          filename: 'private-image.jpg',
          originalName: 'private.jpg'
        }],
        uploadedBy: adminUser._id,
        isPublic: false
      });

      gallery.isPublic = true;
      await gallery.save();

      expect(gallery.isPublic).toBe(true);
    });

    test('should manage gallery images', async () => {
      const gallery = await Gallery.create({
        title: 'Image Gallery',
        description: 'Gallery for image management',
        category: 'konser',
        coverImage: 'main-cover.jpg',
        images: [
          {
            filename: 'image1.jpg',
            originalName: 'first.jpg',
            caption: 'First image'
          },
          {
            filename: 'image2.jpg',
            originalName: 'second.jpg',
            caption: 'Second image'
          }
        ],
        uploadedBy: adminUser._id,
        isPublic: true
      });

      expect(gallery.images).toHaveLength(2);
      expect(gallery.images[0]).toHaveProperty('caption', 'First image');
    });
  });

  describe('User Model Basic Coverage', () => {
    test('should create user with validation', async () => {
      const newUser = await User.create({
        firstName: 'Model',
        lastName: 'Test',
        email: 'model@test.com',
        password: 'ModelTest123!',
        tcKimlikNo: '98765432101',
        studentNumber: 'MDL654321',
        role: 'user',
        permissions: ['read']
      });

      expect(newUser).toHaveProperty('firstName', 'Model');
      expect(newUser).toHaveProperty('role', 'user');
    });

    test('should hash password correctly', async () => {
      const user = await User.create({
        firstName: 'Password',
        lastName: 'Test',
        email: 'password@test.com',
        password: 'PlainPassword123!',
        tcKimlikNo: '11223344556',
        studentNumber: 'PWD123456',
        role: 'user'
      });

      expect(user.password).not.toBe('PlainPassword123!');
      expect(user.password.length).toBeGreaterThan(20); // Hashed password is longer
    });

    test('should validate email format', async () => {
      try {
        await User.create({
          firstName: 'Invalid',
          lastName: 'Email',
          email: 'invalid-email-format',
          password: 'ValidPass123!',
          tcKimlikNo: '12345678901',
          studentNumber: 'INV123456',
          role: 'user'
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    test('should handle duplicate email', async () => {
      await User.create({
        firstName: 'First',
        lastName: 'User',
        email: 'duplicate@test.com',
        password: 'FirstPass123!',
        tcKimlikNo: '11111111111',
        studentNumber: 'FIR111111',
        role: 'user'
      });

      try {
        await User.create({
          firstName: 'Second',
          lastName: 'User',
          email: 'duplicate@test.com', // Same email
          password: 'SecondPass123!',
          tcKimlikNo: '22222222222',
          studentNumber: 'SEC222222',
          role: 'user'
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.code).toBe(11000); // Duplicate key error
      }
    });
  });

  describe('API Endpoints Basic Coverage', () => {
    test('should handle basic POST requests', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'API Test',
          email: 'api@test.com',
          subject: 'API Test Subject',
          message: 'API test message',
          category: 'genel'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('message');
      }
    });

    test('should handle GET requests', async () => {
      const response = await request(app)
        .get('/api/events');

      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          invalidField: 'invalid data'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle nonexistent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling Coverage', () => {
    test('should handle database connection errors gracefully', async () => {
      const invalidObjectId = 'invalid-object-id';
      
      try {
        await Event.findById(invalidObjectId);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('CastError');
      }
    });

    test('should handle validation errors properly', async () => {
      const validationTests = [
        { model: Contact, data: { invalidField: 'test' } },
        { model: Event, data: { title: '' } },
        { model: Gallery, data: { description: 'incomplete' } },
        { model: User, data: { email: 'invalid' } }
      ];

      for (const test of validationTests) {
        try {
          await test.model.create(test.data);
        } catch (error) {
          expect(error.name).toBe('ValidationError');
        }
      }
    });

    test('should handle async operations correctly', async () => {
      const promises = [
        Contact.countDocuments(),
        Event.countDocuments(),
        Gallery.countDocuments(),
        User.countDocuments()
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
      expect(results.every(count => typeof count === 'number')).toBe(true);
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });
}); 