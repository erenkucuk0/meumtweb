
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Permission = require('../models/Permission');
const { HeroSection, TeamMember, WebsiteSettings } = require('../models/WebsiteContent');
const SystemConfig = require('../models/SystemConfig');
const logger = require('../utils/logger');
const accessControlService = require('../services/accessControlService');
const { googleSheetsService } = require('../utils/googleSheetsService');

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@meumt.com'; // Standardized email
    
    await User.findOneAndDelete({ email: adminEmail });
    logger.info(`Attempting to recreate admin user: ${adminEmail}. Any existing record was deleted.`);

    const admin = await User.create({
      email: adminEmail,
      password: 'admin123456',
      username: 'admin',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      studentNumber: '000000000' // Add required field to pass validation
    });

    logger.info(`Admin user created successfully with email: ${adminEmail}`);
    return admin;
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    throw error;
  }
};

const seedPermissions = async () => {
  const defaultPermissions = [
    { 
      name: 'Profil Okuma',
      code: 'READ_PROFILE',
      description: 'Kullanıcı profilini görüntüleme yetkisi',
      category: 'USER_MANAGEMENT',
      resource: 'profile',
      action: 'read',
      roles: ['user', 'admin']
    },
    { 
      name: 'Profil Güncelleme',
      code: 'UPDATE_PROFILE',
      description: 'Kullanıcı profilini güncelleme yetkisi',
      category: 'USER_MANAGEMENT',
      resource: 'profile',
      action: 'update',
      roles: ['user', 'admin']
    },
    { 
      name: 'Forum Yazısı Oluşturma',
      code: 'CREATE_FORUM_POST',
      description: 'Forum yazısı oluşturma yetkisi',
      category: 'CONTENT',
      resource: 'forum',
      action: 'create',
      roles: ['user', 'admin']
    },
    { 
      name: 'Forum Okuma',
      code: 'READ_FORUM',
      description: 'Forum yazılarını okuma yetkisi',
      category: 'CONTENT',
      resource: 'forum',
      action: 'read',
      roles: ['user', 'admin']
    },
    { 
      name: 'Forum Yazısı Silme',
      code: 'DELETE_FORUM_POST',
      description: 'Forum yazılarını silme yetkisi',
      category: 'CONTENT',
      resource: 'forum:post',
      action: 'delete',
      roles: ['admin']
    },
    { 
      name: 'Admin Paneli Görüntüleme',
      code: 'VIEW_ADMIN_DASHBOARD',
      description: 'Admin panelini görüntüleme yetkisi',
      category: 'SYSTEM',
      resource: 'admin:dashboard',
      action: 'read',
      roles: ['admin']
    },
    { 
      name: 'Kullanıcı Yönetimi',
      code: 'MANAGE_USERS',
      description: 'Kullanıcıları yönetme yetkisi',
      category: 'USER_MANAGEMENT',
      resource: 'admin:users',
      action: 'manage',
      roles: ['admin']
    },
    { 
      name: 'İçerik Yönetimi',
      code: 'MANAGE_CONTENT',
      description: 'Site içeriğini yönetme yetkisi',
      category: 'CONTENT',
      resource: 'admin:content',
      action: 'manage',
      roles: ['admin']
    },
    { 
      name: 'Ayar Yönetimi',
      code: 'MANAGE_SETTINGS',
      description: 'Site ayarlarını yönetme yetkisi',
      category: 'SYSTEM',
      resource: 'admin:settings',
      action: 'manage',
      roles: ['admin']
    }
  ];

  for (const perm of defaultPermissions) {
    await Permission.findOneAndUpdate(
      { code: perm.code },
      perm,
      { upsert: true, new: true }
    );
  }
  logger.info('Default permissions seeded successfully.');
  
  await accessControlService.initialize();
  logger.info('Access control service re-initialized with new permissions.');
};

const seedWebsiteContent = async () => {
  const heroExists = await HeroSection.findOne({});
  if (!heroExists) {
    await HeroSection.create({
      title: 'Mersin Üniversitesi Müzik Topluluğu',
      subtitle: 'Müziğin Kalbinde Birleşiyoruz',
      description: 'Müzik tutkumuzu paylaşıyor, birlikte öğreniyor ve performans sergiliyoruz.',
      backgroundImage: 'default-hero-bg.jpg',
      isActive: true,
      order: 1
    });
    logger.info('Default hero section content seeded.');
  }

  const settingsExists = await WebsiteSettings.findOne({});
  if (!settingsExists) {
    await WebsiteSettings.create({
      siteName: 'MEÜMT - Mersin Üniversitesi Müzik Topluluğu',
      siteDescription: 'Mersin Üniversitesi bünyesinde faaliyet gösteren, müzik tutkunlarını bir araya getiren öğrenci topluluğu.',
      contactEmail: 'info@meumt.edu.tr',
      socialMedia: {
        instagram: 'https://instagram.com/meumt',
        youtube: 'https://youtube.com/@meumt'
      }
    });
    logger.info('Default website settings seeded.');
  }

  const adminTeamMember = await TeamMember.findOne({ title: 'Topluluk Başkanı' });
  if (!adminTeamMember) {
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      await TeamMember.create({
        name: `${admin.firstName} ${admin.lastName}`,
        title: 'Topluluk Başkanı',
        description: 'Mersin Üniversitesi Müzik Topluluğu Başkanı',
        photo: 'default-avatar.jpg',
        isActive: true,
        order: 1,
        addedBy: admin._id
      });
      logger.info('Default team member (Admin) seeded.');
    }
  }
};

const setSystemInitialized = async () => {
  await SystemConfig.findOneAndUpdate(
    {},
    { isInitialized: true, lastInitialized: new Date() },
    { upsert: true, new: true }
  );
  logger.info('System initialization flag set to true.');
};

const initializeSystemLogic = async () => {
  logger.info('Starting system initialization check...');
  try {
    const config = await SystemConfig.findOne({});
    if (config && config.isInitialized) {
      logger.info('System is already initialized. Skipping seeding.');
      return;
    }
    
    logger.info('Running seeders...');
    await seedAdmin();
    await seedPermissions();
    await seedWebsiteContent();
    await setSystemInitialized();
    
    logger.info('✅ System has been successfully initialized.');
  } catch (error) {
    logger.error('❌ An error occurred during system initialization logic:', error);
    throw error;
  }
};

const runStandalone = async () => {
  try {
    await connectDB();
    await initializeSystemLogic();
  } catch (error) {
    logger.error('Standalone initialization script failed.', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed for standalone script.');
  }
}

if (require.main === module) {
  runStandalone();
}

module.exports = initializeSystemLogic; 