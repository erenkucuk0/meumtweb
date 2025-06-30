const request = require('supertest');
const { createTestApp, createTestUser, createTestAdmin, expectSuccessResponse, expectErrorResponse, generateTestToken } = require('./helpers/testHelpers');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

describe('Admin Tests', () => {
  let app;
  let admin;
  let adminToken;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await SystemConfig.deleteMany({});

    admin = await createTestAdmin();
    adminToken = generateTestToken(admin._id, 'admin');
  });

  describe('Admin User Management', () => {
    it('should get all users as admin', async () => {
      await createTestUser({ email: 'user1@meumt.edu.tr' });
      await createTestUser({ email: 'user2@meumt.edu.tr' });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const body = expectSuccessResponse(response);
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThanOrEqual(3); // Including admin
    });

    it('should get single user as admin', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const body = expectSuccessResponse(response);
      expect(body.user._id.toString()).toBe(user._id.toString());
    });

    it('should update user as admin', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .put(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          isActive: false
        });

      const body = expectSuccessResponse(response);
      expect(body.user.firstName).toBe('Updated');
      expect(body.user.lastName).toBe('Name');
      expect(body.user.isActive).toBe(false);
    });

    it('should delete user as admin', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .delete(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should fail to access admin routes without admin role', async () => {
      const user = await createTestUser();
      const userToken = generateTestToken(user._id, 'user');

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403);
    });
  });

  describe('Admin System Configuration', () => {
    it('should update system configuration', async () => {
      const configData = {
        allowRegistration: false,
        googleSheets: {
          isEnabled: true,
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test',
          credentials: {
            type: 'service_account',
            data: {
              type: 'service_account',
              project_id: 'test',
              private_key: 'test',
              client_email: 'test@test.com'
            }
          }
        }
      };

      const response = await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(configData);

      const body = expectSuccessResponse(response);
      expect(body.config.allowRegistration).toBe(false);
      expect(body.config.googleSheets.isEnabled).toBe(true);
    });

    it('should get system configuration', async () => {
      await SystemConfig.create({
        allowRegistration: true,
        googleSheets: {
          isEnabled: false
        }
      });

      const response = await request(app)
        .get('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`);

      const body = expectSuccessResponse(response);
      expect(body.config.allowRegistration).toBe(true);
      expect(body.config.googleSheets.isEnabled).toBe(false);
    });
  });

  describe('Admin Google Sheets Integration', () => {
    it('should setup Google Sheets credentials', async () => {
      const sheetsData = {
        serviceAccountEmail: 'test@test.com',
        privateKey: 'test-key',
        projectId: 'test-project',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test'
      };

      const response = await request(app)
        .post('/api/admin/sheets/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sheetsData);

      const body = expectSuccessResponse(response);
      expect(body.config.googleSheets.isEnabled).toBe(true);
      expect(body.config.googleSheets.spreadsheetUrl).toBe(sheetsData.spreadsheetUrl);
    });

    it('should fail to setup Google Sheets with invalid URL', async () => {
      const sheetsData = {
        serviceAccountEmail: 'test@test.com',
        privateKey: 'test-key',
        projectId: 'test-project',
        spreadsheetUrl: 'invalid-url'
      };

      const response = await request(app)
        .post('/api/admin/sheets/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sheetsData);

      expectErrorResponse(response, 400);
    });
  });
}); 