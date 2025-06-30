const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const forumRoutes = require('../api/forum/forum.routes');

const {
  createTestUser,
  getUserAuthHeader,
  expectSuccessResponse,
  expectErrorResponse
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/forum', forumRoutes);
  return app;
};

describe('Forum Authentication Tests', () => {
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

  describe('Post Creation Authentication', () => {
    test('should show login warning for unauthenticated post creation attempts', async () => {
      const response = await request(app)
        .post('/api/forum/posts')
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toBe('Başlık açmak için siteye üye olunuz');
    });

    test('should allow authenticated users to create posts', async () => {
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      expectSuccessResponse(response, 201);
    });
  });

  describe('Comment Authentication', () => {
    let testPost;

    beforeEach(async () => {
      const postResponse = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      testPost = postResponse.body.data;
    });

    test('should show login warning for unauthenticated comment attempts', async () => {
      const response = await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .send({
          content: 'Test Comment'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toBe('Yorum yapmak için siteye üye olunuz');
    });

    test('should allow authenticated users to comment', async () => {
      const response = await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Test Comment'
        });

      expectSuccessResponse(response);
    });
  });

  describe('Authorization Messages', () => {
    test('should show appropriate message for expired tokens', async () => {
      const expiredToken = 'expired.token.here';
      
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('oturum');
    });

    test('should show appropriate message for invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('geçersiz');
    });
  });

  describe('Error Messages', () => {
    test('should show appropriate message for missing post data', async () => {
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('gerekli');
    });

    test('should show appropriate message for invalid post data', async () => {
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '',
          content: ''
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('geçerli');
    });

    test('should show appropriate message for missing comment data', async () => {
      const postResponse = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Post',
          content: 'Test Content'
        });

      const testPost = postResponse.body.data;

      const response = await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('gerekli');
    });
  });
}); 