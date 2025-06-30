const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Başlık gereklidir'],
    trim: true,
    maxlength: [150, 'Başlık 150 karakterden uzun olamaz'],
    minlength: [5, 'Başlık en az 5 karakter olmalıdır']
  },
  
  content: {
    type: String,
    required: [true, 'İçerik gereklidir'],
    trim: true,
    maxlength: [2000, 'İçerik 2000 karakterden uzun olamaz'],
    minlength: [10, 'İçerik en az 10 karakter olmalıdır']
  },
  
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  
  views: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  commentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

forumPostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

forumPostSchema.virtual('comments', {
  ref: 'ForumComment',
  localField: '_id',
  foreignField: 'post'
});

forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ lastActivity: -1 });
forumPostSchema.index({ isPinned: -1, lastActivity: -1 });
forumPostSchema.index({ author: 1, createdAt: -1 });

forumPostSchema.statics.getActivePosts = function(limit = 20, page = 1) {
  const skip = (page - 1) * limit;
  
  return this.find({ isActive: true })
    .populate('author', 'name username')
    .sort({ isPinned: -1, lastActivity: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

forumPostSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  
  return this.save();
};

forumPostSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

const forumCommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Yorum içeriği gereklidir'],
    trim: true,
    maxlength: [1000, 'Yorum 1000 karakterden uzun olamaz'],
    minlength: [3, 'Yorum en az 3 karakter olmalıdır']
  },
  
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  post: {
    type: mongoose.Schema.ObjectId,
    ref: 'ForumPost',
    required: true
  },
  
  parentComment: {
    type: mongoose.Schema.ObjectId,
    ref: 'ForumComment'
  },
  
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

forumCommentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

forumCommentSchema.virtual('replies', {
  ref: 'ForumComment',
  localField: '_id',
  foreignField: 'parentComment'
});

forumCommentSchema.index({ post: 1, createdAt: 1 });
forumCommentSchema.index({ author: 1, createdAt: -1 });
forumCommentSchema.index({ parentComment: 1, createdAt: 1 });

forumCommentSchema.post('save', async function() {
  if (this.isNew) {
    await mongoose.model('ForumPost').findByIdAndUpdate(
      this.post,
      { 
        $inc: { commentCount: 1 },
        lastActivity: new Date()
      }
    );
  }
});

forumCommentSchema.post('deleteOne', { document: true }, async function() {
  await mongoose.model('ForumPost').findByIdAndUpdate(
    this.post,
    { $inc: { commentCount: -1 } }
  );
});

forumCommentSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  
  return this.save();
};

const ForumPost = mongoose.model('ForumPost', forumPostSchema);
const ForumComment = mongoose.model('ForumComment', forumCommentSchema);

module.exports = {
  ForumPost,
  ForumComment
}; 