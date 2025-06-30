const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const applicationRoutes = require('../api/membership/applications.routes');
const MembershipApplication = require('../models/MembershipApplication');

const {
  createTestAdmin,
  createTestUser,
  getAdminAuthHeader,
  getUserAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/membership/applications', applicationRoutes);
  return app;
};

describe('Membership Applications Tests', () => {
  let app;
  let adminUser;
  let testUser;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    await MembershipApplication.deleteMany({});
    
    adminUser = await createTestAdmin();
    testUser = await createTestUser();
    
    const adminAuth = await getAdminAuthHeader();
    const userAuth = await getUserAuthHeader();
    
    adminToken = adminAuth.token;
    userToken = userAuth.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Application Submission', () => {
    test('should allow users to submit membership applications', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science',
        phoneNumber: '5551234567',
        reason: 'I want to join the community'
      };

      const response = await request(app)
        .post('/api/membership/applications')
        .send(applicationData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        status: 'PENDING'
      });
    });

    test('should validate required application fields', async () => {
      const response = await request(app)
        .post('/api/membership/applications')
        .send({});

      expectErrorResponse(response, 400);
    });

    test('should prevent duplicate applications', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science'
      };

      await request(app)
        .post('/api/membership/applications')
        .send(applicationData);

      const response = await request(app)
        .post('/api/membership/applications')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Admin Application Management', () => {
    test('should allow admins to view all applications', async () => {
      const response = await request(app)
        .get('/api/membership/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should allow admins to approve applications', async () => {
      const application = await MembershipApplication.create({
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science',
        status: 'PENDING'
      });

      const response = await request(app)
        .put(`/api/membership/applications/${application._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('APPROVED');
    });

    test('should allow admins to reject applications', async () => {
      const application = await MembershipApplication.create({
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science',
        status: 'PENDING'
      });

      const response = await request(app)
        .put(`/api/membership/applications/${application._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid information' });

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.rejectionReason).toBe('Invalid information');
    });

    test('should prevent non-admins from managing applications', async () => {
      const response = await request(app)
        .get('/api/membership/applications')
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403);
    });
  });

  describe('Application Status', () => {
    test('should allow applicants to check their application status', async () => {
      const application = await MembershipApplication.create({
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science',
        status: 'PENDING'
      });

      const response = await request(app)
        .get(`/api/membership/applications/status/${application._id}`);

      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('PENDING');
    });

    test('should handle invalid application IDs', async () => {
      const response = await request(app)
        .get('/api/membership/applications/status/invalid-id');

      expectErrorResponse(response, 400);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid application updates', async () => {
      const response = await request(app)
        .put('/api/membership/applications/invalid-id/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 400);
    });

    test('should validate student numbers', async () => {
      const applicationData = {
        firstName: 'Test',
        lastName: 'Applicant',
        email: 'test@example.com',
        studentNumber: 'invalid',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/membership/applications')
        .send(applicationData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('student number');
    });
  });
}); 