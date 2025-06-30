const request = require('supertest');
const { createTestApp, createTestUser, createTestAdmin, expectSuccessResponse, expectErrorResponse, generateTestToken } = require('./helpers/testHelpers');
const User = require('../models/User');
const Event = require('../models/Event');
const CommunityMember = require('../models/CommunityMember');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const SystemConfig = require('../models/SystemConfig');

describe('Kapsamlı Kullanıcı Senaryoları Testleri', () => {
  let app;
  let testUser;
  let testAdmin;
  let adminToken;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await CommunityMember.deleteMany({});
    await WebsiteMembershipApplication.deleteMany({});
    await SystemConfig.deleteMany({});

    testUser = await createTestUser();
    testAdmin = await createTestAdmin();
    adminToken = generateTestToken(testAdmin._id, 'admin');

    await SystemConfig.create({
      allowRegistration: true,
      googleSheets: {
        isEnabled: false
      }
    });
  });

  describe('1. Normal Kullanıcı Testleri (Henüz siteye ve topluluğa üye olmamış)', () => {
    describe('A1) Şarkı önerme kontrolü', () => {
      it('Giriş yapmamış kullanıcı şarkı öneremez', async () => {
        const response = await request(app)
          .post('/api/suggestions')
          .send({
            songName: 'Test Song',
            artist: 'Test Artist',
            url: 'https://youtube.com/test'
          });

        expectErrorResponse(response, 401);
      });

      it('Aktif olmayan kullanıcı şarkı öneremez', async () => {
        const inactiveUser = await createTestUser({ isActive: false });
        const token = generateTestToken(inactiveUser._id);

        const response = await request(app)
          .post('/api/suggestions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            songName: 'Test Song',
            artist: 'Test Artist',
            url: 'https://youtube.com/test'
          });

        expectErrorResponse(response, 403);
      });
    });

    describe('A2) Forum yorum kontrolü', () => {
      it('Giriş yapmamış kullanıcı forum yorumu yapamaz', async () => {
        const response = await request(app)
          .post('/api/forum/posts/123/comments')
          .send({
            content: 'Test comment'
          });

        expectErrorResponse(response, 401);
      });

      it('Aktif olmayan kullanıcı forum yorumu yapamaz', async () => {
        const inactiveUser = await createTestUser({ isActive: false });
        const token = generateTestToken(inactiveUser._id);

        const response = await request(app)
          .post('/api/forum/posts/123/comments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            content: 'Test comment'
          });

        expectErrorResponse(response, 403);
      });
    });

    describe('A3) Topluluğa üye olma form kontrolü', () => {
      const validApplicationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@meumt.edu.tr',
        tcKimlikNo: '12345678901',
        studentNumber: '201912345',
        department: 'Computer Engineering',
        phone: '5551234567'
      };

      it('Eksik bilgilerle üyelik başvurusu reddedilir', async () => {
        const response = await request(app)
          .post('/api/website-membership/apply')
          .send({
            firstName: 'Test',
            email: 'test@meumt.edu.tr'
          });

        expectErrorResponse(response, 400);
      });

      it('Geçersiz TC Kimlik No ile başvuru reddedilir', async () => {
        const response = await request(app)
          .post('/api/website-membership/apply')
          .send({
            ...validApplicationData,
            tcKimlikNo: '123'
          });

        expectErrorResponse(response, 400);
      });

      it('Doğru formatla başvuru kabul edilir', async () => {
        const response = await request(app)
          .post('/api/website-membership/apply')
          .send(validApplicationData);

        const body = expectSuccessResponse(response, 201);
        expect(body.application).toBeDefined();
        expect(body.application.applicationStatus).toBe('PENDING');
      });
    });

    describe('A4) Google Sheets öğrenci numarası kontrolü', () => {
      beforeEach(async () => {
        await SystemConfig.updateOne({}, {
          'googleSheets.isEnabled': true,
          'googleSheets.spreadsheetUrl': 'https://docs.google.com/spreadsheets/d/test'
        });
      });

      it('Sheets\'te olmayan öğrenci numarası reddedilir', async () => {
        const response = await request(app)
          .post('/api/website-membership/apply')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@meumt.edu.tr',
            tcKimlikNo: '12345678901',
            studentNumber: 'INVALID123',
            department: 'Computer Engineering',
            phone: '5551234567'
          });

        expectErrorResponse(response, 400);
      });

      it('Sheets\'te olan öğrenci numarası kabul edilir', async () => {
        const response = await request(app)
          .post('/api/website-membership/apply')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@meumt.edu.tr',
            tcKimlikNo: '12345678901',
            studentNumber: '201912345',
            department: 'Computer Engineering',
            phone: '5551234567'
          });

        const body = expectSuccessResponse(response, 201);
        expect(body.application.googleSheetsValidated).toBe(true);
      });
    });
  });

  describe('2. Kayıtlı Kullanıcı Testleri (Siteye üye)', () => {
    let userToken;

    beforeEach(async () => {
      userToken = generateTestToken(testUser._id);
    });

    describe('A1) Giriş testi', () => {
      it('Doğru bilgilerle giriş yapabilir', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'password123'
          });

        const body = expectSuccessResponse(response);
        expect(body.token).toBeDefined();
      });

      it('Yanlış şifre ile giriş yapamaz', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          });

        expectErrorResponse(response, 401);
      });
    });

    describe('A2) Forum yorum testleri', () => {
      it('Kayıtlı kullanıcı yorum atabilir', async () => {
        const response = await request(app)
          .post('/api/forum/posts/123/comments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            content: 'Test comment'
          });

        const body = expectSuccessResponse(response, 201);
        expect(body.comment.content).toBe('Test comment');
      });

      it('Kendi yorumunu silebilir', async () => {
        const createResponse = await request(app)
          .post('/api/forum/posts/123/comments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            content: 'Test comment'
          });

        const commentId = createResponse.body.comment._id;

        const deleteResponse = await request(app)
          .delete(`/api/forum/comments/${commentId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expectSuccessResponse(deleteResponse);
      });
    });

    describe('A3) Forum başlık testleri', () => {
      it('Kendi açtığı başlığı silebilir', async () => {
        const createResponse = await request(app)
          .post('/api/forum/posts')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Test Post',
            content: 'Test content'
          });

        const postId = createResponse.body.post._id;

        const deleteResponse = await request(app)
          .delete(`/api/forum/posts/${postId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expectSuccessResponse(deleteResponse);
      });
    });

    describe('A4) Şarkı önerme testleri', () => {
      it('Kayıtlı kullanıcı şarkı önerebilir', async () => {
        const response = await request(app)
          .post('/api/suggestions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            songName: 'Test Song',
            artist: 'Test Artist',
            url: 'https://youtube.com/test'
          });

        const body = expectSuccessResponse(response, 201);
        expect(body.suggestion.songName).toBe('Test Song');
      });

      it('Geçersiz URL ile şarkı öneremez', async () => {
        const response = await request(app)
          .post('/api/suggestions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            songName: 'Test Song',
            artist: 'Test Artist',
            url: 'invalid-url'
          });

        expectErrorResponse(response, 400);
      });
    });
  });

  describe('3. Admin Testleri', () => {
    describe('A1-A2) Admin giriş/çıkış testleri', () => {
      it('Admin doğru bilgilerle giriş yapabilir', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testAdmin.email,
            password: 'admin123456'
          });

        const body = expectSuccessResponse(response);
        expect(body.token).toBeDefined();
        expect(body.user.role).toBe('admin');
      });

      it('Admin çıkış yapabilir', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`);

        expectSuccessResponse(response);
      });
    });

    describe('B1-B4) Google Sheets yönetimi testleri', () => {
      it('Admin Google Sheets yapılandırabilir', async () => {
        const response = await request(app)
          .post('/api/admin/sheets/setup')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test',
            credentials: {
              type: 'service_account',
              project_id: 'test',
              private_key: 'test',
              client_email: 'test@test.com'
            }
          });

        const body = expectSuccessResponse(response);
        expect(body.config.googleSheets.isEnabled).toBe(true);
      });

      it('Admin başvuruları görüntüleyebilir', async () => {
        const response = await request(app)
          .get('/api/admin/applications')
          .set('Authorization', `Bearer ${adminToken}`);

        const body = expectSuccessResponse(response);
        expect(Array.isArray(body.applications)).toBe(true);
      });
    });

    describe('C1-C9) Admin panel yönetimi testleri', () => {
      it('Admin site üyelerini görüntüleyebilir', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        const body = expectSuccessResponse(response);
        expect(Array.isArray(body.users)).toBe(true);
      });

      it('Admin kullanıcı silebilir', async () => {
        const response = await request(app)
          .delete(`/api/admin/users/${testUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expectSuccessResponse(response);
      });

      it('Admin şarkı önerilerini görüntüleyebilir', async () => {
        const response = await request(app)
          .get('/api/admin/suggestions')
          .set('Authorization', `Bearer ${adminToken}`);

        const body = expectSuccessResponse(response);
        expect(Array.isArray(body.suggestions)).toBe(true);
      });

      it('Admin şarkı önerisini onaylayabilir', async () => {
        const suggestion = await request(app)
          .post('/api/suggestions')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            songName: 'Test Song',
            artist: 'Test Artist',
            url: 'https://youtube.com/test'
          });

        const suggestionId = suggestion.body.suggestion._id;

        const response = await request(app)
          .put(`/api/admin/suggestions/${suggestionId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const body = expectSuccessResponse(response);
        expect(body.suggestion.status).toBe('APPROVED');
      });

      it('Admin forum gönderisini silebilir', async () => {
        const post = await request(app)
          .post('/api/forum/posts')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Test Post',
            content: 'Test content'
          });

        const postId = post.body.post._id;

        const response = await request(app)
          .delete(`/api/admin/forum/posts/${postId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expectSuccessResponse(response);
      });
    });
  });
}); 