const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Event = require('../../models/event');
const CommunityMember = require('../../models/CommunityMember');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('../../utils/logger');

let mongoServer;

const createValidUserData = (overrides = {}) => ({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@meumt.edu.tr',
  password: 'password123',
  tcKimlikNo: '12345678901',
  studentNumber: 'TEST001',
  role: 'user',
  isActive: true,
  membershipStatus: 'APPROVED',
  ...overrides
});

const createValidAdminData = (overrides = {}) => ({
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@meumt.edu.tr',
  password: 'admin123456',
  tcKimlikNo: '98765432109',
  studentNumber: 'ADMIN001',
  role: 'admin',
  isActive: true,
  membershipStatus: 'APPROVED',
  ...overrides
});

const createValidEventData = (organizerId, overrides = {}) => ({
  title: 'Test Event',
  description: 'Test Event Description',
  eventType: 'concert',
  date: new Date(Date.now() + 86400000), // Tomorrow
  time: '19:00',
  location: {
    name: 'Test Location',
    address: 'Test Address'
  },
  capacity: 50,
  price: 0,
  organizer: organizerId,
  isPublic: true,
  status: 'published', // Valid enum value
  ...overrides
});

const createValidCommunityMemberData = (overrides = {}) => ({
  fullName: 'Test Community Member',
  tcKimlikNo: '11223344556',
  studentNumber: 'STU001',
  phoneNumber: '05551234567',
  department: 'Müzik Teknolojileri',
  status: 'APPROVED',
  applicationSource: 'MANUAL',
  ...overrides
});

const createValidWebsiteMembershipData = (overrides = {}) => ({
  firstName: 'Test',
  lastName: 'Applicant',
  fullName: 'Test Applicant',
  tcKimlikNo: '12345678901',
  studentNumber: 'APP001',
  phone: '05551234567',
  department: 'Müzik Teknolojileri',
  email: 'applicant@meumt.edu.tr',
  password: 'password123',
  applicationStatus: 'PENDING',
  ...overrides
});

const createValidContactData = (overrides = {}) => ({
  name: 'Test User',
  email: 'test@example.com',
  subject: 'Test Subject',
  message: 'Test message content',
  category: 'genel',
  status: 'yeni',
  priority: 'normal',
  ...overrides
});

const createValidGalleryData = (uploadedBy, overrides = {}) => ({
  title: 'Test Gallery Item',
  description: 'Test description',
  category: 'konser',
  coverImage: 'test-cover.jpg',
  images: [{
    filename: 'test-image.jpg',
    originalName: 'test.jpg',
    caption: 'Test image'
  }],
  uploadedBy,
  isPublic: true,
  ...overrides
});

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Test123456',
    role: 'user',
    isActive: true,
    membershipStatus: 'APPROVED',
    googleSheetsValidated: true
  };

  const userData = { ...defaultUser, ...overrides };
  return await User.create(userData);
};

const createTestAdmin = async (overrides = {}) => {
  const defaultAdmin = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@meumt.com',
    password: 'Admin123456',
    role: 'admin',
    isActive: true,
    membershipStatus: 'APPROVED',
    googleSheetsValidated: true
  };

  const adminData = { ...defaultAdmin, ...overrides };
  return await User.create(adminData);
};

const createTestEvent = async (organizerId, eventData = {}) => {
  const validData = createValidEventData(organizerId, eventData);
  const event = await Event.create(validData);
  return event;
};

const createTestCommunityMember = async (overrides = {}) => {
  const defaultMember = {
    firstName: 'Test',
    lastName: 'Member',
    email: 'member@example.com',
    studentNumber: 'TEST123',
    department: 'Computer Science',
    status: 'ACTIVE'
  };

  const memberData = { ...defaultMember, ...overrides };
  return await CommunityMember.create(memberData);
};

const generateTestToken = (userId, role = 'user') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-jwt-secret-key-123456789',
    { expiresIn: '1d' }
  );
};

const generateExpiredToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '-1h' } // Already expired
  );
};

const generateFreshToken = (userId, role = 'user') => {
  const currentTime = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { 
      id: userId, 
      role,
      iat: currentTime
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '24h' }
  );
};

const clearTestData = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

const getCollectionCount = async (collectionName) => {
  const collection = mongoose.connection.collections[collectionName];
  return await collection.countDocuments();
};

const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body).toHaveProperty('data');
};

const expectErrorResponse = (response, statusCode = 400) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body).toHaveProperty('message');
};

const getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`
});

const getUserAuthHeader = async () => {
  const user = await User.findOne({ email: 'test@example.com' });
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  return { token, user };
};

const getAdminAuthHeader = async () => {
  const admin = await User.findOne({ email: 'admin@meumt.com' });
  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  return { token, admin };
};

const generateTestData = {
  user: () => createValidUserData(),
  admin: () => createValidAdminData(),
  event: (organizerId) => createValidEventData(organizerId),
  communityMember: () => createValidCommunityMemberData(),
  websiteMembership: () => createValidWebsiteMembershipData(),
  contact: () => createValidContactData(),
  gallery: (uploadedBy) => createValidGalleryData(uploadedBy)
};

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.use('/api/auth', require('../../api/auth'));
  app.use('/api/suggestions', require('../../api/suggestions'));
  app.use('/api/forum', require('../../api/forum'));
  app.use('/api/website-membership', require('../../api/websiteMembership'));
  app.use('/api/admin', require('../../api/admin'));
  
  app.use((err, req, res, next) => {
    logger.error('Test error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  });

  return app;
};

const connectTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Test MongoDB Connected');
  } catch (error) {
    logger.error('Test MongoDB connection error:', error);
    throw error;
  }
};

const closeTestDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    logger.info('Test MongoDB Disconnected');
  } catch (error) {
    logger.error('Test MongoDB disconnect error:', error);
    throw error;
  }
};

const setupTestDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/meumt_test');
  }
  await clearTestData();
};

const closeTestDatabase = async () => {
  await mongoose.connection.close();
};

module.exports = {
  generateTestData,
  createValidUserData,
  createValidAdminData,
  createValidEventData,
  createValidCommunityMemberData,
  createValidWebsiteMembershipData,
  createValidContactData,
  createValidGalleryData,
  
  createTestUser,
  createTestAdmin,
  createTestEvent,
  createTestCommunityMember,
  
  generateTestToken,
  generateExpiredToken,
  generateFreshToken,
  getAuthHeader,
  getAdminAuthHeader,
  getUserAuthHeader,
  
  clearTestData,
  getCollectionCount,
  
  expectSuccessResponse,
  expectErrorResponse,
  createTestApp,
  connectTestDB,
  closeTestDB,
  setupTestDatabase,
  closeTestDatabase
}; 