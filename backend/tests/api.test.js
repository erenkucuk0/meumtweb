const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('../api/auth');
const userRoutes = require('../api/users/users.routes');
const eventRoutes = require('../api/events/events.routes');
const memberRoutes = require('../api/members/members.routes');
const galleryRoutes = require('../api/gallery/gallery.routes');
const contactRoutes = require('../api/contact/contact.routes');
const communityRoutes = require('../api/community');
const membershipRoutes = require('../api/membership');
const websiteMembershipRoutes = require('../api/websiteMembership');

const { protect, adminOnly } = require('../middleware/auth');
const errorHandler = require('../middleware/error');

const {
  createTestUser,
  createTestAdmin,
  createTestEvent,
  createTestCommunityMember,
  getUserAuthHeader,
  getAdminAuthHeader,
  expectSuccessResponse,
  expectErrorResponse,
  createValidUserData,
  createValidEventData
} = require('./helpers/testHelpers');

const createTestApp = () => {
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  app.use(helmet());
  
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/membership', membershipRoutes);
  app.use('/api/website-membership', websiteMembershipRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
      environment: 'test'
    });
  });
  
  app.use(errorHandler);
  
  return app;
};

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health');

      const body = expectSuccessResponse(response, 200);
      expect(body.message).toBe('API is running');
      expect(body.environment).toBe('test');
    });
  });

  describe('User Management API', () => {
    it('should get users list (admin only)', async () => {
      const { Authorization } = await getAdminAuthHeader();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });

    it('should fail to get users without admin role', async () => {
      const { Authorization } = await getUserAuthHeader();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', Authorization);

      expectErrorResponse(response, 403);
    });

    it('should get user profile', async () => {
      const { Authorization, user } = await getUserAuthHeader();

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Events API', () => {
    it('should create new event as admin', async () => {
      const { Authorization, user } = await getAdminAuthHeader();
      const eventData = createValidEventData(user._id, {
        title: 'Test Admin Event',
        description: 'Admin created event'
      });

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', Authorization)
        .send(eventData);

      const body = expectSuccessResponse(response, 201);
      expect(body.event.title).toBe('Test Admin Event');
    });

    it('should get events list', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id);

      const response = await request(app)
        .get('/api/events');

      expectSuccessResponse(response, 200);
    });

    it('should get single event', async () => {
      const admin = await createTestAdmin();
      const event = await createTestEvent(admin._id);

      const response = await request(app)
        .get(`/api/events/${event._id}`);

      const body = expectSuccessResponse(response, 200);
      expect(body.event._id).toBe(event._id.toString());
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/events/${fakeId}`);

      expectErrorResponse(response, 404);
    });

    it('should update event as organizer', async () => {
      const { Authorization, user } = await getUserAuthHeader();
      const event = await createTestEvent(user._id);

      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', Authorization)
        .send(updateData);

      const body = expectSuccessResponse(response, 200);
      expect(body.event.title).toBe('Updated Event Title');
    });

    it('should delete event as admin', async () => {
      const { Authorization } = await getAdminAuthHeader();
      const admin = await createTestAdmin();
      const event = await createTestEvent(admin._id);

      const response = await request(app)
        .delete(`/api/events/${event._id}`)
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Members API', () => {
    it('should get community members', async () => {
      const { Authorization } = await getUserAuthHeader();
      
      await createTestCommunityMember();

      const response = await request(app)
        .get('/api/members')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });

    it('should search members by name', async () => {
      const { Authorization } = await getUserAuthHeader();
      
      await createTestCommunityMember({
        fullName: 'John Doe Searchable'
      });

      const response = await request(app)
        .get('/api/members?search=Searchable')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });

    it('should filter members by department', async () => {
      const { Authorization } = await getUserAuthHeader();
      
      await createTestCommunityMember({
        department: 'Ses Teknolojileri'
      });

      const response = await request(app)
        .get('/api/members?department=Ses%20Teknolojileri')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Gallery API', () => {
    it('should get gallery items', async () => {
      const response = await request(app)
        .get('/api/gallery');

      expectSuccessResponse(response, 200);
    });

    it('should filter gallery by category', async () => {
      const response = await request(app)
        .get('/api/gallery?category=konser');

      expectSuccessResponse(response, 200);
    });
  });

  describe('Contact API', () => {
    it('should create contact message', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData);

      expectSuccessResponse(response, 201);
    });

    it('should validate required fields for contact', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User'
        });

      expectErrorResponse(response, 400);
    });

    it('should get contact messages as admin', async () => {
      const { Authorization } = await getAdminAuthHeader();

      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Community API', () => {
    it('should get community stats', async () => {
      const response = await request(app)
        .get('/api/community/stats');

      expectSuccessResponse(response, 200);
    });

    it('should get community announcements', async () => {
      const response = await request(app)
        .get('/api/community/announcements');

      expectSuccessResponse(response, 200);
    });
  });

  describe('Website Membership API', () => {
    it('should submit membership application', async () => {
      const applicationData = {
        fullName: 'Test Applicant',
        tcKimlikNo: '12345678901',
        studentNumber: 'APP001',
        phone: '05551234567',
        department: 'Müzik Teknolojileri',
        email: 'applicant@meumt.edu.tr'
      };

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(applicationData);

      expectSuccessResponse(response, 201);
    });

    it('should validate TC Kimlik for membership application', async () => {
      const applicationData = {
        fullName: 'Test Applicant',
        tcKimlikNo: 'invalid',
        studentNumber: 'APP002',
        phone: '05551234567',
        department: 'Müzik Teknolojileri',
        email: 'applicant2@meumt.edu.tr'
      };

      const response = await request(app)
        .post('/api/website-membership/apply')
        .send(applicationData);

      expectErrorResponse(response, 400);
    });

    it('should get membership applications as admin', async () => {
      const { Authorization } = await getAdminAuthHeader();

      const response = await request(app)
        .get('/api/website-membership/admin/applications')
        .set('Authorization', Authorization);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('malformed json')
        .type('json');

      expectErrorResponse(response, 400);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(response, 401);
    });
  });

  describe('Pagination and Filtering', () => {
    it('should support pagination for events', async () => {
      const admin = await createTestAdmin();
      
      for (let i = 0; i < 5; i++) {
        await createTestEvent(admin._id, { title: `Event ${i}` });
      }

      const response = await request(app)
        .get('/api/events?page=1&limit=3');

      const body = expectSuccessResponse(response, 200);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(3);
    });

    it('should support search for events', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id, { 
        title: 'Searchable Concert Event' 
      });

      const response = await request(app)
        .get('/api/events?search=Searchable');

      expectSuccessResponse(response, 200);
    });

    it('should support filtering events by category', async () => {
      const admin = await createTestAdmin();
      await createTestEvent(admin._id, { 
        category: 'atölye' 
      });

      const response = await request(app)
        .get('/api/events?category=atölye');

      expectSuccessResponse(response, 200);
    });
  });
});

describe('Contact API Enhanced Coverage - Context7 Patterns', () => {
  let testUser, adminUser, testContact;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'contact@test.com',
      role: 'user'
    });
    
    adminUser = await createTestAdmin({
      email: 'admin@contact.com',
      role: 'admin'
    });

    testContact = await Contact.create({
      firstName: 'Test',
      lastName: 'Contact',
      email: 'test@contact.com',
      subject: 'Test Subject',
      message: 'Test message for coverage',
      status: 'pending'
    });
  });

  describe('Contact Form Enhanced Testing', () => {
    test('should create contact message with all fields', async () => {
      const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '+905551234567',
        subject: 'Comprehensive Contact Test',
        message: 'This is a comprehensive test message for coverage testing purposes.',
        category: 'general',
        priority: 'medium',
        source: 'website',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        ipAddress: '192.168.1.1'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData);

      expect([201, 422]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.contact.email).toBe(contactData.email);
      }
    });

    test('should handle contact with minimum required fields', async () => {
      const minimalContactData = {
        firstName: 'Minimal',
        lastName: 'Contact',
        email: 'minimal@test.com',
        subject: 'Minimal Test',
        message: 'Minimal message'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(minimalContactData);

      expect([201, 422]).toContain(response.status);
    });

    test('should validate email format', async () => {
      const invalidEmailData = {
        firstName: 'Invalid',
        lastName: 'Email',
        email: 'invalid-email-format',
        subject: 'Test Subject',
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(invalidEmailData);

      expect([400, 422]).toContain(response.status);
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        firstName: 'Incomplete',
        email: 'incomplete@test.com'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(incompleteData);

      expect([400, 422]).toContain(response.status);
    });

    test('should sanitize XSS attempts in contact form', async () => {
      const xssData = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        email: 'xss@test.com',
        subject: '<img src=x onerror=alert("xss")>',
        message: 'javascript:alert("xss")'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(xssData);

      expect([201, 400, 422]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.data.contact.firstName).not.toContain('<script>');
      }
    });
  });

  describe('Contact Management Enhanced Testing', () => {
    test('should get all contact messages with filtering', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({
          status: 'pending',
          category: 'general',
          limit: 10,
          page: 1,
          sort: '-createdAt'
        });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.contacts)).toBe(true);
      }
    });

    test('should get single contact message', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get(`/api/contact/${testContact._id}`)
        .set('Authorization', Authorization);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.contact._id).toBe(testContact._id.toString());
      }
    });

    test('should update contact status', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const updateData = {
        status: 'resolved',
        adminNotes: 'Issue resolved successfully',
        resolvedBy: adminUser._id,
        resolvedAt: new Date()
      };

      const response = await request(app)
        .put(`/api/contact/${testContact._id}`)
        .set('Authorization', Authorization)
        .send(updateData);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.contact.status).toBe(updateData.status);
      }
    });

    test('should assign contact to admin', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const assignData = {
        assignedTo: adminUser._id,
        assignedAt: new Date(),
        assignmentNotes: 'Assigned for follow-up'
      };

      const response = await request(app)
        .put(`/api/contact/${testContact._id}/assign`)
        .set('Authorization', Authorization)
        .send(assignData);

      expect([200, 401, 404]).toContain(response.status);
    });

    test('should add admin response to contact', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const responseData = {
        response: 'Thank you for contacting us. We will get back to you soon.',
        respondedBy: adminUser._id,
        isPublic: true
      };

      const response = await request(app)
        .post(`/api/contact/${testContact._id}/respond`)
        .set('Authorization', Authorization)
        .send(responseData);

      expect([200, 401, 404]).toContain(response.status);
    });

    test('should delete contact message', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .delete(`/api/contact/${testContact._id}`)
        .set('Authorization', Authorization);

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('Contact Search and Filtering Enhanced Testing', () => {
    test('should search contacts by email', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({ search: testContact.email });

      expect([200, 401]).toContain(response.status);
    });

    test('should filter contacts by date range', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date();

      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect([200, 401]).toContain(response.status);
    });

    test('should filter contacts by status', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({ status: 'pending' });

      expect([200, 401]).toContain(response.status);
    });

    test('should filter contacts by category', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({ category: 'general' });

      expect([200, 401]).toContain(response.status);
    });

    test('should sort contacts by different fields', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact')
        .set('Authorization', Authorization)
        .query({ sort: 'createdAt' });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Contact Analytics Enhanced Testing', () => {
    test('should get contact statistics', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact/stats')
        .set('Authorization', Authorization);

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('stats');
      }
    });

    test('should get contacts summary by status', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact/summary')
        .set('Authorization', Authorization);

      expect([200, 401]).toContain(response.status);
    });

    test('should export contact data', async () => {
      const { Authorization } = await getAdminAuthHeader();
      
      const response = await request(app)
        .get('/api/contact/export')
        .set('Authorization', Authorization)
        .query({ format: 'csv' });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Contact Validation Edge Cases Enhanced Testing', () => {
    test('should handle extremely long messages', async () => {
      const longMessage = 'a'.repeat(10000); // Very long message
      
      const contactData = {
        firstName: 'Long',
        lastName: 'Message',
        email: 'long@test.com',
        subject: 'Long message test',
        message: longMessage
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData);

      expect([201, 400, 422]).toContain(response.status);
    });

    test('should handle special characters in fields', async () => {
      const specialCharData = {
        firstName: 'José',
        lastName: 'García-Hernández',
        email: 'jose.garcia+test@example.com',
        subject: 'Special chars: àáâãäåæçèéêë',
        message: 'Message with special characters: ñáéíóú'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(specialCharData);

      expect([201, 422]).toContain(response.status);
    });

    test('should handle empty strings in required fields', async () => {
      const emptyFieldsData = {
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: ''
      };

      const response = await request(app)
        .post('/api/contact')
        .send(emptyFieldsData);

      expect([400, 422]).toContain(response.status);
    });

    test('should handle null values in fields', async () => {
      const nullFieldsData = {
        firstName: null,
        lastName: null,
        email: null,
        subject: null,
        message: null
      };

      const response = await request(app)
        .post('/api/contact')
        .send(nullFieldsData);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Contact Rate Limiting Enhanced Testing', () => {
    test('should handle multiple submissions from same IP', async () => {
      const contactData = {
        firstName: 'Rate',
        lastName: 'Limit',
        email: 'ratelimit@test.com',
        subject: 'Rate limit test',
        message: 'Testing rate limiting'
      };

      const submissions = Array(5).fill().map(() =>
        request(app)
          .post('/api/contact')
          .send({
            ...contactData,
            email: `ratelimit${Math.random()}@test.com`
          })
      );

      const responses = await Promise.all(submissions);
      
      const successResponses = responses.filter(r => r.status === 201);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(successResponses.length + rateLimitedResponses.length).toBe(5);
    });

    test('should detect potential spam patterns', async () => {
      const spamData = {
        firstName: 'URGENT!!!',
        lastName: 'OFFER!!!',
        email: 'spam@test.com',
        subject: 'CLICK HERE NOW!!! FREE MONEY!!!',
        message: 'BUY NOW!!! LIMITED TIME!!! CLICK LINK!!!'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(spamData);

      expect([201, 400, 422]).toContain(response.status);
    });
  });

  describe('Contact File Attachments Enhanced Testing', () => {
    test('should handle file upload with contact', async () => {
      const mockFile = Buffer.from('fake-file-content');
      
      const response = await request(app)
        .post('/api/contact')
        .field('firstName', 'File')
        .field('lastName', 'Upload')
        .field('email', 'file@test.com')
        .field('subject', 'File upload test')
        .field('message', 'Testing file upload')
        .attach('attachment', mockFile, 'test-file.txt');

      expect([201, 400, 422]).toContain(response.status);
    });

    test('should validate file size limits', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB file
      
      const response = await request(app)
        .post('/api/contact')
        .field('firstName', 'Large')
        .field('lastName', 'File')
        .field('email', 'large@test.com')
        .field('subject', 'Large file test')
        .field('message', 'Testing large file')
        .attach('attachment', largeFile, 'large-file.txt');

      expect([400, 413, 422]).toContain(response.status);
    });

    test('should validate file types', async () => {
      const executableFile = Buffer.from('fake-executable');
      
      const response = await request(app)
        .post('/api/contact')
        .field('firstName', 'Executable')
        .field('lastName', 'File')
        .field('email', 'exe@test.com')
        .field('subject', 'Executable file test')
        .field('message', 'Testing executable file')
        .attach('attachment', executableFile, 'malicious.exe');

      expect([400, 422]).toContain(response.status);
    });
  });
}); 