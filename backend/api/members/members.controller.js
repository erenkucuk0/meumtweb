const User = require('../../models/User');
const Event = require('../../models/event');
const logger = require('../../utils/logger');

const getMembers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    let query = { 
      isActive: true,
      role: { $in: ['member', 'organizer'] }
    };

    if (req.query.department) {
      query.department = req.query.department;
    }

    if (req.query.instrument) {
      query.instruments = { $in: [req.query.instrument] };
    }

    if (req.query.year) {
      query.year = req.query.year;
    }

    const total = await User.countDocuments(query);
    const members = await User.find(query)
      .select('firstName lastName avatar department instruments year bio joinDate')
      .sort({ joinDate: -1 })
      .limit(limit)
      .skip(startIndex);

    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      pagination,
      data: { members }
    });
  } catch (error) {
    logger.error('Get members error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getMember = async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id)
      .select('firstName lastName avatar department instruments year bio joinDate socialLinks achievements');

    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Üye bulunamadı'
      });
    }

    const organizedEvents = await Event.find({ 
      organizer: req.params.id,
      status: 'completed'
    }).select('title date eventType images').limit(5);

    const participatedEvents = await Event.find({
      'registrations.user': req.params.id,
      status: 'completed'
    }).select('title date eventType images').limit(5);

    res.status(200).json({
      success: true,
      data: { 
        member,
        organizedEvents,
        participatedEvents
      }
    });
  } catch (error) {
    logger.error('Get member error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const updateMemberProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      bio: req.body.bio,
      instruments: req.body.instruments,
      socialLinks: req.body.socialLinks,
      phone: req.body.phone
    };

    if (req.file) {
      fieldsToUpdate.avatar = req.file.filename;
    }

    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const member = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken');

    res.status(200).json({
      success: true,
      data: { member }
    });
  } catch (error) {
    logger.error('Update member profile error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteMember = async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Üye bulunamadı'
      });
    }

    if (member.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Admin kullanıcıları silinemez'
      });
    }

    member.isActive = false;
    await member.save();

    res.status(200).json({
      success: true,
      message: 'Üye deaktive edildi'
    });
  } catch (error) {
    logger.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getMemberStats = async (req, res, next) => {
  try {
    const memberId = req.params.id;

    if (req.user.id !== memberId && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu istatistikleri görme yetkiniz yok'
      });
    }

    const member = await User.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Üye bulunamadı'
      });
    }

    const organizedEventsCount = await Event.countDocuments({ 
      organizer: memberId 
    });

    const participatedEventsCount = await Event.countDocuments({
      'registrations.user': memberId
    });

    const upcomingEventsCount = await Event.countDocuments({
      $or: [
        { organizer: memberId },
        { 'registrations.user': memberId }
      ],
      date: { $gte: new Date() },
      status: { $in: ['published', 'ongoing'] }
    });

    const recentOrganizedEvents = await Event.find({ 
      organizer: memberId 
    })
    .select('title date eventType status')
    .sort({ date: -1 })
    .limit(5);

    const recentParticipatedEvents = await Event.find({
      'registrations.user': memberId
    })
    .select('title date eventType status')
    .sort({ date: -1 })
    .limit(5);

    const stats = {
      organizedEventsCount,
      participatedEventsCount,
      upcomingEventsCount,
      memberSince: member.joinDate,
      recentOrganizedEvents,
      recentParticipatedEvents
    };

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get member stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getActiveMembers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 12;

    const members = await User.find({ 
      isActive: true,
      role: { $in: ['member', 'organizer'] }
    })
    .select('firstName lastName avatar department instruments')
    .sort({ joinDate: -1 })
    .limit(limit);

    res.status(200).json({
      success: true,
      count: members.length,
      data: { members }
    });
  } catch (error) {
    logger.error('Get active members error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const searchMembers = async (req, res, next) => {
  try {
    const { q, department, instrument, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Arama terimi en az 2 karakter olmalıdır'
      });
    }

    let query = {
      isActive: true,
      role: { $in: ['member', 'organizer'] },
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ]
    };

    if (department) {
      query.department = department;
    }

    if (instrument) {
      query.instruments = { $in: [instrument] };
    }

    const members = await User.find(query)
      .select('firstName lastName avatar department instruments')
      .limit(parseInt(limit))
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: { members }
    });
  } catch (error) {
    logger.error('Search members error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

module.exports = {
  getMembers,
  getMember,
  updateMemberProfile,
  deleteMember,
  getMemberStats,
  getActiveMembers,
  searchMembers
}; 