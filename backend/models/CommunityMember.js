const mongoose = require('mongoose');

const communityMemberSchema = new mongoose.Schema({
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
  tcno: {
    type: String,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /^[1-9][0-9]{10}$/.test(v);
      },
      message: 'Geçerli bir TC Kimlik numarası giriniz'
    }
  },
  tcKimlikNo: {
    type: String,
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
  department: {
    type: String,
    required: [true, 'Bölüm gereklidir'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefon numarası gereklidir'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10,11}$/.test(v);
      },
      message: 'Geçerli bir telefon numarası giriniz'
    }
  },
  paymentReceipt: String,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  applicationSource: {
    type: String,
    enum: ['WEBSITE', 'GOOGLE_FORM', 'MANUAL', 'OTHER'],
    default: 'WEBSITE'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionDate: {
    type: Date
  },
  rejectionReason: String,
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

communityMemberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

communityMemberSchema.pre('save', function(next) {
  if (this.tcKimlikNo && !this.tcno) {
    this.tcno = this.tcKimlikNo;
  } else if (this.tcno && !this.tcKimlikNo) {
    this.tcKimlikNo = this.tcno;
  }

  if (this.isModified('status') && this.status === 'APPROVED') {
    this.approvalDate = new Date();
    this.rejectionDate = undefined;
  }
  if (this.isModified('status') && this.status === 'REJECTED') {
    this.rejectionDate = new Date();
  }
  next();
});

communityMemberSchema.index({ status: 1 });
communityMemberSchema.index({ applicationSource: 1 });

module.exports = mongoose.model('CommunityMember', communityMemberSchema); 