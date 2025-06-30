const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const websiteMembershipApplicationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ad gereklidir'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyad gereklidir'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'E-posta gereklidir'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
      'Geçerli bir e-posta adresi giriniz'
    ]
  },
  
  tcKimlikNo: {
    type: String,
    required: false,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /^[1-9][0-9]{10}$/.test(v);
      },
      message: 'Geçerli bir TC Kimlik numarası giriniz'
    }
  },
  studentNumber: {
    type: String,
    required: [true, 'Öğrenci numarası gereklidir'],
    unique: true,
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'Şifre alanı zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır']
  },
  
  googleSheetsValidationStatus: {
    type: String,
    enum: ['NOT_CHECKED', 'FOUND', 'NOT_FOUND', 'ERROR'],
    default: 'NOT_CHECKED'
  },
  googleSheetsCheckedAt: {
    type: Date
  },
  
  matchedCommunityMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityMember'
  },
  
  applicationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  
  autoApproved: {
    type: Boolean,
    default: false
  },
  autoApprovalReason: {
    type: String,
    maxlength: [200, 'Otomatik onay nedeni en fazla 200 karakter olabilir']
  },
  
  rejectionReason: {
    type: String,
    maxlength: [500, 'Red nedeni en fazla 500 karakter olabilir']
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userCreatedAt: {
    type: Date
  },
  
  phone: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{10,11}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  department: {
    type: String,
    required: false,
    trim: true
  },
  
  applicationSource: {
    type: String,
    enum: ['WEBSITE', 'ADMIN'],
    default: 'WEBSITE'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  processingNotes: {
    type: String,
    maxlength: [1000, 'İşlem notları en fazla 1000 karakter olabilir']
  },
  
  applicationDate: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  googleSheetsValidated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

websiteMembershipApplicationSchema.plugin(mongoosePaginate);

websiteMembershipApplicationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

websiteMembershipApplicationSchema.virtual('identificationNumber').get(function() {
  return this.tcKimlikNo || this.studentNumber || null;
});

websiteMembershipApplicationSchema.virtual('identificationType').get(function() {
  if (this.tcKimlikNo) return 'TC';
  if (this.studentNumber) return 'STUDENT';
  return null;
});

websiteMembershipApplicationSchema.virtual('statusDisplay').get(function() {
  switch (this.applicationStatus) {
    case 'PENDING':
      return 'Beklemede';
    case 'APPROVED':
      return 'Onaylandı';
    case 'REJECTED':
      return 'Reddedildi';
    default:
      return 'Bilinmiyor';
  }
});

websiteMembershipApplicationSchema.virtual('googleSheetsStatusDisplay').get(function() {
  const statusMap = {
    'NOT_CHECKED': 'Kontrol Edilmedi',
    'FOUND': 'Bulundu',
    'NOT_FOUND': 'Bulunamadı',
    'ERROR': 'Hata'
  };
  return statusMap[this.googleSheetsValidationStatus] || this.googleSheetsValidationStatus;
});

websiteMembershipApplicationSchema.index({ applicationStatus: 1, createdAt: -1 });
websiteMembershipApplicationSchema.index({ googleSheetsValidationStatus: 1 });
websiteMembershipApplicationSchema.index({ autoApproved: 1 });

websiteMembershipApplicationSchema.index({ tcKimlikNo: 1, studentNumber: 1 });

websiteMembershipApplicationSchema.pre('validate', function(next) {
  if (!this.tcKimlikNo && !this.studentNumber) {
    return next(new Error('TC Kimlik No veya Öğrenci Numarası alanlarından en az biri doldurulmalıdır'));
  }
  next();
});

websiteMembershipApplicationSchema.pre('save', function(next) {
  if (this.isModified('applicationStatus') && this.applicationStatus === 'REJECTED' && !this.rejectedAt) {
    this.rejectedAt = new Date();
  }
  
  if (this.isModified('createdUser') && this.createdUser && !this.userCreatedAt) {
    this.userCreatedAt = new Date();
  }
  
  next();
});

websiteMembershipApplicationSchema.statics.findByIdentification = function(tcKimlikNo, studentNumber) {
  const conditions = [];
  
  if (tcKimlikNo) {
    conditions.push({ tcKimlikNo: tcKimlikNo });
  }
  
  if (studentNumber) {
    conditions.push({ studentNumber: studentNumber });
  }
  
  if (conditions.length === 0) {
    return null;
  }
  
  return this.findOne({
    $or: conditions
  });
};

websiteMembershipApplicationSchema.methods.canBeAutoApproved = function() {
  return this.googleSheetsValidationStatus === 'FOUND' && this.matchedCommunityMember;
};

websiteMembershipApplicationSchema.methods.approve = function(approvedBy, reason) {
  this.applicationStatus = 'APPROVED';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  this.autoApprovalReason = reason || 'Admin tarafından onaylandı';
  return this.save();
};

websiteMembershipApplicationSchema.methods.reject = function(rejectedBy, reason) {
  this.applicationStatus = 'REJECTED';
  this.approvedBy = rejectedBy;
  this.rejectionReason = reason;
  return this.save();
};

module.exports = mongoose.model('WebsiteMembershipApplication', websiteMembershipApplicationSchema); 