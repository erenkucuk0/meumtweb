const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const forumRoutes = require('../api/forum/forum.routes');
const ForumPost = require('../models/ForumPost');

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
  app.use('/api/forum', forumRoutes);
  return app;
};

describe('Forum API Tests', () => {
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
    await ForumPost.deleteMany({});
    
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

  describe('Forum Post Management', () => {
    test('should prevent unauthorized users from creating posts', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post'
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .send(postData);

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('login');
    });

    test('should allow authenticated users to create posts', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post'
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(postData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        title: postData.title,
        content: postData.content,
        author: testUser._id.toString()
      });
    });

    test('should allow users to view all posts', async () => {
      await ForumPost.create([
        {
          title: 'Post 1',
          content: 'Content 1',
          author: testUser._id
        },
        {
          title: 'Post 2',
          content: 'Content 2',
          author: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/forum/posts');

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should allow users to view a single post', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id
      });

      const response = await request(app)
        .get(`/api/forum/posts/${post._id}`);

      expectSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        title: 'Test Post',
        content: 'Test Content'
      });
    });
  });

  describe('Post Comments', () => {
    let testPost;

    beforeEach(async () => {
      testPost = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id
      });
    });

    test('should prevent unauthorized users from commenting', async () => {
      const response = await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .send({ content: 'Test comment' });

      expectErrorResponse(response, 401);
      expect(response.body.message).toContain('login');
    });

    test('should allow authenticated users to comment', async () => {
      const response = await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test comment' });

      expectSuccessResponse(response);
      expect(response.body.data.comments[0]).toMatchObject({
        content: 'Test comment',
        author: testUser._id.toString()
      });
    });

    test('should allow users to view post comments', async () => {
      await request(app)
        .post(`/api/forum/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Test comment' });

      const response = await request(app)
        .get(`/api/forum/posts/${testPost._id}/comments`);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toMatchObject({
        content: 'Test comment'
      });
    });
  });

  describe('Post Management', () => {
    test('should allow users to delete their own posts', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id
      });

      const response = await request(app)
        .delete(`/api/forum/posts/${post._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      
      const deletedPost = await ForumPost.findById(post._id);
      expect(deletedPost).toBeNull();
    });

    test('should prevent users from deleting others\' posts', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: otherUser._id
      });

      const response = await request(app)
        .delete(`/api/forum/posts/${post._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403);
    });

    test('should allow admins to delete any post', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id
      });

      const response = await request(app)
        .delete(`/api/forum/posts/${post._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      
      const deletedPost = await ForumPost.findById(post._id);
      expect(deletedPost).toBeNull();
    });
  });

  describe('Comment Management', () => {
    let testPost;
    let testComment;

    beforeEach(async () => {
      testPost = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id,
        comments: [{
          content: 'Test comment',
          author: testUser._id
        }]
      });
      testComment = testPost.comments[0];
    });

    test('should allow users to delete their own comments', async () => {
      const response = await request(app)
        .delete(`/api/forum/posts/${testPost._id}/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectSuccessResponse(response);
      
      const updatedPost = await ForumPost.findById(testPost._id);
      expect(updatedPost.comments).toHaveLength(0);
    });

    test('should prevent users from deleting others\' comments', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: otherUser._id,
        comments: [{
          content: 'Test comment',
          author: otherUser._id
        }]
      });

      const response = await request(app)
        .delete(`/api/forum/posts/${post._id}/comments/${post.comments[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403);
    });

    test('should allow admins to delete any comment', async () => {
      const response = await request(app)
        .delete(`/api/forum/posts/${testPost._id}/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      
      const updatedPost = await ForumPost.findById(testPost._id);
      expect(updatedPost.comments).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid post IDs', async () => {
      const response = await request(app)
        .get('/api/forum/posts/invalid-id');

      expectErrorResponse(response, 400);
    });

    test('should handle missing posts', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/forum/posts/${validObjectId}`);

      expectErrorResponse(response, 404);
    });

    test('should validate post data', async () => {
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('required');
    });

    test('should validate comment data', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test Content',
        author: testUser._id
      });

      const response = await request(app)
        .post(`/api/forum/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('required');
    });
  });
}); 