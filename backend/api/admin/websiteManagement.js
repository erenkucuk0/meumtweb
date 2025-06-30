const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const SystemConfig = require('../../models/SystemConfig');
const User = require('../../models/User');
const { protect, admin } = require('../../middleware/auth');
const WebsiteMembershipApplication = require('../../models/WebsiteMembershipApplication');
const googleSheetsManager = require('../../services/googleSheetsManager');

const { HeroSection, TeamMember, WebsiteSettings } = require('../../models/WebsiteContent');
const Event = require('../../models/event');

const adminMiddleware = require('../../middleware/admin');
const { cacheMiddleware, invalidateCache } = require('../../middleware/cache');

const googleSheetsService = require('../../utils/googleSheetsService');

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    switch (true) {
      case req.route.path.includes('hero'):
        uploadPath += 'hero/';
        break;
      case req.route.path.includes('team'):
        uploadPath += 'team/';
        break;
      case req.route.path.includes('events'):
        uploadPath += 'events/';
        break;
      default:
        uploadPath += 'general/';
    }
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'image/avif',
      'image/svg+xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya formatı. Sadece JPEG, JPG, PNG, GIF, WebP, AVIF ve SVG formatları desteklenir.'), false);
    }
  }
});

const handleErrors = (err, req, res, next) => {
  console.error('Website Management Error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: err.message
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      error: Object.values(err.errors).map(e => e.message)
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
    error: err.message
  });
};

const getHeroSections = async (req, res) => {
  try {
    const heroSections = await HeroSection.find()
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: heroSections.length,
      data: heroSections
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const teamMembers = await TeamMember.find()
      .populate('addedBy', 'name email')
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: teamMembers.length,
      data: teamMembers
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
};

const getEvents = async (req, res) => {
  try {
    const { past } = req.query;
    const now = new Date();
    
    let query = Event.find();
    
    if (past === 'true') {
      query = query.where('date').lt(now);
    } else {
      query = query.where('date').gte(now);
    }
    
    const events = await query
      .sort({ date: past === 'true' ? -1 : 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
};

const getCommunityMembers = async (req, res) => {
  try {
    const result = await googleSheetsManager.sync();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch members from Google Sheets');
    }

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Error fetching community members:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const application = await WebsiteMembershipApplication.findById(memberId);
    
    if (!application) {
      throw new Error('Application not found');
    }
    
    if (application.status !== 'pending') {
      throw new Error('This application has already been processed');
    }
    
    const result = await googleSheetsManager.sheetsService.addMemberToSheet({
      fullName: application.fullName,
      studentNumber: application.studentNumber,
      tcKimlikNo: application.tcKimlikNo,
      phoneNumber: application.phoneNumber,
      email: application.email,
      department: application.department,
      year: application.year,
      interests: application.interests,
      experience: application.experience
    });

    if (!result.success) {
      throw new Error(result.message || 'Failed to add member to Google Sheets');
    }

    application.status = 'approved';
    application.processedBy = req.user.id;
    application.processedAt = new Date();
    await application.save();

    invalidateCache('members');

    res.status(200).json({
      success: true,
      message: 'Member approved and added to Google Sheets',
      data: application
    });
  } catch (error) {
    logger.error('Error approving member:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function copyPhotoToHero(photoName) {
  const sourcePath = path.join(__dirname, '../../photos', photoName);
  const destPath = path.join(__dirname, '../../uploads/hero', photoName);
  
  try {
    await fs.copyFile(sourcePath, destPath);
    return photoName;
  } catch (error) {
    logger.error('Error copying photo to hero:', error);
    throw error;
  }
}

const getHeroPhotos = async (req, res) => {
  const photosDir = path.join(__dirname, '../../../photos');
  try {
    const files = await fs.readdir(photosDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'].includes(ext);
    });
    
    res.status(200).json({
      success: true,
      data: imageFiles
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
};

const getAdminEvents = async (req, res) => {
  try {
    const events = await Event.find({}).sort({ date: -1 });
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
};

router.get('/hero', getHeroSections);
router.get('/hero/photos', protect, admin, getHeroPhotos);
router.get('/events', protect, admin, getAdminEvents);
router.post('/hero', protect, admin, upload.single('photo'), async (req, res) => {
  try {
    const { title, subtitle, description } = req.body;
    
    const heroSection = await HeroSection.create({
      title,
      subtitle,
      description,
      backgroundImage: req.file ? req.file.filename : 'default-hero-bg.jpg',
      addedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: heroSection
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.put('/hero/:id', protect, admin, upload.single('photo'), async (req, res) => {
  try {
    const { title, subtitle, description } = req.body;
    const heroSection = await HeroSection.findById(req.params.id);
    
    if (!heroSection) {
      return res.status(404).json({
        success: false,
        message: 'Hero bölümü bulunamadı'
      });
    }
    
    if (req.file) {
      heroSection.backgroundImage = req.file.filename;
    }
    
    heroSection.title = title;
    heroSection.subtitle = subtitle;
    heroSection.description = description;
    await heroSection.save();
    
    res.status(200).json({
      success: true,
      data: heroSection
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.delete('/hero/:id', protect, admin, async (req, res) => {
  try {
    const heroSection = await HeroSection.findById(req.params.id);
    
    if (!heroSection) {
      return res.status(404).json({
        success: false,
        message: 'Hero bölümü bulunamadı'
      });
    }
    
    await HeroSection.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Hero bölümü başarıyla silindi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.post('/team', protect, admin, upload.single('photo'), async (req, res) => {
  try {
    console.log('User object:', req.user);
    console.log('User ID:', req.user.id || req.user._id);
    
    const teamMember = await TeamMember.create({
      ...req.body,
      photo: req.file ? req.file.filename : undefined,
      addedBy: req.user.id || req.user._id // Use either id or _id
    });

    invalidateCache('team');

    res.status(201).json({
      success: true,
      data: teamMember,
      message: 'Ekip üyesi başarıyla eklendi'
    });
  } catch (error) {
    console.error('Team creation error:', error);
    handleErrors(error, req, res);
  }
});

router.put('/team/:id', protect, admin, upload.single('photo'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.photo = req.file.filename;
    }

    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Ekip üyesi bulunamadı'
      });
    }

    invalidateCache('team');

    res.status(200).json({
      success: true,
      data: teamMember,
      message: 'Ekip üyesi başarıyla güncellendi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.delete('/team/:id', protect, admin, async (req, res) => {
  try {
    const teamMember = await TeamMember.findByIdAndDelete(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Ekip üyesi bulunamadı'
      });
    }

    if (teamMember.photo) {
      await fs.unlink(path.join('uploads/team/', teamMember.photo)).catch(err => {
        logger.error('Error deleting team member photo:', err);
      });
    }

    invalidateCache('team');

    res.status(200).json({
      success: true,
      data: {},
      message: 'Ekip üyesi başarıyla silindi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.post('/events', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      image: req.file ? req.file.filename : undefined,
      organizer: req.user._id // Set organizer to current admin user
    });

    invalidateCache('events');

    res.status(201).json({
      success: true,
      data: event,
      message: 'Etkinlik başarıyla eklendi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.put('/events/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı'
      });
    }

    invalidateCache('events');

    res.status(200).json({
      success: true,
      data: event,
      message: 'Etkinlik başarıyla güncellendi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.delete('/events/:id', protect, admin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı'
      });
    }

    if (event.image) {
      await fs.unlink(path.join('uploads/events/', event.image)).catch(err => {
        logger.error('Error deleting event image:', err);
      });
    }

    invalidateCache('events');

    res.status(200).json({
      success: true,
      data: {},
      message: 'Etkinlik başarıyla silindi'
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.get('/config', protect, admin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Sistem yapılandırması bulunamadı'
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    logger.error('Sistem yapılandırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sistem yapılandırması alınamadı',
      error: error.message
    });
  }
});

router.put('/config', protect, admin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    Object.assign(config, req.body);
    await config.save();

    res.json({
      success: true,
      message: 'Sistem yapılandırması güncellendi',
      config
    });
  } catch (error) {
    logger.error('Sistem yapılandırma güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sistem yapılandırması güncellenemedi',
      error: error.message
    });
  }
});

router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    logger.error('İstatistik alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
});

router.get('/settings', protect, admin, async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      settings = await WebsiteSettings.create({
        maintenanceMode: false,
        registrationOpen: true,
        membershipApplicationsOpen: true
      });
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.put('/settings', protect, admin, async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

router.get('/stats', protect, admin, async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      WebsiteMembershipApplication.countDocuments({ status: 'pending' }),
      Event.countDocuments(),
      TeamMember.countDocuments()
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers: stats[0],
        pendingApplications: stats[1],
        totalEvents: stats[2],
        teamMembers: stats[3]
      }
    });
  } catch (error) {
    handleErrors(error, req, res);
  }
});

module.exports = router; 