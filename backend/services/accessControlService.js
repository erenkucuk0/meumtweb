const AccessControl = require('accesscontrol');
const Permission = require('../models/Permission');
const logger = require('../utils/logger');

class AccessControlService {
  constructor() {
    this.ac = new AccessControl();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const actionMap = {
        'approve': 'update',
        'reject': 'update'
      };

      try {
        await Permission.deleteMany({
          $or: [
            { 'actions': 'approve' },
            { 'actions': 'reject' },
            { 'actions': { $in: ['approve', 'reject'] } }
          ]
        });
        logger.info('Cleaned up invalid permissions from database');
      } catch (cleanupError) {
        logger.warn('Could not clean up permissions:', cleanupError.message);
      }

      const safeGrants = {
        admin: {
          users: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          community_members: {
            'create:any': ['*'],
            'read:any': ['*'], 
            'update:any': ['*'],
            'delete:any': ['*']
          },
          songs: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'], 
            'delete:any': ['*']
          },
          events: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          gallery: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          hero_images: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          system_settings: {
            'read:any': ['*'],
            'update:any': ['*'],
            'create:any': ['*']
          },
          google_sheets: {
            'read:any': ['*'],
            'create:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          stats: {
            'read:any': ['*']
          }
        },

        moderator: {
          users: {
            'read:any': ['*', '!password', '!email']
          },
          community_members: {
            'read:any': ['*'],
            'update:any': ['status', 'notes']
          },
          songs: {
            'read:any': ['*'],
            'update:any': ['status', 'notes']
          },
          events: {
            'read:any': ['*']
          },
          gallery: {
            'read:any': ['*']
          },
          stats: {
            'read:any': ['community_stats', 'song_stats']
          }
        },

        content_manager: {
          users: {
            'read:any': ['username', 'fullName', 'role']
          },
          songs: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          gallery: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          hero_images: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          stats: {
            'read:any': ['content_stats']
          }
        },

        event_manager: {
          users: {
            'read:any': ['username', 'fullName', 'role']
          },
          events: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*']
          },
          stats: {
            'read:any': ['event_stats']
          }
        },

        user: {
          users: {
            'read:own': ['*', '!password'],
            'update:own': ['*', '!role', '!permissions', '!isActive']
          },
          community_members: {
            'create:own': ['*'],
            'read:own': ['*']
          },
          songs: {
            'create:own': ['*', '!status'],
            'read:any': ['*'],
            'update:own': ['*', '!status'],
            'delete:own': ['*']
          },
          events: {
            'read:any': ['*']
          },
          gallery: {
            'read:any': ['*']
          }
        }
      };

      this.ac.setGrants(safeGrants);
      this.isInitialized = true;
      logger.info('AccessControl initialized successfully with safe grants');

    } catch (error) {
      logger.error('Failed to initialize AccessControl:', error);
      
      try {
        const fallbackGrants = {
          admin: {
            users: { 'create:any': ['*'], 'read:any': ['*'], 'update:any': ['*'], 'delete:any': ['*'] },
            community_members: { 'create:any': ['*'], 'read:any': ['*'], 'update:any': ['*'], 'delete:any': ['*'] },
            songs: { 'create:any': ['*'], 'read:any': ['*'], 'update:any': ['*'], 'delete:any': ['*'] },
            events: { 'create:any': ['*'], 'read:any': ['*'], 'update:any': ['*'], 'delete:any': ['*'] },
            gallery: { 'create:any': ['*'], 'read:any': ['*'], 'update:any': ['*'], 'delete:any': ['*'] },
            stats: { 'read:any': ['*'] }
          },
          user: {
            users: { 'read:own': ['*', '!password'], 'update:own': ['*', '!role'] }
          }
        };
        
        this.ac.setGrants(fallbackGrants);
        this.isInitialized = true;
        logger.info('AccessControl initialized with fallback grants');
        
      } catch (fallbackError) {
        logger.error('Even fallback AccessControl initialization failed:', fallbackError);
        this.isInitialized = true;
      }
    }
  }

  can(role, action, resource) {
    if (!this.isInitialized) {
      throw new Error('AccessControl not initialized');
    }
    
    return this.ac.can(role)[action](resource);
  }

  grant(role) {
    if (!this.isInitialized) {
      throw new Error('AccessControl not initialized');
    }
    
    return this.ac.grant(role);
  }

  deny(role) {
    if (!this.isInitialized) {
      throw new Error('AccessControl not initialized');
    }
    
    return this.ac.deny(role);
  }

  getGrants() {
    return this.ac.getGrants();
  }

  async checkPermission(user, action, resource, resourceData = null) {
    try {
      const permission = this.can(user.role, action, resource);
      
      if (!permission.granted) {
        return {
          granted: false,
          message: 'Bu işlem için yetkiniz yok'
        };
      }

      if (action.includes('Own') && resourceData) {
        const isOwner = this.checkOwnership(user, resourceData);
        if (!isOwner) {
          return {
            granted: false,
            message: 'Bu kaynağa sadece sahibi erişebilir'
          };
        }
      }

      return {
        granted: true,
        attributes: permission.attributes,
        filter: permission.filter
      };
    } catch (error) {
      logger.error('Permission check error:', error);
      return {
        granted: false,
        message: 'Yetki kontrolü sırasında hata oluştu'
      };
    }
  }

  checkOwnership(user, resourceData) {
    if (!resourceData) return false;
    
    return resourceData.userId?.toString() === user._id.toString() ||
           resourceData.createdBy?.toString() === user._id.toString() ||
           resourceData._id?.toString() === user._id.toString();
  }

  async addUserPermission(userId, resource, actions, conditions = {}) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const existingPermission = user.permissions.find(p => p.resource === resource);
      
      if (existingPermission) {
        existingPermission.actions = [...new Set([...existingPermission.actions, ...actions])];
        existingPermission.conditions = { ...existingPermission.conditions, ...conditions };
      } else {
        user.permissions.push({
          resource,
          actions,
          conditions
        });
      }

      await user.save();
      logger.info(`Permission added to user ${user.username}: ${resource} - ${actions.join(', ')}`);
      
      return true;
    } catch (error) {
      logger.error('Add user permission error:', error);
      throw error;
    }
  }

  async removeUserPermission(userId, resource, actions = null) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      if (actions) {
        const permission = user.permissions.find(p => p.resource === resource);
        if (permission) {
          permission.actions = permission.actions.filter(action => !actions.includes(action));
          if (permission.actions.length === 0) {
            user.permissions = user.permissions.filter(p => p.resource !== resource);
          }
        }
      } else {
        user.permissions = user.permissions.filter(p => p.resource !== resource);
      }

      await user.save();
      logger.info(`Permission removed from user ${user.username}: ${resource}`);
      
      return true;
    } catch (error) {
      logger.error('Remove user permission error:', error);
      throw error;
    }
  }

  async checkUserPermission(user, action, resource) {
    const userPermission = user.permissions?.find(p => p.resource === resource);
    
    if (userPermission && userPermission.actions.includes(action)) {
      return {
        granted: true,
        conditions: userPermission.conditions
      };
    }
    
    return { granted: false };
  }
}

const accessControlService = new AccessControlService();

module.exports = accessControlService; 