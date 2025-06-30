const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const sheetsRoutes = require('../api/admin/sheets.routes');
const SystemConfig = require('../models/SystemConfig');

const {
  createTestAdmin,
  getAdminAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/sheets', protect, adminOnly, sheetsRoutes);
  return app;
};

describe('Google Sheets Integration Tests', () => {
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
    await SystemConfig.deleteMany({});
    adminUser = await createTestAdmin();
    const adminAuth = await getAdminAuthHeader();
    adminToken = adminAuth.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Google Sheets Configuration', () => {
    test('should allow admin to set Google Sheets configuration', async () => {
      const config = {
        credentials: {
          client_email: 'test@example.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
        },
        spreadsheetId: '1234567890',
        range: 'Sheet1!A1:Z1000'
      };

      const response = await request(app)
        .post('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(config);

      expectSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        spreadsheetId: config.spreadsheetId,
        range: config.range
      });
    });

    test('should validate required configuration fields', async () => {
      const response = await request(app)
        .post('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });

    test('should retrieve existing configuration', async () => {
      const config = {
        type: 'google_sheets',
        credentials: {
          client_email: 'test@example.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
        },
        spreadsheetId: '1234567890',
        range: 'Sheet1!A1:Z1000'
      };

      await SystemConfig.create(config);

      const response = await request(app)
        .get('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        spreadsheetId: config.spreadsheetId,
        range: config.range
      });
    });
  });

  describe('Google Sheets Synchronization', () => {
    test('should synchronize members with Google Sheets', async () => {
      const config = {
        type: 'google_sheets',
        credentials: {
          client_email: 'test@example.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
        },
        spreadsheetId: '1234567890',
        range: 'Sheet1!A1:Z1000'
      };

      await SystemConfig.create(config);

      const response = await request(app)
        .post('/api/admin/sheets/sync')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toContain('sync');
    });

    test('should handle synchronization errors gracefully', async () => {
      const response = await request(app)
        .post('/api/admin/sheets/sync')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('configuration');
    });
  });

  describe('Member Management', () => {
    test('should add new member to Google Sheets', async () => {
      const config = {
        type: 'google_sheets',
        credentials: {
          client_email: 'test@example.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
        },
        spreadsheetId: '1234567890',
        range: 'Sheet1!A1:Z1000'
      };

      await SystemConfig.create(config);

      const memberData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        studentNumber: 'TEST123',
        department: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/admin/sheets/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData);

      expectSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        firstName: memberData.firstName,
        lastName: memberData.lastName
      });
    });

    test('should validate member data before adding to sheets', async () => {
      const response = await request(app)
        .post('/api/admin/sheets/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid credentials', async () => {
      const config = {
        credentials: {
          client_email: 'invalid@example.com',
          private_key: 'invalid-key'
        },
        spreadsheetId: '1234567890',
        range: 'Sheet1!A1:Z1000'
      };

      const response = await request(app)
        .post('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(config);

      expectErrorResponse(response, 400);
    });

    test('should handle invalid spreadsheet IDs', async () => {
      const config = {
        credentials: {
          client_email: 'test@example.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
        },
        spreadsheetId: 'invalid-id',
        range: 'Sheet1!A1:Z1000'
      };

      const response = await request(app)
        .post('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(config);

      expectErrorResponse(response, 400);
    });
  });
}); 