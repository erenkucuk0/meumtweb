const mongoose = require('mongoose');

const heroSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Başlık gereklidir'],
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden uzun olamaz']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt başlık 200 karakterden uzun olamaz']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  backgroundImage: {
    type: String,
    default: 'default-hero-bg.jpg'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'İsim gereklidir'],
    trim: true,
    maxlength: [100, 'İsim 100 karakterden uzun olamaz']
  },
  title: {
    type: String,
    required: [true, 'Ünvan gereklidir'],
    trim: true,
    maxlength: [100, 'Ünvan 100 karakterden uzun olamaz']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  photo: {
    type: String,
    default: 'default-avatar.jpg'
  },
  role: {
    type: String,
    required: [true, 'Rol gereklidir']
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  socialLinks: {
    github: String,
    email: String
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const websiteSettingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: [true, 'Site adı gereklidir'],
    trim: true,
    maxlength: [100, 'Site adı 100 karakterden uzun olamaz']
  },
  siteDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Site açıklaması 500 karakterden uzun olamaz']
  },
  logo: {
    type: String,
    default: 'default-logo.png'
  },
  socialMedia: {
    instagram: String,
    twitter: String,
    youtube: String,
    facebook: String,
    linkedin: String
  },
  contactEmail: {
    type: String,
    trim: true,
    maxlength: [100, 'E-posta adresi 100 karakterden uzun olamaz']
  },
  contactPhone: {
    type: String,
    trim: true,
    maxlength: [20, 'Telefon numarası 20 karakterden uzun olamaz']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Adres 200 karakterden uzun olamaz']
  }
}, {
  timestamps: true
});

heroSectionSchema.index({ order: 1, isActive: 1 });
teamMemberSchema.index({ order: 1, isActive: 1 });

teamMemberSchema.virtual('displayInfo').get(function() {
  return `${this.name} - ${this.title}`;
});

teamMemberSchema.pre('save', async function(next) {
  if (this.isNew && !this.order) {
    const maxOrder = await this.constructor.findOne({}, {}, { sort: { order: -1 } });
    this.order = maxOrder ? maxOrder.order + 1 : 1;
  }
  next();
});

heroSectionSchema.pre('save', async function(next) {
  if (this.isNew && !this.order) {
    const maxOrder = await this.constructor.findOne({}, {}, { sort: { order: -1 } });
    this.order = maxOrder ? maxOrder.order + 1 : 1;
  }
  next();
});

const HeroSection = mongoose.model('HeroSection', heroSectionSchema);
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);

module.exports = {
  HeroSection,
  TeamMember,
  WebsiteSettings
}; 