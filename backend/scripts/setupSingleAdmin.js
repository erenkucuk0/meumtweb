const mongoose = require('mongoose');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/meumt_web');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const setupSingleAdmin = async () => {
  try {
    await connectDB();

    const existingAdmins = await User.find({ role: 'admin' });
    console.log(`Mevcut admin sayısı: ${existingAdmins.length}`);

    let adminUser;
    if (existingAdmins.length === 0) {
      console.log('Admin kullanıcı oluşturuluyor...');
      
      adminUser = new User({
        firstName: 'System',
        lastName: 'Administrator',
        username: 'meumuzik',
        email: 'admin@meumt.edu.tr',
        password: 'admin123456',
        tcKimlikNo: '12345678901',
        studentNumber: 'ADMIN001',
        role: 'admin',
        isActive: true,
        membershipStatus: 'APPROVED',
        googleSheetsValidated: true,
        autoApproved: true
      });
      await adminUser.save();
    } else {
      adminUser = existingAdmins[0];
      
      if (existingAdmins.length > 1) {
        console.log('Çoklu admin tespit edildi. Sadece ilki admin kalacak...');
        for (let i = 1; i < existingAdmins.length; i++) {
          await User.findByIdAndUpdate(existingAdmins[i]._id, { role: 'user' });
          console.log(`${existingAdmins[i].email} kullanıcısı 'user' rolüne çevrildi`);
        }
      }

      await User.findByIdAndUpdate(adminUser._id, {
        username: 'meumuzik',
        isActive: true,
        password: 'admin123456'
      });
    }

    console.log('Admin kullanıcı bilgileri:');
    console.log(`ID: ${adminUser._id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);

    let systemConfig = await SystemConfig.findOne();
    
    if (!systemConfig) {
      systemConfig = await SystemConfig.create({
        adminUser: adminUser._id,
        googleSheets: {
          autoSync: false,
          syncInterval: 60
        },
        siteSettings: {
          membershipRequiresApproval: true,
          allowNewRegistrations: true,
          maintenanceMode: false
        },
        availablePermissions: [
          {
            resource: 'community_members',
            actions: ['create', 'read', 'update', 'delete'],
            description: 'Topluluk üyeleri yönetimi',
            category: 'community'
          },
          {
            resource: 'songs',
            actions: ['create', 'read', 'update', 'delete'],
            description: 'Şarkı yönetimi',
            category: 'content'
          },
          {
            resource: 'events',
            actions: ['create', 'read', 'update', 'delete'],
            description: 'Etkinlik yönetimi',
            category: 'events'
          },
          {
            resource: 'gallery',
            actions: ['create', 'read', 'update', 'delete'],
            description: 'Galeri yönetimi',
            category: 'content'
          },
          {
            resource: 'google_sheets',
            actions: ['create', 'read', 'update', 'delete'],
            description: 'Google Sheets yönetimi',
            category: 'google_sheets'
          },
          {
            resource: 'system_settings',
            actions: ['read', 'update'],
            description: 'Sistem ayarları',
            category: 'system'
          }
        ]
      });
      console.log('SystemConfig oluşturuldu');
    } else {
      await SystemConfig.findByIdAndUpdate(systemConfig._id, {
        adminUser: adminUser._id
      });
      console.log('SystemConfig güncellendi');
    }

    console.log('\n=== LOGIN TEST ===');
    const testUser = await User.findOne({ username: 'meumuzik' }).select('+password');
    if (testUser) {
      const isMatch = await testUser.matchPassword('admin123456');
      console.log(`Password match: ${isMatch}`);
      console.log(`User active: ${testUser.isActive}`);
      console.log(`User role: ${testUser.role}`);
    } else {
      console.log('❌ Test kullanıcı bulunamadı!');
    }

    console.log('\n✅ Tek admin kurulumu tamamlandı!');
    console.log('👤 Username: meumuzik');
    console.log('🔑 Password: admin123456');
    
  } catch (error) {
    console.error('❌ Setup hatası:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

setupSingleAdmin(); 