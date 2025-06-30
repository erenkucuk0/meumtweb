const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const suggestionsRoutes = require('../api/songs/suggestions.routes');
const User = require('../models/User');

const {
  createTestUser,
  createTestAdmin,
  getUserAuthHeader,
  getAdminAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/songs', suggestionsRoutes);
  return app;
};

describe('Song Suggestions API Tests', () => {
  let app;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    app = createTestApp();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    testUser = await createTestUser();
    adminUser = await createTestAdmin();
    
    const userAuth = await getUserAuthHeader();
    const adminAuth = await getAdminAuthHeader();
    
    userToken = userAuth.token;
    adminToken = adminAuth.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/songs/suggestions', () => {
    test('should return 401 for unauthenticated users', async () => {
      const response = await request(app).get('/api/songs/suggestions');
      expect(response.status).toBe(401);
    });

    test('should return suggestions for authenticated users', async () => {
      const response = await request(app)
        .get('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`);
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/songs/suggestions', () => {
    test('should not allow unauthenticated users to submit suggestions', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .send({
          songName: 'Test Song',
          artistName: 'Test Artist',
          genre: 'Rock'
        });

      expect(response.status).toBe(401);
    });

    test('should allow authenticated users to submit suggestions', async () => {
      const suggestion = {
        songName: 'Test Song',
        artistName: 'Test Artist',
        genre: 'Rock',
        link: 'https://example.com/song'
      };

      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(suggestion);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        songName: suggestion.songName,
        artistName: suggestion.artistName
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  describe('Admin Functionality', () => {
    test('should allow admins to view all suggestions', async () => {
      const response = await request(app)
        .get('/api/songs/suggestions/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should allow admins to approve/reject suggestions', async () => {
      const suggestion = {
        songName: 'Admin Test Song',
        artistName: 'Admin Test Artist',
        genre: 'Jazz'
      };

      const createResponse = await request(app)
        .post('/api/songs/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(suggestion);

      const suggestionId = createResponse.body.data._id;

      const approveResponse = await request(app)
        .put(`/api/songs/suggestions/${suggestionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(approveResponse);
      expect(approveResponse.body.data.status).toBe('APPROVED');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid suggestion IDs', async () => {
      const response = await request(app)
        .put('/api/songs/suggestions/invalid-id/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 400);
    });

    test('should prevent non-admin users from accessing admin endpoints', async () => {
      const response = await request(app)
        .get('/api/songs/suggestions/all')
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403);
    });
  });
}); 