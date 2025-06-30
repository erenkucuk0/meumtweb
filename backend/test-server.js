const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('./utils/logger');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-123456789';
process.env.JWT_EXPIRE = '1h';

let mongoServer;

global.beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

global.afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false }));
  
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('combined'));
  }

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const authRoutes = require('./api/auth');
  const communityRoutes = require('./api/community');
  const forumRoutes = require('./api/forum/forum.routes');
  const songsRoutes = require('./api/songs/suggestions.routes');
  const adminUserRoutes = require('./api/admin/userManagement');
  const adminMemberRoutes = require('./api/admin/members');
  const adminSheetsRoutes = require('./api/admin/sheets');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/songs', songsRoutes);
  app.use('/api/admin/users', adminUserRoutes);
  app.use('/api/admin/members', adminMemberRoutes);
  app.use('/api/admin/sheets', adminSheetsRoutes);

  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  return app;
};

module.exports = createTestApp; 