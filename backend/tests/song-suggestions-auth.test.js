const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const suggestionsRoutes = require('../api/songs/suggestions.routes');

const {
  createTestUser,
  getUserAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/songs', suggestionsRoutes);
  return app;
};

describe('Song Suggestions Authentication Tests', () => {
  let app;
  let testUser;
  let userToken;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    testUser = await createTestUser();
    const userAuth = await getUserAuthHeader();
    userToken = userAuth.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Authentication Checks', () => {
    test('should show login warning for unauthenticated song suggestion attempts', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .send({
          songName: 'Test Song',
          artistName: 'Test Artist'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toBe('Şarkı önermek için siteye üye olunuz');
    });

    test('should allow authenticated users to suggest songs', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          songName: 'Test Song',
          artistName: 'Test Artist'
        });

      expectSuccessResponse(response, 201);
    });

    test('should show login warning for unauthenticated suggestion list access', async () => {
      const response = await request(app)
        .get('/api/songs/suggestions');

      expectErrorResponse(response, 401);
      expect(response.body.message).toBe('Şarkı önerilerini görüntülemek için siteye üye olunuz');
    });

    test('should allow authenticated users to view suggestions', async () => {
      const response = await request(app)
        .get('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Authorization Messages', () => {
    test('should show appropriate message for expired tokens', async () => {
      const expiredToken = 'expired.token.here';
      
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          songName: 'Test Song',
          artistName: 'Test Artist'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('oturum');
    });

    test('should show appropriate message for invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          songName: 'Test Song',
          artistName: 'Test Artist'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('geçersiz');
    });
  });

  describe('Error Messages', () => {
    test('should show appropriate message for missing song details', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('gerekli');
    });

    test('should show appropriate message for invalid song data', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          songName: '',
          artistName: ''
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('geçerli');
    });
  });
}); 