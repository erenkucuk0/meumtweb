const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const SongSuggestion = require('../models/SongSuggestion');
const logger = require('../utils/logger');

router.post('/', [protect, authorize('user', 'admin')], async (req, res) => {
  try {
    const { songName, artist, url } = req.body;

    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir URL giriniz'
      });
    }

    const suggestion = await SongSuggestion.create({
      songName,
      artist,
      url,
      suggestedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      suggestion
    });
  } catch (error) {
    logger.error('Song suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const suggestions = await SongSuggestion.find({ status: 'APPROVED' })
      .populate('suggestedBy', 'firstName lastName')
      .sort('-createdAt');

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    logger.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

router.get('/admin', [protect, admin], async (req, res) => {
  try {
    const suggestions = await SongSuggestion.find()
      .populate('suggestedBy', 'firstName lastName')
      .sort('-createdAt');

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    logger.error('Get admin suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

router.put('/:id/approve', [protect, admin], async (req, res) => {
  try {
    const suggestion = await SongSuggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Şarkı önerisi bulunamadı'
      });
    }

    suggestion.status = 'APPROVED';
    suggestion.approvedBy = req.user._id;
    suggestion.approvalDate = Date.now();
    await suggestion.save();

    res.json({
      success: true,
      suggestion
    });
  } catch (error) {
    logger.error('Approve suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

router.put('/:id/reject', [protect, admin], async (req, res) => {
  try {
    const suggestion = await SongSuggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Şarkı önerisi bulunamadı'
      });
    }

    suggestion.status = 'REJECTED';
    suggestion.rejectedBy = req.user._id;
    suggestion.rejectionReason = req.body.reason;
    suggestion.rejectionDate = Date.now();
    await suggestion.save();

    res.json({
      success: true,
      suggestion
    });
  } catch (error) {
    logger.error('Reject suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

router.delete('/:id', [protect, admin], async (req, res) => {
  try {
    const suggestion = await SongSuggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Şarkı önerisi bulunamadı'
      });
    }

    await suggestion.remove();

    res.json({
      success: true,
      message: 'Şarkı önerisi silindi'
    });
  } catch (error) {
    logger.error('Delete suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router; 