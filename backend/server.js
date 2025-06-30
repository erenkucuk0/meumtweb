require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/error');
const initializeSystem = require('./scripts/systemInitialization');

const authRouter = require('./api/auth');
const websiteContentRouter = require('./api/websiteContent');
const eventsRouter = require('./api/events/events.routes');
const membersRouter = require('./api/members/members.routes');
const usersRouter = require('./api/users/users.routes');
const forumRouter = require('./api/forum/forum.routes');
const galleryRouter = require('./api/gallery/gallery.routes');
const contactRouter = require('./api/contact/contact.routes');
const communityRouter = require('./api/community');
const membershipRouter = require('./api/membership');
const websiteMembershipRouter = require('./api/websiteMembership');
const adminSheetsRouter = require('./api/admin/sheets');
const adminMembersRouter = require('./api/admin/members');
const adminWebsiteRouter = require('./api/admin/websiteManagement');
const adminUsersRouter = require('./api/admin/userManagement');

const app = express();

app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(mongoSanitize());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(xss());
app.use(hpp());
app.use(cors());
app.use(compression());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MEÜMT API Documentation'
}));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

app.use('/api/auth', authRouter);
app.use('/api/website', websiteContentRouter);
app.use('/api/events', eventsRouter);
app.use('/api/members', membersRouter);
app.use('/api/users', usersRouter);
app.use('/api/forum', forumRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/contact', contactRouter);
app.use('/api/community', communityRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/website-membership', websiteMembershipRouter);
app.use('/api/admin/sheets', adminSheetsRouter);
app.use('/api/admin/members', adminMembersRouter);
app.use('/api/admin/website', adminWebsiteRouter);
app.use('/api/admin/users', adminUsersRouter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(errorHandler);

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('✅ MongoDB bağlantısı başarılı');
    
    await initializeSystem();
    logger.info('✅ Sistem başlangıç betikleri tamamlandı.');

    const server = app.listen(
      PORT,
      () => {
        logger.info(`🚀 Sunucu ${process.env.NODE_ENV} modunda ${PORT} portunda çalışıyor`);
        logger.info(`📚 API Dokümantasyonu: http://localhost:${PORT}/api-docs`);
      }
    );

    process.on('unhandledRejection', (err, promise) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    logger.error(`❌ Sunucu başlatılamadı: ${error.message}`);
    process.exit(1);
  }
};

startServer(); 