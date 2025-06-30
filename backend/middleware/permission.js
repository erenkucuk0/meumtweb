const accessControlService = require('../services/accessControlService');
const logger = require('../utils/logger');

const requirePermission = (action, resource) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Bu işlem için giriş yapmanız gerekiyor'
        });
      }

      const actionMap = {
        'approve': 'update',
        'reject': 'update'
      };

      const mappedAction = actionMap[action] || action;

      const rolePermission = await accessControlService.checkPermission(
        req.user, 
        mappedAction, 
        resource, 
        req.body || req.params
      );

      const userPermission = await accessControlService.checkUserPermission(
        req.user, 
        mappedAction, 
        resource
      );

      if (rolePermission.granted || userPermission.granted) {
        req.permission = rolePermission.granted ? rolePermission : userPermission;
        req.permissionType = rolePermission.granted ? 'role' : 'custom';
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: rolePermission.message || 'Bu işlem için yetkiniz yok'
        });
      }
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Yetki kontrolü sırasında hata oluştu'
      });
    }
  };
};

const canReadUsers = requirePermission('readAny', 'users');
const canCreateUsers = requirePermission('createAny', 'users');
const canUpdateUsers = requirePermission('updateAny', 'users');
const canDeleteUsers = requirePermission('deleteAny', 'users');

const canReadOwnUser = requirePermission('readOwn', 'users');
const canUpdateOwnUser = requirePermission('updateOwn', 'users');

const canManageCommunityMembers = requirePermission('updateAny', 'community_members');
const canApproveCommunityMembers = requirePermission('updateAny', 'community_members');
const canRejectCommunityMembers = requirePermission('updateAny', 'community_members');

const canManageSongs = requirePermission('updateAny', 'songs');
const canApproveSongs = requirePermission('updateAny', 'songs');
const canRejectSongs = requirePermission('updateAny', 'songs');

const canManageEvents = requirePermission('updateAny', 'events');
const canCreateEvents = requirePermission('createAny', 'events');
const canDeleteEvents = requirePermission('deleteAny', 'events');

const canManageGallery = requirePermission('updateAny', 'gallery');
const canUploadToGallery = requirePermission('createAny', 'gallery');

const canManageHeroImages = requirePermission('updateAny', 'hero_images');
const canUploadHeroImages = requirePermission('createAny', 'hero_images');

const canManageGoogleSheets = requirePermission('updateAny', 'google_sheets');
const canUploadGoogleSheets = requirePermission('createAny', 'google_sheets');

const canViewStats = requirePermission('readAny', 'stats');

const checkOwnership = (resourceModel, resourceField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceField] || req.params.id;
      const Model = require(`../models/${resourceModel}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Kaynak bulunamadı'
        });
      }

      const isOwner = accessControlService.checkOwnership(req.user, resource);
      
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Bu kaynağa sadece sahibi veya admin erişebilir'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Sahiplik kontrolü sırasında hata oluştu'
      });
    }
  };
};

const validateMembership = async (req, res, next) => {
  try {
    const { studentNumber, fullName } = req.body;
    
    if (!studentNumber || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci numarası ve tam ad gereklidir'
      });
    }

    const googleSheetsService = require('../utils/googleSheetsService');
    
    const sheetCheck = await googleSheetsService.checkStudentExists(null, studentNumber);
    
    if (sheetCheck.success && sheetCheck.exists) {
      const CommunityMember = require('../models/CommunityMember');
      
      let member = await CommunityMember.findOne({ studentNumber: studentNumber });
      
      if (!member) {
        const User = require('../models/User');
        const adminUser = await User.findOne({ role: 'admin' });
        
        const memberData = {
          fullName: fullName.trim(),
          studentNumber: studentNumber,
          status: 'APPROVED',
          isFromGoogleSheets: true,
          applicationSource: 'IMPORT'
        };
        
        if (req.body.email) {
          memberData.email = req.body.email;
        }
        if (req.body.tcKimlikNo && req.body.tcKimlikNo.trim()) {
          memberData.tcKimlikNo = req.body.tcKimlikNo.trim();
        }
        if (adminUser && adminUser._id) {
          memberData.reviewedBy = adminUser._id;
          memberData.approvalDate = new Date();
          memberData.reviewNotes = 'Automatically approved from Google Sheets validation';
        }
        
        member = await CommunityMember.create(memberData);
        
        logger.info(`Auto-created community member from Google Sheets: ${fullName} (${studentNumber})`);
      }
      
      req.communityMember = member;
      return next();
    }

    const CommunityMember = require('../models/CommunityMember');
    const member = await CommunityMember.findOne({
      $and: [
        { studentNumber: studentNumber },
        { status: 'APPROVED' },
        { fullName: { $regex: new RegExp(fullName.trim(), 'i') } }
      ]
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Google Sheets\'te kayıtlı olmayan öğrenciler web sitesine kayıt olamaz. Lütfen önce topluluk üyeliği için başvuru yapın.'
      });
    }

    req.communityMember = member;
    next();
  } catch (error) {
    logger.error('Membership validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Üyelik kontrolü sırasında hata oluştu'
    });
  }
};

const hasRoleOrHigher = (minimumRole) => {
  const roleHierarchy = {
    user: 0,
    event_manager: 1,
    content_manager: 1,
    moderator: 2,
    admin: 3
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bu işlem için giriş yapmanız gerekiyor'
      });
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;

    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yeterli yetkiniz yok'
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  
  canReadUsers,
  canCreateUsers,
  canUpdateUsers,
  canDeleteUsers,
  canReadOwnUser,
  canUpdateOwnUser,
  
  canManageCommunityMembers,
  canApproveCommunityMembers,
  canRejectCommunityMembers,
  
  canManageSongs,
  canApproveSongs,
  canRejectSongs,
  
  canManageEvents,
  canCreateEvents,
  canDeleteEvents,
  
  canManageGallery,
  canUploadToGallery,
  
  canManageHeroImages,
  canUploadHeroImages,
  
  canManageGoogleSheets,
  canUploadGoogleSheets,
  
  canViewStats,
  
  checkOwnership,
  validateMembership,
  hasRoleOrHigher
}; 