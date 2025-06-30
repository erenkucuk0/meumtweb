const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['CONTENT', 'USER_MANAGEMENT', 'COMMUNITY', 'SYSTEM'],
    default: 'CONTENT'
  },
  resource: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  roles: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

permissionSchema.index({ category: 1, isActive: 1 });
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

permissionSchema.statics.createDefaultPermissions = async function() {
  const defaultPermissions = [
    {
      name: 'Hero Fotoğraflarını Yönet',
      code: 'MANAGE_HERO_IMAGES',
      description: 'Hero kısmındaki fotoğrafları değiştirme yetkisi (1-5 adet)',
      category: 'CONTENT',
      resource: 'hero',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Şarkı Önerilerini Yönet',
      code: 'MANAGE_SONG_SUGGESTIONS',
      description: 'Üye şarkı önerilerini onaylama/reddetme ve silme yetkisi (7-10 adet)',
      category: 'CONTENT',
      resource: 'songs',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Etkinlikleri Yönet',
      code: 'MANAGE_EVENTS',
      description: 'Yaklaşan etkinlikleri ekleme/çıkarma yetkisi (1-3 adet)',
      category: 'CONTENT',
      resource: 'events',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Forum Yönetimi',
      code: 'MANAGE_FORUM',
      description: 'Forum başlıklarını ve yazılarını silme yetkisi',
      category: 'CONTENT',
      resource: 'forum',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Topluluk Üyelik Onayı',
      code: 'APPROVE_COMMUNITY_MEMBERS',
      description: 'Topluluğa üye olmak isteyen kişileri onaylama/reddetme yetkisi',
      category: 'COMMUNITY',
      resource: 'community',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Site Üye Yönetimi',
      code: 'MANAGE_SITE_USERS',
      description: 'Siteye üye olan kişilerin kayıtlarını silme yetkisi',
      category: 'USER_MANAGEMENT',
      resource: 'users',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Yetki Dağıtımı',
      code: 'DISTRIBUTE_PERMISSIONS',
      description: 'Diğer kullanıcılara yetki verme/alma yetkisi',
      category: 'SYSTEM',
      resource: 'permissions',
      action: 'manage',
      roles: ['admin']
    },
    {
      name: 'Sistem Ayarları',
      code: 'MANAGE_SYSTEM_SETTINGS',
      description: 'Üyelik ücreti, IBAN bilgileri vb. sistem ayarlarını düzenleme',
      category: 'SYSTEM',
      resource: 'settings',
      action: 'manage',
      roles: ['admin']
    }
  ];

  for (const permData of defaultPermissions) {
    await this.findOneAndUpdate(
      { code: permData.code },
      permData,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Permission', permissionSchema); 