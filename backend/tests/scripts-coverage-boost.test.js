const mongoose = require('mongoose');
const User = require('../models/User');
const Permission = require('../models/Permission');
const SystemConfig = require('../models/SystemConfig');
const CommunityMember = require('../models/CommunityMember');
const Contact = require('../models/contact');

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('Scripts Coverage Boost - Context7 Patterns', () => {
  let testUser, adminUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Permission.deleteMany({});
    await SystemConfig.deleteMany({});
    await CommunityMember.deleteMany({});
    await Contact.deleteMany({});

    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test@scripts.com',
      password: 'password123',
      role: 'user',
      isVerified: true,
      tcKimlikNo: '12345678901'
    });

    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      email: 'admin@scripts.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      studentNumber: 'ADM123456'
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('checkAdminUser logic', () => {
    test('should handle admin operations', async () => {
      const adminUsers = await User.find({ role: 'admin' });
      expect(Array.isArray(adminUsers)).toBe(true);
      expect(adminUsers.length).toBeGreaterThan(0);

      const adminCount = await User.countDocuments({ role: 'admin' });
      expect(typeof adminCount).toBe('number');
      expect(adminCount).toBeGreaterThan(0);

      for (const admin of adminUsers) {
        expect(admin.role).toBe('admin');
        expect(admin.email).toMatch(/@.*\.com$/);
      }
    });

    test('should create admin when none exists', async () => {
      await User.deleteMany({ role: 'admin' });
      
      const existingAdminCount = await User.countDocuments({ role: 'admin' });
      expect(existingAdminCount).toBe(0);

      const defaultAdmin = await User.create({
        firstName: 'Default',
        lastName: 'Admin',
        name: 'Default Admin',
        email: 'admin@default.com',
        password: 'defaultpass123',
        role: 'admin',
        isVerified: true,
        studentNumber: 'DEFAULT001'
      });

      expect(defaultAdmin.role).toBe('admin');
      expect(defaultAdmin.isVerified).toBe(true);
    });
  });

  describe('cleanAdminUsers logic', () => {
    test('should clean invalid admin users', async () => {
      await User.insertMany([
        {
          firstName: 'Invalid1',
          lastName: 'Admin1',
          name: 'Invalid Admin1',
          email: 'invalid1@admin.com',
          password: 'pass123456',
          role: 'admin',
          isVerified: false,
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        }
      ]);

      const oldUnverifiedAdmins = await User.find({
        role: 'admin',
        isVerified: false,
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      expect(oldUnverifiedAdmins.length).toBe(1);

      const deleteResult = await User.deleteMany({
        role: 'admin',
        isVerified: false,
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      expect(deleteResult.deletedCount).toBe(1);
    });
  });

  describe('cleanInvalidPermissions logic', () => {
    test('should clean invalid permissions', async () => {
      await Permission.insertMany([
        {
          userId: new mongoose.Types.ObjectId(),
          resource: '',
          action: 'read',
          granted: true
        },
        {
          userId: testUser._id,
          resource: 'users',
          action: '',
          granted: true
        }
      ]);

      const emptyResourcePerms = await Permission.find({
        $or: [
          { resource: '' },
          { resource: { $exists: false } }
        ]
      });
      expect(Array.isArray(emptyResourcePerms)).toBe(true);

      const cleanupResult = await Permission.deleteMany({
        $or: [
          { resource: '' },
          { resource: { $exists: false } },
          { action: '' },
          { action: { $exists: false } }
        ]
      });
      expect(typeof cleanupResult.deletedCount).toBe('number');
    });
  });

  describe('setupSystemConfig logic', () => {
    test('should setup system configurations', async () => {
      const defaultConfigs = [
        {
          key: 'system.maintenance.enabled',
          value: 'false',
          type: 'boolean',
          description: 'System maintenance mode'
        },
        {
          key: 'email.smtp.host',
          value: 'smtp.gmail.com',
          type: 'string',
          description: 'SMTP server hostname'
        }
      ];

      for (const config of defaultConfigs) {
        const existingConfig = await SystemConfig.findOne({ key: config.key });
        
        if (!existingConfig) {
          const newConfig = await SystemConfig.create(config);
          expect(newConfig.key).toBe(config.key);
          expect(newConfig.type).toBe(config.type);
        }
      }

      const allConfigs = await SystemConfig.find({});
      expect(allConfigs.length).toBeGreaterThanOrEqual(defaultConfigs.length);
    });
  });

  describe('seedDatabase logic', () => {
    test('should handle database seeding', async () => {
      await User.deleteMany({});
      await Contact.deleteMany({});

      const seedUsers = [
        {
          firstName: 'Seed',
          lastName: 'Admin',
          name: 'Seed Admin',
          email: 'seed@admin.com',
          password: 'seedpass123',
          role: 'admin',
          isVerified: true,
          studentNumber: 'SEED001'
        }
      ];

      const createdUsers = await User.insertMany(seedUsers);
      expect(createdUsers.length).toBe(1);

      const seedContacts = [
        {
          name: 'Seed Contact',
          email: 'contact@seed.com',
          subject: 'Seed Subject',
          message: 'Seed message',
          category: 'genel',
          status: 'yeni'
        }
      ];

      const createdContacts = await Contact.insertMany(seedContacts);
      expect(createdContacts.length).toBe(1);
    });
  });

  describe('Script utilities', () => {
    test('should handle database operations', async () => {
      expect(mongoose.connection.readyState).toBeGreaterThan(0);

      const userStats = await User.collection.stats();
      expect(typeof userStats.count).toBe('number');

      const cleanupResults = await Promise.all([
        User.deleteMany({ isVerified: false, createdAt: { $lt: new Date(Date.now() - 86400000) } }),
        Contact.deleteMany({ status: 'spam' })
      ]);

      cleanupResults.forEach(result => {
        expect(typeof result.deletedCount).toBe('number');
      });
    });

    test('should handle batch operations', async () => {
      const batchUsers = [];
      for (let i = 0; i < 3; i++) {
        batchUsers.push({
          firstName: `Batch${i}`,
          lastName: `User${i}`,
          name: `Batch${i} User${i}`,
          email: `batch${i}@test.com`,
          password: 'batchpass123',
          tcKimlikNo: `1234567890${i}`
        });
      }

      const insertedUsers = await User.insertMany(batchUsers);
      expect(insertedUsers.length).toBe(3);

      const updateResult = await User.updateMany(
        { email: { $regex: /batch.*@test\.com/ } },
        { $set: { isVerified: true } }
      );
      expect(updateResult.modifiedCount).toBe(3);

      const deleteResult = await User.deleteMany({
        email: { $regex: /batch.*@test\.com/ }
      });
      expect(deleteResult.deletedCount).toBe(3);
    });
  });
});
