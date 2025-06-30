const express = require('express');
const {
  getMembers,
  getMember,
  updateMemberProfile,
  deleteMember,
  getMemberStats,
  getActiveMembers,
  searchMembers
} = require('./members.controller');

const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

router.get('/', getMembers);
router.get('/active', getActiveMembers);
router.get('/search', searchMembers);
router.get('/:id', getMember);

router.use(protect); // All routes after this middleware are protected

router.put('/profile', upload.single('avatar'), updateMemberProfile);
router.get('/stats/:id', getMemberStats);

router.delete('/:id', authorize('admin'), deleteMember);

module.exports = router; 