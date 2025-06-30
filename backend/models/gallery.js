const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Galeri başlığı gereklidir'],
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden fazla olamaz']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden fazla olamaz']
  },
  category: {
    type: String,
    required: [true, 'Kategori gereklidir'],
    enum: {
      values: ['konser', 'etkinlik', 'prova', 'sosyal', 'yarışma', 'diğer'],
      message: 'Geçersiz kategori'
    }
  },
  images: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    caption: String,
    order: {
      type: Number,
      default: 0
    }
  }],
  coverImage: {
    type: String,
    required: [true, 'Kapak resmi gereklidir']
  },
  tags: [{
    type: String,
    trim: true
  }],
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event'
  },
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [300, 'Yorum 300 karakterden fazla olamaz']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    totalImages: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

GallerySchema.index({ title: 'text', description: 'text', tags: 'text' });
GallerySchema.index({ category: 1 });
GallerySchema.index({ createdAt: -1 });
GallerySchema.index({ isFeatured: 1, isPublic: 1 });
GallerySchema.index({ uploadedBy: 1 });

GallerySchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

GallerySchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

GallerySchema.pre('save', function(next) {
  this.metadata.totalImages = this.images.length;
  
  if (!this.coverImage && this.images.length > 0) {
    this.coverImage = this.images[0].filename;
  }
  
  next();
});

GallerySchema.statics.getFeaturedGallery = function(limit = 6) {
  return this.find({
    isFeatured: true,
    isPublic: true
  })
  .populate('uploadedBy', 'firstName lastName avatar')
  .populate('event', 'title date')
  .sort({ createdAt: -1 })
  .limit(limit);
};

GallerySchema.statics.getByCategory = function(category, limit = 12) {
  return this.find({
    category: category,
    isPublic: true
  })
  .populate('uploadedBy', 'firstName lastName avatar')
  .populate('event', 'title date')
  .sort({ createdAt: -1 })
  .limit(limit);
};

GallerySchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => 
    like.user.toString() === userId.toString()
  );
  
  if (!existingLike) {
    this.likes.push({ user: userId });
    return this.save();
  }
  
  return Promise.resolve(this);
};

GallerySchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => 
    like.user.toString() !== userId.toString()
  );
  
  return this.save();
};

GallerySchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text: text
  });
  
  return this.save();
};

GallerySchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

module.exports = mongoose.model('Gallery', GallerySchema); 