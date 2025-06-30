const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['main', 'google_sheets', 'payment', 'social_media'],
    default: 'main'
  },

  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  membershipFee: {
    amount: {
      type: Number,
      required: function() { return this.type === 'main'; },
      min: [0, 'Üyelik ücreti 0\'dan küçük olamaz'],
      default: 50
    },
    currency: {
      type: String,
      default: 'TL',
      enum: ['TL', 'USD', 'EUR']
    }
  },
  
  paymentInfo: {
    ibanNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^TR\d{2}(\s?\d{4}){5}\s?\d{2}$/, 'Geçerli bir TR IBAN numarası giriniz'],
      default: 'TR00 0000 0000 0000 0000 0000 00'
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      default: 'Türkiye İş Bankası'
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      default: 'MEUMT Topluluk Hesabı'
    },
    description: {
      type: String,
      trim: true,
      default: 'Üyelik ücretinizi bu hesaba yatırarak dekont fotoğrafını yükleyiniz.'
    }
  },
  
  heroSection: {
    maxImages: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    minImages: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    }
  },
  
  songSuggestions: {
    maxSongs: {
      type: Number,
      min: 7,
      max: 15,
      default: 10
    },
    minSongs: {
      type: Number,
      min: 5,
      max: 10,
      default: 7
    },
    autoApproval: {
      type: Boolean,
      default: false
    }
  },
  
  eventsSection: {
    maxEvents: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    minEvents: {
      type: Number,
      min: 1,
      max: 3,
      default: 1
    }
  },
  
  siteSettings: {
    siteName: {
      type: String,
      required: true,
      trim: true,
      default: 'MEUMT Müzik Topluluğu'
    },
    siteDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Site açıklaması en fazla 500 karakter olabilir'],
      default: 'Mersin Üniversitesi Müzik Topluluğu resmi web sitesi'
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz'],
      default: 'iletisim@meumt.com'
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Geçerli bir telefon numarası giriniz']
    }
  },
  
  socialMedia: {
    twitter: {
      type: String,
      trim: true,
      default: 'https://twitter.com/meumt'
    },
    instagram: {
      type: String,
      trim: true,
      default: 'https://instagram.com/meumt'
    },
    youtube: {
      type: String,
      trim: true,
      default: 'https://youtube.com/@meumt'
    },
    tiktok: {
      type: String,
      trim: true,
      default: 'https://tiktok.com/@meumt'
    }
  },
  
  googleSheets: {
    url: {
      type: String,
      trim: true
    },
    spreadsheetId: {
      type: String,
      trim: true
    },
    sheetName: {
      type: String,
      default: 'Sheet1',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    autoSync: {
      type: Boolean,
      default: true
    },
    isConfigured: {
      type: Boolean,
      default: false
    },
    lastSync: {
      type: Date,
      default: null
    }
  },
  
  googleServiceAccountKey: {
    type: String,
    trim: true
  },
  
  fileUpload: {
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB
    },
    allowedTypes: {
      images: [String],
      documents: [String]
    }
  },
  
  security: {
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    },
    passwordMinLength: {
      type: Number,
      default: 6
    }
  },
  
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    newMemberApproval: {
      type: Boolean,
      default: true
    },
    songSuggestions: {
      type: Boolean,
      default: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isInitialized: {
    type: Boolean,
    default: false
  },
  lastInitialization: {
    type: Date
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  allowRegistration: {
    type: Boolean,
    default: true
  },
  autoApproveMembers: {
    type: Boolean,
    default: false
  },
  googleSheetsEnabled: {
    type: Boolean,
    default: true
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  totalMembers: {
    type: Number,
    default: 0
  },
  totalEvents: {
    type: Number,
    default: 0
  },
  systemVersion: {
    type: String,
    default: '1.0.0'
  },
  lastBackup: {
    type: Date
  },
  lastGoogleSheetsSync: {
    type: Date
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    autoBackup: {
      type: Boolean,
      default: true
    },
    backupInterval: {
      type: Number,
      default: 24 // hours
    },
    sessionTimeout: {
      type: Number,
      default: 30 // days
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 15 // minutes
    }
  },
  website: {
    hero: {
      title: {
        type: String,
        default: 'MEUMT'
      },
      subtitle: {
        type: String,
        default: 'Müzik Topluluğu'
      },
      description: {
        type: String,
        default: 'Mersin Üniversitesi Müzik Topluluğu'
      },
      image: {
        type: String,
        default: '/uploads/hero/default-hero.jpg'
      }
    },
    about: {
      title: {
        type: String,
        default: 'Hakkımızda'
      },
      content: {
        type: String,
        default: 'MEUMT hakkında bilgi'
      },
      image: {
        type: String,
        default: '/uploads/about/default-about.jpg'
      }
    },
    contact: {
      email: {
        type: String,
        default: 'info@meumt.com'
      },
      phone: {
        type: String,
        default: '+90 555 555 5555'
      },
      address: {
        type: String,
        default: 'Mersin Üniversitesi'
      },
      socialMedia: {
        facebook: {
          type: String,
          default: 'https://facebook.com/meumt'
        },
        instagram: {
          type: String,
          default: 'https://instagram.com/meumt'
        },
        twitter: {
          type: String,
          default: 'https://twitter.com/meumt'
        },
        youtube: {
          type: String,
          default: 'https://youtube.com/meumt'
        }
      }
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

systemConfigSchema.virtual('formattedMembershipFee').get(function() {
  return `${this.membershipFee.amount} ${this.membershipFee.currency}`;
});

systemConfigSchema.virtual('formattedIBAN').get(function() {
  if (!this.paymentInfo.ibanNumber) return '';
  return this.paymentInfo.ibanNumber.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
});

systemConfigSchema.index({ isActive: 1 });
systemConfigSchema.index({ 'lastUpdatedBy': 1 });

systemConfigSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  this.lastUpdated = new Date();
  next();
});

systemConfigSchema.statics.getCurrentConfig = async function() {
  let config = await this.findOne({ isActive: true });
  
  if (!config) {
    config = await this.create({
      isActive: true,
      version: '1.0.0'
    });
  }
  
  return config;
};

systemConfigSchema.statics.updateConfig = async function(updates, updatedByUserId) {
  const config = await this.getCurrentConfig();
  
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      config[key] = updates[key];
    }
  });
  
  config.lastUpdatedBy = updatedByUserId;
  config.version = this.incrementVersion(config.version);
  
  return await config.save();
};

systemConfigSchema.statics.incrementVersion = function(currentVersion) {
  const versionParts = currentVersion.split('.').map(Number);
  versionParts[2]++; // Increment patch version
  return versionParts.join('.');
};

systemConfigSchema.methods.validateConfiguration = function() {
  const errors = [];
  
  if (this.membershipFee.amount < 0) {
    errors.push('Üyelik ücreti negatif olamaz');
  }
  
  if (this.heroSection.minImages > this.heroSection.maxImages) {
    errors.push('Hero section minimum resim sayısı maksimumdan büyük olamaz');
  }
  
  if (this.songSuggestions.minSongs > this.songSuggestions.maxSongs) {
    errors.push('Şarkı önerileri minimum sayısı maksimumdan büyük olamaz');
  }
  
  if (this.eventsSection.minEvents > this.eventsSection.maxEvents) {
    errors.push('Etkinlikler minimum sayısı maksimumdan büyük olamaz');
  }
  
  return errors;
};

systemConfigSchema.statics.getOrCreateDefault = async function() {
  try {
    let config = await this.findOne();
    if (!config) {
      config = await this.create({
        isActive: true,
        version: '1.0.0',
        googleSheets: {
          spreadsheetId: process.env.GOOGLE_SHEETS_ID || ''
        }
      });
    }
    return config;
  } catch (error) {
    throw new Error('Sistem yapılandırması oluşturulamadı: ' + error.message);
  }
};

systemConfigSchema.methods.updateGoogleSheetsConfig = async function(spreadsheetId) {
  try {
    this.googleSheets.spreadsheetId = spreadsheetId;
    this.googleSheets.lastSync = new Date();
    await this.save();
    return { success: true, message: 'Google Sheets yapılandırması güncellendi' };
  } catch (error) {
    throw new Error('Google Sheets yapılandırması güncellenemedi: ' + error.message);
  }
};

systemConfigSchema.methods.updateWebsiteConfig = async function(section, data) {
  try {
    if (!this.website[section]) {
      throw new Error('Geçersiz website bölümü');
    }

    Object.assign(this.website[section], data);
    await this.save();
    return { success: true, message: 'Website yapılandırması güncellendi' };
  } catch (error) {
    throw new Error('Website yapılandırması güncellenemedi: ' + error.message);
  }
};

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

module.exports = SystemConfig; 