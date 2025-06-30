const Gallery = require('../../models/gallery');
const logger = require('../../utils/logger');

const getGalleryItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const startIndex = (page - 1) * limit;

    let query = { isPublic: true };
    
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    const total = await Gallery.countDocuments(query);
    const galleryItems = await Gallery.find(query)
      .populate('uploadedBy', 'firstName lastName avatar')
      .populate('event', 'title date')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: galleryItems.length,
      total,
      pagination,
      data: { galleryItems }
    });
  } catch (error) {
    logger.error('Get gallery items error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getGalleryItem = async (req, res, next) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName avatar bio')
      .populate('event', 'title date location')
      .populate('comments.user', 'firstName lastName avatar')
      .populate('likes.user', 'firstName lastName');

    if (!galleryItem || !galleryItem.isPublic) {
      return res.status(404).json({
        success: false,
        error: 'Galeri öğesi bulunamadı'
      });
    }

    await galleryItem.incrementViewCount();

    res.status(200).json({
      success: true,
      data: { galleryItem }
    });
  } catch (error) {
    logger.error('Get gallery item error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const createGalleryItem = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'En az bir resim yüklemelisiniz'
      });
    }

    const images = req.files.map((file, index) => ({
      filename: file.filename,
      originalName: file.originalname,
      caption: req.body.captions ? req.body.captions[index] : '',
      order: index
    }));

    req.body.uploadedBy = req.user.id;
    req.body.images = images;
    req.body.coverImage = images[0].filename;

    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    const galleryItem = await Gallery.create(req.body);

    res.status(201).json({
      success: true,
      data: { galleryItem }
    });
  } catch (error) {
    logger.error('Create gallery item error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const updateGalleryItem = async (req, res, next) => {
  try {
    let galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        error: 'Galeri öğesi bulunamadı'
      });
    }

    if (galleryItem.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu galeri öğesini güncelleme yetkiniz yok'
      });
    }

    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    galleryItem = await Gallery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: { galleryItem }
    });
  } catch (error) {
    logger.error('Update gallery item error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteGalleryItem = async (req, res, next) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        error: 'Galeri öğesi bulunamadı'
      });
    }

    if (galleryItem.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu galeri öğesini silme yetkiniz yok'
      });
    }

    await galleryItem.remove();

    res.status(200).json({
      success: true,
      message: 'Galeri öğesi silindi'
    });
  } catch (error) {
    logger.error('Delete gallery item error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const uploadGalleryImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen en az bir resim seçin'
      });
    }

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        error: 'Galeri öğesi bulunamadı'
      });
    }

    if (galleryItem.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu galeri öğesine resim yükleme yetkiniz yok'
      });
    }

    const newImages = req.files.map((file, index) => ({
      filename: file.filename,
      originalName: file.originalname,
      caption: req.body.captions ? req.body.captions[index] : '',
      order: galleryItem.images.length + index
    }));

    galleryItem.images.push(...newImages);
    await galleryItem.save();

    res.status(200).json({
      success: true,
      data: { 
        galleryItem,
        uploadedImages: newImages
      }
    });
  } catch (error) {
    logger.error('Upload gallery images error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getGalleryByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit, 10) || 12;
    
    const galleryItems = await Gallery.getByCategory(category, limit);

    res.status(200).json({
      success: true,
      count: galleryItems.length,
      data: { galleryItems }
    });
  } catch (error) {
    logger.error('Get gallery by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getFeaturedGallery = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    
    const galleryItems = await Gallery.getFeaturedGallery(limit);

    res.status(200).json({
      success: true,
      count: galleryItems.length,
      data: { galleryItems }
    });
  } catch (error) {
    logger.error('Get featured gallery error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  uploadGalleryImages,
  getGalleryByCategory,
  getFeaturedGallery
}; 