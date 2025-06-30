const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SystemConfig = require('../models/SystemConfig');
const { protect, admin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { HeroSection, TeamMember, WebsiteSettings } = require('../models/WebsiteContent');
const Event = require('../models/event');
const upload = require('../middleware/upload');
const mongoose = require('mongoose');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads', file.fieldname);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG and GIF are allowed.'), false);
  }
};

const uploadMulter = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const cacheMiddleware = (duration) => (req, res, next) => next();


router.get('/hero', async (req, res) => {
  try {
    logger.info('Starting to fetch hero sections');
    
    if (!mongoose.connection.readyState) {
      logger.error('Database connection is not ready');
      throw new Error('Database connection error');
    }

    let heroSections;
    try {
      heroSections = await HeroSection.find({ isActive: true })
        .sort({ order: 1 })
        .lean()
        .exec();
      
      logger.info(`Successfully executed hero sections query, found ${heroSections ? heroSections.length : 0} sections`);
    } catch (queryError) {
      logger.error('Database query error:', queryError);
      throw new Error('Database query failed');
    }
    
    if (!heroSections) {
      logger.warn('Hero sections query returned null or undefined');
      heroSections = [];
    }
    
    const sanitizedSections = heroSections.map(section => ({
      _id: section._id,
      title: section.title || '',
      subtitle: section.subtitle || '',
      description: section.description || '',
      backgroundImage: section.backgroundImage || 'default-hero-bg.jpg',
      isActive: section.isActive || false,
      order: section.order || 0,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt
    }));
    
    logger.info(`Returning ${sanitizedSections.length} hero sections`);
    res.status(200).json({
      success: true,
      count: sanitizedSections.length,
      data: sanitizedSections
    });
  } catch (error) {
    logger.error('Hero sections endpoint error:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: 'Hero bölümleri getirilemedi',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/team', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find({ isActive: true })
      .sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      count: teamMembers.length,
      data: teamMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ekip üyeleri getirilemedi',
      error: error.message
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    logger.info('Fetching website settings');
    let settings = await WebsiteSettings.findOne().lean();
    
    if (!settings) {
      logger.info('No settings found, creating default settings');
      settings = await WebsiteSettings.create({
        siteName: 'MEÜMT',
        siteDescription: 'Mersin Üniversitesi Müzik Teknolojileri',
        logo: 'default-logo.png',
        socialMedia: {},
        contactEmail: '',
        contactPhone: '',
        address: ''
      });
    }
    
    logger.info('Website settings retrieved successfully');
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching website settings:', error);
    res.status(500).json({
      success: false,
      message: 'Website ayarları getirilemedi',
      error: error.message
    });
  }
});

router.get('/events/:id', cacheMiddleware(300), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('title description date time location image organizer eventType -registrations -maxParticipants -registrationDeadline')
      .lean();
    
    if (!event || !event.isPublic) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı'
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik getirilemedi',
      error: error.message
    });
  }
});

router.get('/team/:id', cacheMiddleware(600), async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id)
      .select('-__v -addedBy')
      .lean();
    
    if (!teamMember || !teamMember.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Ekip üyesi bulunamadı'
      });
    }
    
    res.status(200).json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ekip üyesi getirilemedi',
      error: error.message
    });
  }
});


router.get('/stats', cacheMiddleware(1800), async (req, res) => {
  try {
    const [teamCount, eventsCount, heroCount] = await Promise.all([
      TeamMember.countDocuments({ isActive: true }),
      Event.countDocuments({ isPublic: true }),
      HeroSection.countDocuments({ isActive: true })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        teamMembers: teamCount,
        totalEvents: eventsCount,
        heroSections: heroCount,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilemedi',
      error: error.message
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Arama terimi en az 2 karakter olmalıdır'
      });
    }
    
    const searchTerm = q.trim();
    const searchRegex = new RegExp(searchTerm, 'i');
    
    let results = {};
    
    if (type === 'all' || type === 'events') {
      results.events = await Event.find({
        isPublic: true,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex }
        ]
      })
      .select('title description date time location image')
      .limit(5)
      .lean();
    }
    
    if (type === 'all' || type === 'team') {
      results.team = await TeamMember.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { title: searchRegex },
          { bio: searchRegex }
        ]
      })
      .select('name title photo bio')
      .limit(5)
      .lean();
    }
    
    if (type === 'all' || type === 'hero') {
      results.hero = await HeroSection.find({
        isActive: true,
        $or: [
          { title: searchRegex },
          { subtitle: searchRegex },
          { description: searchRegex }
        ]
      })
      .select('title subtitle description backgroundImage')
      .limit(3)
      .lean();
    }
    
    const totalResults = Object.values(results).reduce((total, items) => total + items.length, 0);
    
    res.status(200).json({
      success: true,
      query: searchTerm,
      totalResults,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Arama işlemi başarısız',
      error: error.message
    });
  }
});

router.get('/hero', async (req, res) => {
  try {
    const heroSection = await HeroSection.findOne({ isActive: true });
    
    res.status(200).json({
      success: true,
      data: heroSection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Hero section getirilemedi',
      error: error.message
    });
  }
});

router.put('/hero', protect, admin, uploadMulter.single('image'), async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Website configuration not found'
      });
    }

    const { title, subtitle, description } = req.body;
    const updateData = {
      title: title || config.website.hero.title,
      subtitle: subtitle || config.website.hero.subtitle,
      description: description || config.website.hero.description,
      image: config.website.hero.image
    };

    if (req.file) {
      if (config.website.hero.image) {
        const oldImagePath = path.join(__dirname, '..', config.website.hero.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/hero/${req.file.filename}`;
    }

    const result = await config.updateWebsiteConfig('hero', updateData);
    if (!result.success) {
      throw new Error(result.message);
    }

    res.status(200).json({
      success: true,
      message: 'Hero section updated successfully',
      data: updateData
    });
  } catch (error) {
    logger.error('Error updating hero section:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hero section'
    });
  }
});

router.get('/team', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find({ isActive: true })
      .sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      data: teamMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ekip üyeleri getirilemedi',
      error: error.message
    });
  }
});

router.post('/team', protect, admin, uploadMulter.single('photo'), async (req, res) => {
  try {
    let memberData = req.body;
    
    if (req.file) {
      memberData.photo = req.file.path;
    }
    
    memberData.addedBy = req.user._id;
    
    const teamMember = await TeamMember.create(memberData);
    
    res.status(201).json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ekip üyesi eklenemedi',
      error: error.message
    });
  }
});

router.put('/team/:id', protect, admin, uploadMulter.single('photo'), async (req, res) => {
  try {
    let memberData = req.body;
    
    if (req.file) {
      memberData.photo = req.file.path;
    }
    
    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { $set: memberData },
      { new: true, runValidators: true }
    );
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Ekip üyesi bulunamadı'
      });
    }
    
    res.status(200).json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ekip üyesi güncellenemedi',
      error: error.message
    });
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
    
    res.status(200).json({
      success: true,
      message: 'Ekip üyesi başarıyla silindi'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ekip üyesi silinemedi',
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Website content not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config.website
    });
  } catch (error) {
    logger.error('Error getting website content:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting website content'
    });
  }
});

router.put('/about', protect, admin, uploadMulter.single('image'), async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Website configuration not found'
      });
    }

    const { title, content } = req.body;
    const updateData = {
      title: title || config.website.about.title,
      content: content || config.website.about.content,
      image: config.website.about.image
    };

    if (req.file) {
      if (config.website.about.image) {
        const oldImagePath = path.join(__dirname, '..', config.website.about.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/about/${req.file.filename}`;
    }

    const result = await config.updateWebsiteConfig('about', updateData);
    if (!result.success) {
      throw new Error(result.message);
    }

    res.status(200).json({
      success: true,
      message: 'About section updated successfully',
      data: updateData
    });
  } catch (error) {
    logger.error('Error updating about section:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating about section'
    });
  }
});

router.put('/contact', protect, admin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Website configuration not found'
      });
    }

    const { email, phone, address, socialMedia } = req.body;
    const updateData = {
      email: email || config.website.contact.email,
      phone: phone || config.website.contact.phone,
      address: address || config.website.contact.address,
      socialMedia: {
        facebook: socialMedia?.facebook || config.website.contact.socialMedia.facebook,
        instagram: socialMedia?.instagram || config.website.contact.socialMedia.instagram,
        twitter: socialMedia?.twitter || config.website.contact.socialMedia.twitter,
        youtube: socialMedia?.youtube || config.website.contact.socialMedia.youtube
      }
    };

    const result = await config.updateWebsiteConfig('contact', updateData);
    if (!result.success) {
      throw new Error(result.message);
    }

    res.status(200).json({
      success: true,
      message: 'Contact section updated successfully',
      data: updateData
    });
  } catch (error) {
    logger.error('Error updating contact section:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact section'
    });
  }
});

module.exports = router; 