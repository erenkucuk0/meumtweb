const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const { HeroSection, TeamMember, WebsiteSettings } = require('../models/WebsiteContent');
const Event = require('../models/event');
const SongSuggestion = require('../models/SongSuggestion');
const MembershipApplication = require('../models/MembershipApplication');
const CommunityMember = require('../models/CommunityMember');
const { ForumPost, ForumComment } = require('../models/ForumPost');

const express = require('express');
const cors = require('cors');
const authRouter = require('../api/auth');
const usersRouter = require('../api/users/users.routes');
const communityRouter = require('../api/community');
const songSuggestionsRouter = require('../api/songs/suggestions.routes');
const websiteContentRouter = require('../api/websiteContent');
const forumRouter = require('../api/forum/forum.routes');
const adminSheetsRouter = require('../api/admin/sheets');
const adminMembersRouter = require('../api/admin/members');
const adminWebsiteRouter = require('../api/admin/websiteManagement');

const createTestApp = () => {
  const testApp = express();
  
  testApp.use(cors());
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));
  
  testApp.use('/website', websiteContentRouter);
  testApp.use('/api/auth', authRouter);
  testApp.use('/api/users', usersRouter);
  testApp.use('/api/forum', forumRouter);
  testApp.use('/api/community', communityRouter);
  testApp.use('/api/songs', songSuggestionsRouter);
  testApp.use('/api/admin/sheets', adminSheetsRouter);
  testApp.use('/api/admin/members', adminMembersRouter);
  testApp.use('/api/admin/website', adminWebsiteRouter);
  
  return testApp;
};

describe('MEÜMT Web Application - 15 Feature Comprehensive Test', () => {
  let testApp;
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/meumt_web_test', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    testApp = createTestApp();
  });
  
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    await User.deleteMany({});
    await HeroSection.deleteMany({});
    await TeamMember.deleteMany({});
    await Event.deleteMany({});
    await SongSuggestion.deleteMany({});
    await MembershipApplication.deleteMany({});
    await CommunityMember.deleteMany({});
    await ForumPost.deleteMany({});
    
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
      tcKimlikNo: '11111111111'
    });
    
    regularUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      studentNumber: '123456789',
      department: 'Müzik Teknolojileri',
      role: 'user',
      isActive: true,
      tcKimlikNo: '22222222222'
    });
    
    const adminLoginRes = await request(testApp)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.token;
    
    const userLoginRes = await request(testApp)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'password123'
      });
    userToken = userLoginRes.body.token;
  });

  describe('1. Google Sheets Senkronizasyonu', () => {
    test('Should get Google Sheets configuration', async () => {
      const res = await request(testApp)
        .get('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isConfigured');
      expect(res.body.data).toHaveProperty('status');
    });
    
    test('Should update Google Sheets configuration', async () => {
      const res = await request(app)
        .post('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          spreadsheetId: '1234567890abcdef',
          serviceAccountEmail: 'test@serviceaccount.com'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('güncellendi');
    });
    
    test('Should test Google Sheets connection', async () => {
      const res = await request(app)
        .post('/api/admin/sheets/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('connected');
    });
    
    test('Should sync with Google Sheets', async () => {
      const res = await request(app)
        .post('/api/admin/sheets/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Senkronizasyon');
    });
  });

  describe('2. Manuel Üye Ekleme (Admin)', () => {
    test('Should allow admin to manually add community member', async () => {
      const res = await request(app)
        .post('/api/admin/members/manual-add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Manuel',
          lastName: 'Üye',
          studentNumber: '987654321',
          department: 'Müzik Teknolojileri',
          email: 'manuel@test.com',
          status: 'approved'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('başarıyla eklendi');
    });
  });

  describe('3. Admin Girişi', () => {
    test('Should allow admin login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.token).toBeDefined();
    });
  });

  describe('4. İnternet Sitesine Üye Olma', () => {
    test('Should register new website user', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Yeni',
          lastName: 'Üye',
          email: 'yeni@test.com',
          password: 'password123',
          studentNumber: '111222333',
          department: 'Müzik Teknolojileri'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('yeni@test.com');
      expect(res.body.token).toBeDefined();
    });
  });

  describe('5. Üye Girişi', () => {
    test('Should allow user login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.token).toBeDefined();
    });
  });

  describe('6. Topluluğa Üye Ol Formu', () => {
    test('Should submit community membership application', async () => {
      const res = await request(app)
        .post('/api/community/apply')
        .send({
          fullName: 'Test Başvuru',
          studentNumber: '444555666',
          department: 'Müzik Teknolojileri',
          email: 'basvuru@test.com',
          phoneNumber: '05551234567',
          reason: 'Müzik teknolojilerine ilgim var'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('başvuru');
    });
  });

  describe('7. Admin Panelinden Üye Onayları', () => {
    test('Should get pending community applications', async () => {
      const res = await request(app)
        .get('/api/admin/members/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('8. Onay Durumuna Göre Silme', () => {
    test('Should delete approved applications', async () => {
      const application = await CommunityMember.create({
        fullName: 'Silme Test',
        studentNumber: '123123123',
        department: 'Test',
        email: 'silme@test.com',
        status: 'approved'
      });
      
      const res = await request(app)
        .delete(`/api/admin/members/${application._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('silindi');
    });
  });

  describe('9. İnternet Sitesi Üyelerini Görüntüle', () => {
    test('Should get all website users for admin', async () => {
      const res = await request(app)
        .get('/api/users/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('10. Google Sheets Yapılandırması', () => {
    test('Should update Google Sheets settings', async () => {
      const res = await request(app)
        .put('/api/admin/sheets/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          worksheetName: 'Üyeler',
          autoSync: true,
          syncInterval: 30
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
    });
  });

  describe('11. Forum İşlevleri', () => {
    test('Should create forum post as user', async () => {
      const res = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Forum Başlığı',
          content: 'Bu bir test forum gönderisidir.'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Forum Başlığı');
    });
    
    test('Should get all forum posts', async () => {
      const res = await request(app)
        .get('/api/forum/posts')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('12. Admin Forum Yönetimi', () => {
    let forumPostId;
    
    beforeEach(async () => {
      const post = await ForumPost.create({
        title: 'Admin Test Post',
        content: 'Test content for admin operations',
        author: regularUser._id
      });
      forumPostId = post._id;
    });
    
    test('Should allow admin to delete forum post', async () => {
      const res = await request(app)
        .delete(`/api/forum/posts/${forumPostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('silindi');
    });
  });

  describe('13. Hero, Ekibimiz ve Etkinlikler Düzenleme', () => {
    test('Should create hero section', async () => {
      const res = await request(app)
        .post('/api/admin/website/hero')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Hero Başlığı',
          subtitle: 'Test Alt Başlık',
          description: 'Test açıklama'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Hero Başlığı');
    });
    
    test('Should get public hero sections', async () => {
      const res = await request(app)
        .get('/website/hero')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    test('Should get public team members', async () => {
      const res = await request(app)
        .get('/website/team')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    test('Should get public events', async () => {
      const res = await request(app)
        .get('/website/events')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('14. Şarkı Öneri Sistemi', () => {
    test('Should submit song suggestion', async () => {
      const res = await request(app)
        .post('/api/songs')
        .send({
          songTitle: 'Test Şarkı',
          artist: 'Test Sanatçı',
          suggesterName: 'Test Öneren',
          suggesterEmail: 'test@example.com',
          message: 'Bu şarkıyı öneriyorum çünkü çok güzel.'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.songTitle).toBe('Test Şarkı');
    });
    
    test('Should get public song suggestions', async () => {
      await SongSuggestion.create({
        songTitle: 'Public Song',
        artist: 'Public Artist',
        suggesterName: 'Public User',
        suggesterEmail: 'public@test.com',
        status: 'approved',
        isPublic: true
      });
      
      const res = await request(app)
        .get('/api/songs/public')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('15. Admin Şarkı Önerisi Ekleme', () => {
    test('Should allow admin to add song suggestion directly', async () => {
      const res = await request(app)
        .post('/api/songs/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          songTitle: 'Admin Şarkı',
          artist: 'Admin Sanatçı',
          message: 'Admin tarafından eklendi'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.songTitle).toBe('Admin Şarkı');
    });
    
    test('Should get all song suggestions for admin', async () => {
      const res = await request(app)
        .get('/api/songs/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.statusCounts).toBeDefined();
    });
  });
}); 