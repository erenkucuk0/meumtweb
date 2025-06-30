const mongoose = require('mongoose');

const membershipApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false, // Email zorunlu olmayabilir
    trim: true,
    lowercase: true
  },
  studentNumber: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  
  paymentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentReceipt: {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  },
  
  isInGoogleSheets: {
    type: Boolean,
    required: true,
    default: false
  },
  googleSheetsRowIndex: {
    type: Number,
    default: null
  },
  googleSheetsVerificationDate: {
    type: Date,
    default: null
  },
  
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'INVALID_NOT_IN_SHEETS'],
    default: 'PENDING'
  },
  
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  
  createdUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  additionalInfo: {
    instruments: [{
      type: String,
      trim: true
    }],
    musicalExperience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional'],
      default: 'beginner'
    },
    motivation: {
      type: String,
      maxlength: 500
    }
  }
}, {
  timestamps: true
});

membershipApplicationSchema.index({ studentNumber: 1 });
membershipApplicationSchema.index({ email: 1 });
membershipApplicationSchema.index({ status: 1 });
membershipApplicationSchema.index({ isInGoogleSheets: 1 });

module.exports = mongoose.model('MembershipApplication', membershipApplicationSchema); 