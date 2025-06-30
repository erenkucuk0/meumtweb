const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { HeroSection, TeamMember, WebsiteSettings } = require('../models/WebsiteContent');
const Event = require('../models/event');
const SongSuggestion = require('../models/SongSuggestion');
const MembershipApplication = require('../models/MembershipApplication');
const CommunityMember = require('../models/CommunityMember');
const { ForumPost, ForumComment } = require('../models/ForumPost');

describe('MEÜMT Web Application - 15 Feature Comprehensive Test', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;
  
  beforeEach(async () => {
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });
    
    regularUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'user@test.com',
      password: 'password123',
      studentNumber: '123456789',
      department: 'Müzik Teknolojileri',
      role: 'user',
      isActive: true
    });
    
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.token;
    
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'password123'
      });
    userToken = userLoginRes.body.token;
  });

  describe('1. Google Sheets Senkronizasyonu', () => {
    test('Should get Google Sheets configuration', async () => {
      const res = await request(app)
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
    
    test('Should not allow non-admin to manually add members', async () => {
      await request(app)
        .post('/api/admin/members/manual-add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(403);
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
    
    test('Should reject invalid admin credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })
        .expect(401);
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
    
    test('Should not allow duplicate email registration', async () => {
      await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'user@test.com', // Already exists
          password: 'password123'
        })
        .expect(400);
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
    
    test('Should get user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@test.com');
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
    
    test('Should validate required fields for community application', async () => {
      await request(app)
        .post('/api/community/apply')
        .send({
          fullName: 'Test'
        })
        .expect(400);
    });
  });

  describe('7. Admin Panelinden Üye Onayları', () => {
    let applicationId;
    
    beforeEach(async () => {
      const application = await CommunityMember.create({
        fullName: 'Test Onay',
        studentNumber: '777888999',
        department: 'Müzik Teknolojileri',
        email: 'onay@test.com',
        phoneNumber: '05559876543',
        status: 'pending'
      });
      applicationId = application._id;
    });
    
    test('Should get pending community applications', async () => {
      const res = await request(app)
        .get('/api/admin/members/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    test('Should approve community application', async () => {
      const res = await request(app)
        .put(`/api/admin/members/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNote: 'Onaylandı'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('onaylandı');
    });
    
    test('Should reject community application', async () => {
      const res = await request(app)
        .put(`/api/admin/members/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNote: 'Reddedildi'
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reddedildi');
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
    
    test('Should not allow regular user to view all users', async () => {
      await request(app)
        .get('/api/users/admin/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
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
    
    test('Should add comment to forum post', async () => {
      const post = await ForumPost.create({
        title: 'Test Post',
        content: 'Test content',
        author: regularUser._id
      });
      
      const res = await request(app)
        .post(`/api/forum/posts/${post._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Bu bir test yorumudur.'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Bu bir test yorumudur.');
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
    
    test('Should allow admin to pin forum post', async () => {
      const res = await request(app)
        .put(`/api/forum/posts/${forumPostId}/pin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
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
    
    test('Should create team member', async () => {
      const res = await request(app)
        .post('/api/admin/website/team')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Ekip Üyesi',
          title: 'Test Pozisyon',
          description: 'Test açıklama'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Ekip Üyesi');
    });
    
    test('Should create event', async () => {
      const res = await request(app)
        .post('/api/admin/website/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Etkinlik',
          description: 'Test etkinlik açıklaması',
          date: new Date('2024-12-31'),
          location: 'Test Lokasyon'
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Etkinlik');
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
    
    test('Should update song suggestion status', async () => {
      const suggestion = await SongSuggestion.create({
        songTitle: 'Test Status',
        artist: 'Test Artist',
        suggesterName: 'Test User',
        suggesterEmail: 'test@test.com',
        status: 'pending'
      });
      
      const res = await request(app)
        .put(`/api/songs/admin/${suggestion._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          adminNote: 'Güzel şarkı',
          isPublic: true
        })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });
    
    test('Should delete song suggestion', async () => {
      const suggestion = await SongSuggestion.create({
        songTitle: 'Delete Test',
        artist: 'Delete Artist',
        suggesterName: 'Delete User',
        suggesterEmail: 'delete@test.com'
      });
      
      const res = await request(app)
        .delete(`/api/songs/admin/${suggestion._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('silindi');
    });
  });

  describe('Comprehensive Integration Test', () => {
    test('Should complete full user journey', async () => {
      const registerRes = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Journey',
          lastName: 'User',
          email: 'journey@test.com',
          password: 'password123',
          studentNumber: '999888777',
          department: 'Müzik Teknolojileri'
        })
        .expect(201);
      
      const journeyToken = registerRes.body.token;
      
      await request(app)
        .post('/api/community/apply')
        .send({
          fullName: 'Journey User',
          studentNumber: '999888777',
          department: 'Müzik Teknolojileri',
          email: 'journey@test.com',
          phoneNumber: '05551112233',
          reason: 'İlgim var'
        })
        .expect(201);
      
      await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${journeyToken}`)
        .send({
          title: 'Journey Forum Post',
          content: 'This is my first post!'
        })
        .expect(201);
      
      await request(app)
        .post('/api/songs')
        .send({
          songTitle: 'Journey Song',
          artist: 'Journey Artist',
          suggesterName: 'Journey User',
          suggesterEmail: 'journey@test.com',
          message: 'Great song!'
        })
        .expect(201);
      
      const pendingApps = await request(app)
        .get('/api/admin/members/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const journeyApp = pendingApps.body.data.find(app => 
        app.email === 'journey@test.com'
      );
      
      if (journeyApp) {
        await request(app)
          .put(`/api/admin/members/${journeyApp._id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            adminNote: 'Onaylandı'
          })
          .expect(200);
      }
      
      expect(true).toBe(true);
    });
  });
}); 