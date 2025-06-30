const request = require('supertest');
const { createTestApp, createTestUser, expectSuccessResponse, expectErrorResponse } = require('./helpers/testHelpers');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

describe('Website Membership Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await WebsiteMembershipApplication.deleteMany({});
    await User.deleteMany({});
    await SystemConfig.deleteMany({});

    await SystemConfig.create({
      allowRegistration: true,
      googleSheets: {
        isEnabled: false
      }
    });
  });

  describe('POST /api/website-membership/apply', () => {
    const validApplicationData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@meumt.edu.tr',
      tcKimlikNo: '12345678901',
      studentNumber: '201912345',
      password: 'password123',
      phone: '5551234567',
      department: 'Computer Engineering'
    };

    it('should create application successfully', async () => {
      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      const body = expectSuccessResponse(response, 201);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(validApplicationData.email);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/website-membership/apply')
        .send({
          firstName: 'Test',
          email: 'test@meumt.edu.tr'
        });

      expectErrorResponse(response, 400);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/website-membership/apply')
        .send({
          ...validApplicationData,
          email: 'invalid-email'
        });

      expectErrorResponse(response, 400);
    });

    it('should fail with invalid TC Kimlik No format', async () => {
      const response = await request(app)
        .post('/api/website-membership/apply')
        .send({
          ...validApplicationData,
          tcKimlikNo: '123'
        });

      expectErrorResponse(response, 400);
    });

    it('should fail with existing email', async () => {
      await createTestUser({
        email: validApplicationData.email
      });

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      expectErrorResponse(response, 400);
    });

    it('should fail with existing TC Kimlik No', async () => {
      await createTestUser({
        tcKimlikNo: validApplicationData.tcKimlikNo
      });

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      expectErrorResponse(response, 400);
    });

    it('should fail with existing student number', async () => {
      await createTestUser({
        studentNumber: validApplicationData.studentNumber
      });

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      expectErrorResponse(response, 400);
    });

    it('should fail when registration is disabled', async () => {
      await SystemConfig.updateOne({}, { allowRegistration: false });

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      expectErrorResponse(response, 403);
    });

    it('should handle Google Sheets validation when enabled', async () => {
      await SystemConfig.updateOne({}, {
        'googleSheets.isEnabled': true,
        'googleSheets.spreadsheetUrl': 'https://docs.google.com/spreadsheets/d/test',
        'googleSheets.credentials': {
          type: 'service_account',
          data: {
            type: 'service_account',
            project_id: 'test',
            private_key: 'test',
            client_email: 'test@test.com'
          }
        }
      });

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(validApplicationData);

      expect(response.status).toBe(400);
    });
  });
}); 