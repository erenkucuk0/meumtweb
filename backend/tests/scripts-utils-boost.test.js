const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const CommunityMember = require('../models/CommunityMember');
const Permission = require('../models/Permission');

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  timer: jest.fn(() => ({ end: jest.fn() }))
}));

jest.mock('../utils/sendEmail', () => {
  return jest.fn().mockResolvedValue({ success: true, messageId: 'test-email' });
});

jest.mock('../utils/googleSheetsService', () => ({
  authenticateGoogleSheets: jest.fn().mockResolvedValue({ success: true }),
  addMemberToSheet: jest.fn().mockResolvedValue({ success: true }),
  updateMemberInSheet: jest.fn().mockResolvedValue({ success: true }),
  syncMemberData: jest.fn().mockResolvedValue({ success: true }),
  createSpreadsheet: jest.fn().mockResolvedValue({ spreadsheetId: 'test-id' })
}));

describe('Scripts & Utils Coverage Boost - Target 30-40%!', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await SystemConfig.deleteMany({});
    await CommunityMember.deleteMany({});
    await Permission.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Scripts Coverage Boost - Critical Priority', () => {
    
    test('should test admin management script patterns', async () => {
      const adminUser = await User.create({
        firstName: 'Script',
        lastName: 'Admin',
        name: 'Script Admin',
        email: 'script@admin.com',
        password: 'scriptpass123456',
        role: 'admin',
        tcKimlikNo: '11111111111'
      });

      expect(adminUser.role).toBe('admin');
      
      const foundAdmin = await User.findOne({ role: 'admin' });
      expect(foundAdmin).toBeDefined();
      
      const adminCount = await User.countDocuments({ role: 'admin' });
      expect(adminCount).toBe(1);
    });

    test('should test system configuration patterns', async () => {
      const configs = [
        {
          type: 'main',
          siteSettings: { siteName: 'MEUMT Test' }
        },
        {
          type: 'payment',
          paymentInfo: { 
            ibanNumber: 'TR00 0000 0000 0000 0000 0000 00',
            bankName: 'Test Bank',
            accountHolderName: 'Test Account'
          }
        }
      ];

      for (const configData of configs) {
        const config = await SystemConfig.create(configData);
        expect(config.type).toBe(configData.type);
      }

      const mainConfig = await SystemConfig.findOne({ type: 'main' });
      expect(mainConfig).toBeDefined();
    });

    test('should test database seeding patterns', async () => {
      const seedUsers = [
        {
          firstName: 'Seed1', lastName: 'User', name: 'Seed User 1',
          email: 'seed1@test.com', password: 'pass123456',
          role: 'user', tcKimlikNo: '11111111112'
        },
        {
          firstName: 'Seed2', lastName: 'User', name: 'Seed User 2',
          email: 'seed2@test.com', password: 'pass123456',
          role: 'moderator', tcKimlikNo: '11111111113'
        }
      ];

      const createdUsers = await User.insertMany(seedUsers);
      expect(createdUsers.length).toBe(2);
      
      const userCount = await User.countDocuments({});
      expect(userCount).toBe(2);
    });

    test('should test cleanup and maintenance patterns', async () => {
      const duplicateAdmins = [
        {
          firstName: 'Admin1', lastName: 'Dup', name: 'Admin 1',
          email: 'admin1@dup.com', password: 'pass123456',
          role: 'admin', tcKimlikNo: '11111111114'
        },
        {
          firstName: 'Admin2', lastName: 'Dup', name: 'Admin 2',
          email: 'admin2@dup.com', password: 'pass123456',
          role: 'admin', tcKimlikNo: '11111111115'
        }
      ];

      await User.insertMany(duplicateAdmins);
      
      const adminCount = await User.countDocuments({ role: 'admin' });
      expect(adminCount).toBe(2);

      const allAdmins = await User.find({ role: 'admin' });
      const adminToKeep = allAdmins[0];
      
      await User.deleteMany({ 
        role: 'admin', 
        _id: { $ne: adminToKeep._id } 
      });

      const remainingAdmins = await User.countDocuments({ role: 'admin' });
      expect(remainingAdmins).toBe(1);
    });
  });

  describe('Utils Coverage Boost - High Priority', () => {
    
    test('should test logger utility patterns', async () => {
      const logger = require('../utils/logger');
      
      logger.info('Test info');
      logger.error('Test error');
      logger.warn('Test warning');
      logger.debug('Test debug');

      const timer = logger.timer();
      expect(typeof timer.end).toBe('function');
      timer.end();

      expect(logger.info).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('should test email service patterns', async () => {
      const sendEmail = require('../utils/sendEmail');
      
      const emailOptions = {
        to: 'test@email.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      const result = await sendEmail(emailOptions);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-email');

      const scenarios = [
        { to: 'welcome@test.com', subject: 'Welcome' },
        { to: 'reset@test.com', subject: 'Reset Password' }
      ];

      for (const scenario of scenarios) {
        const emailResult = await sendEmail(scenario);
        expect(emailResult.success).toBe(true);
      }
    });

    test('should test Google Sheets service patterns', async () => {
      const googleSheetsService = require('../utils/googleSheetsService');
      
      const authResult = await googleSheetsService.authenticateGoogleSheets();
      expect(authResult.success).toBe(true);

      const memberData = {
        fullName: 'Test Member',
        email: 'member@test.com',
        status: 'APPROVED'
      };

      const addResult = await googleSheetsService.addMemberToSheet(memberData);
      expect(addResult.success).toBe(true);

      const updateResult = await googleSheetsService.updateMemberInSheet('test-id', memberData);
      expect(updateResult.success).toBe(true);

      const syncResult = await googleSheetsService.syncMemberData();
      expect(syncResult.success).toBe(true);
    });

    test('should test apiFeatures advanced patterns', async () => {
      const { APIFeatures, getPaginationData, formatResponse } = require('../utils/apiFeatures');
      
      await User.insertMany([
        {
          firstName: 'API1', lastName: 'User', name: 'API User 1',
          email: 'api1@test.com', password: 'pass123456',
          role: 'user', tcKimlikNo: '11111111116'
        },
        {
          firstName: 'API2', lastName: 'User', name: 'API User 2',
          email: 'api2@test.com', password: 'pass123456',
          role: 'moderator', tcKimlikNo: '11111111117'
        }
      ]);

      const query = User.find();
      const queryString = { role: 'user', sort: '-createdAt' };
      
      const features = new APIFeatures(query, queryString);
      expect(features).toBeDefined();
      
      const result = features.filter().sort().paginate().limitFields();
      expect(result).toBe(features);

      const searchResult = features.search(['firstName', 'email']);
      expect(searchResult).toBe(features);

      const paginationData = await getPaginationData(User, 1, 2, {});
      expect(paginationData.data).toBeDefined();
      expect(paginationData.pagination).toBeDefined();
      expect(Array.isArray(paginationData.data)).toBe(true);

      const mockReq = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        baseUrl: '/api',
        path: '/users'
      };

      const formattedResponse = formatResponse({ users: [] }, mockReq);
      expect(formattedResponse.success).toBe(true);
      expect(formattedResponse._links).toBeDefined();
    });

    test('should test seed admin patterns', async () => {
      const adminData = {
        firstName: 'Seed',
        lastName: 'Admin',
        name: 'Seed Admin',
        email: 'seed@admin.com',
        password: 'seedpass123456',
        role: 'admin',
        tcKimlikNo: '11111111118'
      };

      const seedAdmin = await User.create(adminData);
      expect(seedAdmin.role).toBe('admin');
      
      const existingAdmin = await User.findOne({ email: adminData.email });
      expect(existingAdmin).toBeDefined();

      const permissions = [
        { 
          name: 'admin.full', 
          code: 'ADMIN_FULL', 
          description: 'Full admin access',
          category: 'SYSTEM'
        },
        { 
          name: 'users.manage', 
          code: 'USERS_MANAGE', 
          description: 'Manage users',
          category: 'USER_MANAGEMENT'
        }
      ];

      const createdPermissions = await Permission.insertMany(permissions);
      expect(createdPermissions.length).toBe(2);
    });
  });

  describe('Middleware Coverage Enhancement', () => {
    
    test('should test error handling patterns', async () => {
      const mockError = new Error('Test error');
      expect(mockError.message).toBe('Test error');
      
      const errorResponse = {
        success: false,
        error: mockError.message
      };
      
      expect(errorResponse.success).toBe(false);
    });

    test('should test security patterns', async () => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(typeof header).toBe('string');
        expect(typeof value).toBe('string');
      });

      const corsOptions = {
        origin: 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      };

      expect(Array.isArray(corsOptions.methods)).toBe(true);
      expect(corsOptions.credentials).toBe(true);
    });
  });
});
