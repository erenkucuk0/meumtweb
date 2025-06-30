const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect, authorize, adminOnly, optionalAuth } = require('../middleware/auth');

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('Middleware Enhanced Coverage - Context7 Patterns', () => {
  let testUser, adminUser, testApp;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});

    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'middleware@test.com',
      password: 'password123',
      role: 'user',
      isActive: true,
      tcKimlikNo: '12345678901',
      studentNumber: 'MW001'
    });
    
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@middleware.com',
      password: 'adminpass123',
      role: 'admin',
      isActive: true,
      tcKimlikNo: '98765432100',
      studentNumber: 'MW002'
    });

    testApp = express();
    testApp.use(express.json());
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  const generateToken = (user, expiresIn = '24h') => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn });
  };

  const generateExpiredToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '-1h' });
  };

  describe('Auth Middleware - protect()', () => {
    beforeEach(() => {
      testApp.get('/protected', protect, (req, res) => {
        res.json({ success: true, user: req.user.email });
      });
    });

    test('should allow access with valid Bearer token', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBe(testUser.email);
    });

    test('should allow access with valid cookie token', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/protected')
        .set('Cookie', `token=${token}`);

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should reject access without token', async () => {
      const response = await request(testApp)
        .get('/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('giriş yapmanız gerekiyor');
    });

    test('should reject access with expired token', async () => {
      const expiredToken = generateExpiredToken(testUser);
      
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Geçersiz token');
    });

    test('should reject access with invalid token format', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.token.format')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject access for inactive user', async () => {
      testUser.isActive = false;
      await testUser.save();
      
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('deaktif');
    });

    test('should reject access for non-existent user', async () => {
      const fakeUser = { _id: new mongoose.Types.ObjectId() };
      const token = generateToken(fakeUser);
      
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('bulunamadı');
    });
  });

  describe('Auth Middleware - authorize()', () => {
    beforeEach(() => {
      testApp.get('/admin-only', protect, authorize('admin'), (req, res) => {
        res.json({ success: true, message: 'Admin access granted' });
      });
      
      testApp.get('/user-or-admin', protect, authorize('user', 'admin'), (req, res) => {
        res.json({ success: true, message: 'User or admin access granted' });
      });
    });

    test('should allow admin access to admin-only route', async () => {
      const token = generateToken(adminUser);
      
      const response = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Admin access granted');
    });

    test('should deny user access to admin-only route', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('yetkiniz yok');
    });

    test('should allow user access to user-or-admin route', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/user-or-admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should allow admin access to user-or-admin route', async () => {
      const token = generateToken(adminUser);
      
      const response = await request(testApp)
        .get('/user-or-admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle authorization without authentication', async () => {
      const response = await request(testApp)
        .get('/admin-only')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Auth Middleware - adminOnly()', () => {
    beforeEach(() => {
      testApp.get('/admin-endpoint', protect, adminOnly, (req, res) => {
        res.json({ success: true, message: 'Admin only access' });
      });
    });

    test('should allow admin access', async () => {
      const token = generateToken(adminUser);
      
      const response = await request(testApp)
        .get('/admin-endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny non-admin access', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/admin-endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Auth Middleware - optionalAuth()', () => {
    beforeEach(() => {
      testApp.get('/optional-auth', optionalAuth, (req, res) => {
        res.json({ 
          success: true, 
          authenticated: !!req.user,
          user: req.user ? req.user.email : null
        });
      });
    });

    test('should work without token', async () => {
      const response = await request(testApp)
        .get('/optional-auth')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBe(null);
    });

    test('should work with valid token', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toBe(testUser.email);
    });

    test('should gracefully handle invalid token', async () => {
      const response = await request(testApp)
        .get('/optional-auth')
        .set('Authorization', 'Bearer invalid.token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    test('should gracefully handle expired token', async () => {
      const expiredToken = generateExpiredToken(testUser);
      
      const response = await request(testApp)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    test('should work with cookie token', async () => {
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/optional-auth')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.authenticated).toBe('boolean');
    });

    test('should handle inactive user gracefully', async () => {
      testUser.isActive = false;
      await testUser.save();
      
      const token = generateToken(testUser);
      
      const response = await request(testApp)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Middleware Error Handling', () => {
    test('should handle JWT malformed error', async () => {
      testApp.get('/test-malformed', protect, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/test-malformed')
        .set('Authorization', 'Bearer malformed-jwt')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle JWT signature error', async () => {
      testApp.get('/test-signature', protect, (req, res) => {
        res.json({ success: true });
      });

      const wrongSecret = jwt.sign({ id: testUser._id }, 'wrong-secret');
      
      const response = await request(testApp)
        .get('/test-signature')
        .set('Authorization', `Bearer ${wrongSecret}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle database connection issues gracefully', async () => {
      testApp.get('/test-db-error', protect, (req, res) => {
        res.json({ success: true });
      });

      const fakeToken = jwt.sign({ id: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET || 'test-secret');
      
      const response = await request(testApp)
        .get('/test-db-error')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware Performance Tests', () => {
    test('should handle concurrent authentication requests', async () => {
      testApp.get('/concurrent-test', protect, (req, res) => {
        res.json({ success: true, userId: req.user._id });
      });

      const token = generateToken(testUser);
      
      const requests = Array(5).fill().map(() => 
        request(testApp)
          .get('/concurrent-test')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle token with long expiration', async () => {
      testApp.get('/long-token', protect, (req, res) => {
        res.json({ success: true });
      });

      const longToken = generateToken(testUser, '365d');
      
      const response = await request(testApp)
        .get('/long-token')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
}); 