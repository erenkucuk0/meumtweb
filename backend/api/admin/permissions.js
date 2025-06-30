const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const accessControlService = require('../../services/accessControlService');
const { protect } = require('../../middleware/auth');
const { hasRoleOrHigher } = require('../../middleware/permission');
const logger = require('../../utils/logger');

router.get('/users', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    const query = {
      ...(search && {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }),
      ...(role && { role })
    };

    const users = await User.find(query)
      .select('-password')
      .populate('communityMember', 'fullName studentNumber status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar getirilirken hata oluştu'
    });
  }
});

router.put('/users/:id/role', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['admin', 'moderator', 'content_manager', 'event_manager', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir rol seçiniz'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi rolünüzü değiştiremezsiniz'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    logger.info(`User role updated by ${req.user.username}: ${user.username} ${oldRole} -> ${role}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı rolü başarıyla güncellendi',
      data: {
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions
        }
      }
    });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı rolü güncellenirken hata oluştu'
    });
  }
});

router.post('/users/:id/permissions', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const { resource, actions, conditions = {} } = req.body;
    
    if (!resource || !actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        message: 'Kaynak ve eylemler gereklidir'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    await accessControlService.addUserPermission(user._id, resource, actions, conditions);

    const updatedUser = await User.findById(user._id).select('-password');

    logger.info(`Custom permission added by ${req.user.username} to ${user.username}: ${resource} - ${actions.join(', ')}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcıya özel yetki başarıyla eklendi',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Add user permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı yetkisi eklenirken hata oluştu'
    });
  }
});

router.delete('/users/:id/permissions', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const { resource, actions } = req.body;
    
    if (!resource) {
      return res.status(400).json({
        success: false,
        message: 'Kaynak gereklidir'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    await accessControlService.removeUserPermission(user._id, resource, actions);

    const updatedUser = await User.findById(user._id).select('-password');

    logger.info(`Custom permission removed by ${req.user.username} from ${user.username}: ${resource}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı yetkisi başarıyla kaldırıldı',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Remove user permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı yetkisi kaldırılırken hata oluştu'
    });
  }
});

router.get('/resources', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const resources = {
      users: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Kullanıcı yönetimi'
      },
      community_members: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Topluluk üyeleri yönetimi'
      },
      songs: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Şarkı yönetimi'
      },
      events: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Etkinlik yönetimi'
      },
      gallery: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Galeri yönetimi'
      },
      hero_images: {
        actions: ['create', 'read', 'update', 'delete'],
        scopes: ['own', 'any'],
        description: 'Ana sayfa görselleri'
      },
      system_settings: {
        actions: ['read', 'update', 'manage'],
        scopes: ['any'],
        description: 'Sistem ayarları'
      },
      google_sheets: {
        actions: ['read', 'upload', 'download', 'manage'],
        scopes: ['any'],
        description: 'Google Sheets entegrasyonu'
      },
      stats: {
        actions: ['read'],
        scopes: ['any'],
        description: 'İstatistikler'
      }
    };

    res.status(200).json({
      success: true,
      data: { resources }
    });
  } catch (error) {
    logger.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Kaynaklar getirilirken hata oluştu'
    });
  }
});

router.get('/roles', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const grants = accessControlService.getGrants();
    
    const roleDescriptions = {
      admin: 'Sistem yöneticisi - Tüm yetkilere sahip',
      moderator: 'Moderatör - Üye ve şarkı onaylama yetkisi',
      content_manager: 'İçerik yöneticisi - Şarkı ve galeri yönetimi',
      event_manager: 'Etkinlik yöneticisi - Etkinlik yönetimi',
      user: 'Kullanıcı - Temel yetkiler'
    };

    const rolesWithDescriptions = Object.keys(grants).map(role => ({
      role,
      description: roleDescriptions[role] || 'Açıklama yok',
      permissions: grants[role]
    }));

    res.status(200).json({
      success: true,
      data: {
        roles: rolesWithDescriptions
      }
    });
  } catch (error) {
    logger.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Roller getirilirken hata oluştu'
    });
  }
});

router.put('/users/:id/status', protect, hasRoleOrHigher('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir durum seçiniz'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı deaktif edemezsiniz'
      });
    }

    user.isActive = isActive;
    await user.save();

    logger.info(`User ${isActive ? 'activated' : 'deactivated'} by ${req.user.username}: ${user.username}`);

    res.status(200).json({
      success: true,
      message: `Kullanıcı başarıyla ${isActive ? 'aktif' : 'deaktif'} edildi`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu güncellenirken hata oluştu'
    });
  }
});

module.exports = router; 