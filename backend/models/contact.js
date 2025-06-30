const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'İsim gereklidir'],
    trim: true,
    maxlength: [50, 'İsim 50 karakterden fazla olamaz']
  },
  email: {
    type: String,
    required: [true, 'E-posta gereklidir'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Geçerli bir e-posta adresi girin'
    ]
  },
  phone: {
    type: String,
    match: [
      /^(\+90|0)?[0-9]{10}$/,
      'Geçerli bir telefon numarası girin'
    ]
  },
  subject: {
    type: String,
    required: [true, 'Konu gereklidir'],
    trim: true,
    maxlength: [100, 'Konu 100 karakterden fazla olamaz']
  },
  message: {
    type: String,
    required: [true, 'Mesaj gereklidir'],
    maxlength: [1000, 'Mesaj 1000 karakterden fazla olamaz']
  },
  category: {
    type: String,
    enum: {
      values: ['genel', 'etkinlik', 'üyelik', 'işbirliği', 'şikayet', 'öneri', 'diğer'],
      message: 'Geçersiz kategori'
    },
    default: 'genel'
  },
  status: {
    type: String,
    enum: {
      values: ['yeni', 'okundu', 'yanıtlandı', 'kapatıldı'],
      message: 'Geçersiz durum'
    },
    default: 'yeni'
  },
  priority: {
    type: String,
    enum: {
      values: ['düşük', 'normal', 'yüksek', 'acil'],
      message: 'Geçersiz öncelik'
    },
    default: 'normal'
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  replies: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Yanıt 1000 karakterden fazla olamaz']
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      default: 'web'
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  readBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ category: 1 });
ContactSchema.index({ priority: 1 });
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ assignedTo: 1 });

ContactSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

ContactSchema.virtual('lastReply').get(function() {
  if (this.replies.length > 0) {
    return this.replies[this.replies.length - 1];
  }
  return null;
});

ContactSchema.pre('save', function(next) {
  if (this.replies.length > 0 && this.status === 'yeni') {
    this.status = 'yanıtlandı';
  }
  
  next();
});

ContactSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

ContactSchema.statics.getRecent = function(limit = 10) {
  return this.find({ isArchived: false })
    .populate('assignedTo', 'firstName lastName')
    .populate('readBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

ContactSchema.methods.markAsRead = function(userId) {
  this.status = 'okundu';
  this.readAt = new Date();
  this.readBy = userId;
  return this.save();
};

ContactSchema.methods.addReply = function(userId, message, isInternal = false) {
  this.replies.push({
    user: userId,
    message: message,
    isInternal: isInternal
  });
  
  if (!isInternal) {
    this.status = 'yanıtlandı';
  }
  
  return this.save();
};

ContactSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  if (this.status === 'yeni') {
    this.status = 'okundu';
  }
  return this.save();
};

module.exports = mongoose.model('Contact', ContactSchema); 