const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { protect, admin } = require('../../middleware/auth');
const logger = require('../../utils/logger');

router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Kullanıcı listesi alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı listesi alınamadı',
      error: error.message
    });
  }
});

router.get('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Kullanıcı bilgisi alma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgisi alınamadı',
      error: error.message
    });
  }
});

router.put('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Kullanıcı güncellendi',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Kullanıcı güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenemedi',
      error: error.message
    });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'Kullanıcı silindi'
    });
  } catch (error) {
    logger.error('Kullanıcı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi',
      error: error.message
    });
  }
});

module.exports = router; 