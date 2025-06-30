const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const membershipRoutes = require('../api/membership/membership.routes');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const CommunityMember = require('../models/CommunityMember');

const {
  createTestAdmin,
  getAdminAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/membership', membershipRoutes);
  return app;
};

describe('Website Membership Tests', () => {
  let app;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    await WebsiteMembershipApplication.deleteMany({});
    await CommunityMember.deleteMany({});
    
    adminUser = await createTestAdmin();
    const adminAuth = await getAdminAuthHeader();
    adminToken = adminAuth.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Membership Application Process', () => {
    test('should allow users to submit membership applications', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        status: 'PENDING'
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/membership/apply')
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('required');
    });

    test('should validate TC Kimlik No format', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '123', // Invalid format
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('TC Kimlik');
    });

    test('should validate student number format', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: '123', // Invalid format
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('student number');
    });
  });

  describe('Google Sheets Integration', () => {
    test('should validate student number against Google Sheets', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      await CommunityMember.create({
        ...applicationData,
        status: 'ACTIVE'
      });

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectSuccessResponse(response, 201);
    });

    test('should reject if student number not found in sheets', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'NOTFOUND123',
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Admin Management', () => {
    test('should allow admins to view all website membership applications', async () => {
      const response = await request(app)
        .get('/api/membership/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should allow admins to approve website membership applications', async () => {
      const application = await WebsiteMembershipApplication.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        status: 'PENDING'
      });

      const response = await request(app)
        .put(`/api/membership/applications/${application._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('APPROVED');
    });

    test('should allow admins to reject website membership applications', async () => {
      const application = await WebsiteMembershipApplication.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        status: 'PENDING'
      });

      const response = await request(app)
        .put(`/api/membership/applications/${application._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid information' });

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('REJECTED');
    });
  });

  describe('Error Handling', () => {
    test('should prevent duplicate email registrations', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      const response = await request(app)
        .post('/api/membership/apply')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('already exists');
    });

    test('should prevent duplicate TC Kimlik No registrations', async () => {
      const baseData = {
        firstName: 'Test',
        lastName: 'User',
        password: 'Test123456',
        studentNumber: 'TEST123',
        tcKimlikNo: '12345678901',
        phoneNumber: '5551234567',
        department: 'Computer Science'
      };

      await request(app)
        .post('/api/membership/apply')
        .send({
          ...baseData,
          email: 'test1@example.com'
        });

      const response = await request(app)
        .post('/api/membership/apply')
        .send({
          ...baseData,
          email: 'test2@example.com'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('TC Kimlik');
    });
  });
}); 