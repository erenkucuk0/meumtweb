const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Etkinlik başlığı gereklidir'],
    trim: true,
    maxlength: [200, 'Başlık en fazla 200 karakter olabilir']
  },
  description: {
    type: String,
    required: [true, 'Etkinlik açıklaması gereklidir'],
    trim: true
  },
  eventType: {
    type: String,
    enum: {
      values: ['concert', 'workshop', 'seminar', 'meeting', 'other'],
      message: 'Geçerli bir etkinlik türü seçin'
    },
    default: 'other'
  },
  date: {
    type: Date,
    required: [true, 'Etkinlik tarihi gereklidir']
  },
  time: {
    type: String,
    required: [true, 'Etkinlik saati gereklidir']
  },
  location: {
    type: String,
    required: [true, 'Etkinlik konumu gereklidir']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizatör gereklidir']
  },
  image: {
    type: String,
    default: 'default-event.jpg'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  registrationDeadline: {
    type: Date
  },
  capacity: {
    type: Number,
    min: [0, 'Kapasite negatif olamaz']
  },
  registrationCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled'],
    default: 'published'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining capacity
eventSchema.virtual('remainingCapacity').get(function() {
  if (!this.capacity) return null;
  return this.capacity - this.registrationCount;
});

// Virtual for registration status
eventSchema.virtual('registrationStatus').get(function() {
  if (this.registrationDeadline && this.registrationDeadline < new Date()) {
    return 'CLOSED';
  }
  if (this.capacity && this.registrationCount >= this.capacity) {
    return 'FULL';
  }
  return 'OPEN';
});

// Static method to get featured events
eventSchema.statics.getFeaturedEvents = async function(limit = 5) {
  return this.find({
    isPublic: true,
    status: 'published',
    date: { $gte: new Date() }
  })
    .sort({ date: 1 })
    .limit(limit)
    .populate('organizer', 'firstName lastName');
};

// Indexes
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1, isPublic: 1 });
eventSchema.index({ eventType: 1 });

module.exports = mongoose.model('Event', eventSchema); 