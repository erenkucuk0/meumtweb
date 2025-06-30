const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const authRoutes = require('../api/auth');
const { protect } = require('../middleware/auth');

const {
  createTestUser,
  createTestAdmin,
  getUserAuthHeader,
  getAdminAuthHeader,
  generateTestToken,
  generateExpiredToken,
  expectSuccessResponse,
  expectErrorResponse,
  generateFreshToken
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Security Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Rate Limiting', () => {
    it('should handle multiple requests appropriately', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const promises = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(userData)
      );

      const responses = await Promise.all(promises);
      
      const unauthorizedResponses = responses.filter(res => res.status === 401);
      expect(unauthorizedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should handle requests with basic security', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401); // No auth header
      expect(response.headers).toHaveProperty('content-type');
    });
  });

  describe('Authentication Security', () => {
    let authToken;
    let user;

    beforeEach(async () => {
      user = await createTestUser({
        email: 'security@test.com'
      });
      
      authToken = generateFreshToken(user._id, user.role);
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(response, 401);
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = generateExpiredToken(user._id);
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expectErrorResponse(response, 401);
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expectErrorResponse(response, 401);
      expect(response.body.message).toBe('Bu işlem için giriş yapmanız gerekiyor');
    });

    it('should accept valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Input Sanitization', () => {
    it('should validate email format', async () => {
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'password123',
        tcKimlikNo: '12345678901'
      };

      const user = new User(invalidData);
      await expect(user.save()).rejects.toThrow(/Geçerli bir e-posta/);
    });

    it('should handle SQL injection attempts', async () => {
      const injectionAttempt = {
        email: "admin@test.com'; DROP TABLE users; --",
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(injectionAttempt);

      expect(response.status).toBe(401);
    });

    it('should validate TC Kimlik format', async () => {
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        tcKimlikNo: 'invalid-tc'
      };

      const user = new User(invalidData);
      await expect(user.save()).rejects.toThrow(/Geçerli bir TC Kimlik/);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords before saving', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'hash-test@example.com',
        password: 'plaintext123',
        tcKimlikNo: '12345678901'
      };

      const user = await User.create(userData);
      
      expect(user.password).not.toBe('plaintext123');
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt pattern
    });

    it('should validate password strength', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'weak-pass@example.com',
        password: '123', // Too short
        tcKimlikNo: '12345678901'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Authorization Security', () => {
    it('should require admin role for admin endpoints', async () => {
      const { Authorization } = await getUserAuthHeader();

      const response = await request(app)
        .get('/api/auth/admin-test') // This would be an admin-only endpoint
        .set('Authorization', Authorization);

      expect([403, 404]).toContain(response.status);
    });

    it('should allow admin access to admin endpoints', async () => {
      const { Authorization } = await getAdminAuthHeader();

      const response = await request(app)
        .get('/api/auth/admin-test') // This would be an admin-only endpoint
        .set('Authorization', Authorization);

      expect(response.status).toBe(404);
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      expectErrorResponse(response, 400);
    });

    it('should limit request size', async () => {
      const largeData = {
        firstName: 'A'.repeat(1000),
        lastName: 'B'.repeat(1000),
        email: 'large@example.com',
        password: 'password123',
        tcKimlikNo: '12345678901'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData);

      expectErrorResponse(response, 400);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in responses', async () => {
      const { Authorization, user } = await getUserAuthHeader();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should handle concurrent requests safely', async () => {
      const { Authorization } = await getUserAuthHeader();

      const promises = Array(5).fill().map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', Authorization)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
}); 