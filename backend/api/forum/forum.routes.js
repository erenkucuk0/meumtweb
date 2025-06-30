const express = require('express');
const router = express.Router();

const { ForumPost, ForumComment } = require('../../models/ForumPost');

const { protect: authMiddleware, authorize } = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');

/**
 * @swagger
 * components:
 *   schemas:
 *     ForumPost:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Gönderi ID'si
 *         title:
 *           type: string
 *           description: Gönderi başlığı
 *           example: "Synthesizer Önerileri"
 *         content:
 *           type: string
 *           description: Gönderi içeriği
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             username:
 *               type: string
 *         isPinned:
 *           type: boolean
 *           description: Sabitlenmiş gönderi mi
 *         isActive:
 *           type: boolean
 *           description: Aktif gönderi mi
 *         views:
 *           type: number
 *           description: Görüntülenme sayısı
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           description: Son aktivite tarihi
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Oluşturulma tarihi
 *     
 *     ForumPostCreate:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           description: Gönderi başlığı
 *           example: "Synthesizer Önerileri"
 *         content:
 *           type: string
 *           description: Gönderi içeriği
 *           example: "Başlangıç seviyesi için hangi synthesizer'ı önerirsiniz?"
 *         isPinned:
 *           type: boolean
 *           description: Sabitlenmiş gönderi mi (Sadece admin)
 *           default: false
 *     
 *     ForumComment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         content:
 *           type: string
 *           description: Yorum içeriği
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             username:
 *               type: string
 *         post:
 *           type: string
 *           description: Gönderi ID'si
 *         parentComment:
 *           type: string
 *           description: Üst yorum ID'si (cevap ise)
 *         replies:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ForumComment'
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/forum/posts:
 *   get:
 *     summary: Forum gönderilerini listele
 *     description: Aktif forum gönderilerinin listesini döndürür
 *     tags: [Forum]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına gönderi sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Başlık veya içerikte arama terimi
 *     responses:
 *       200:
 *         description: Forum gönderileri başarıyla listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Mevcut sayfadaki gönderi sayısı
 *                 total:
 *                   type: integer
 *                   description: Toplam gönderi sayısı
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ForumPost'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await ForumPost.find(query)
      .populate('author', 'name username')
      .sort({ isPinned: -1, lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ForumPost.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forum gönderileri getirilemedi',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/forum/posts/{id}:
 *   get:
 *     summary: Forum gönderisi detayını getir
 *     description: Belirtilen forum gönderisinin detaylarını ve yorumlarını döndürür
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Gönderi ID'si
 *     responses:
 *       200:
 *         description: Gönderi detayları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       $ref: '#/components/schemas/ForumPost'
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ForumComment'
 *       404:
 *         description: Gönderi bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'name username');
    
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }
    
    const comments = await ForumComment.find({ 
      post: req.params.id, 
      isActive: true,
      parentComment: null // Only top-level comments
    })
    .populate('author', 'name username')
    .populate({
      path: 'replies',
      match: { isActive: true },
      populate: {
        path: 'author',
        select: 'name username'
      }
    })
    .sort({ createdAt: 1 })
    .lean();
    
    await post.incrementViews();
    
    res.status(200).json({
      success: true,
      data: {
        post,
        comments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gönderi getirilemedi',
      error: error.message
    });
  }
});

router.post('/posts', [authMiddleware, authorize('user', 'admin')], async (req, res) => {
  console.log('Yeni konu açma - req.user:', req.user);
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve içerik gereklidir'
      });
    }
    
    const postData = {
      title: title.trim(),
      content: content.trim(),
      author: req.user._id,
      isPinned: req.user.role === 'admin' ? req.body.isPinned : false
    };
    
    const post = await ForumPost.create(postData);
    await post.populate('author', 'name username');
    
    res.status(201).json({
      success: true,
      message: 'Gönderi başarıyla oluşturuldu',
      data: post
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Gönderi oluşturulamadı',
      error: error.message
    });
  }
});

router.delete('/posts/:id', [authMiddleware], async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }
    
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu gönderiyi silme yetkiniz yok'
      });
    }
    
    post.isActive = false;
    await post.save();
    
    await ForumComment.updateMany(
      { post: post._id },
      { isActive: false }
    );
    
    res.status(200).json({
      success: true,
      message: 'Gönderi başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gönderi silinemedi',
      error: error.message
    });
  }
});

router.put('/posts/:id', [authMiddleware], async (req, res) => {
  try {
    const { title, content, isPinned } = req.body;
    
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }
    
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu gönderiyi düzenleme yetkiniz yok'
      });
    }
    
    if (isPinned !== undefined && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Sadece adminler gönderi sabitleyebilir'
      });
    }
    
    if (title) post.title = title.trim();
    if (content) post.content = content.trim();
    if (isPinned !== undefined && isAdmin) post.isPinned = isPinned;
    
    await post.save();
    await post.populate('author', 'name username');
    
    res.status(200).json({
      success: true,
      message: 'Gönderi başarıyla güncellendi',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gönderi güncellenemedi',
      error: error.message
    });
  }
});

router.post('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }
    
    await post.toggleLike(req.user._id);
    
    res.status(200).json({
      success: true,
      message: 'Beğeni durumu güncellendi',
      likeCount: post.likeCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Beğeni işlemi gerçekleştirilemedi',
      error: error.message
    });
  }
});


router.post('/posts/:id/comments', [authMiddleware, authorize('user', 'admin')], async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Yorum içeriği gereklidir'
      });
    }
    
    const post = await ForumPost.findById(req.params.id);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }
    
    if (parentComment) {
      const parent = await ForumComment.findById(parentComment);
      if (!parent || !parent.isActive || parent.post.toString() !== req.params.id) {
        return res.status(404).json({
          success: false,
          message: 'Yanıtlanmak istenen yorum bulunamadı'
        });
      }
    }
    
    const comment = await ForumComment.create({
      content: content.trim(),
      author: req.user._id,
      post: req.params.id,
      parentComment
    });
    
    await comment.populate('author', 'name username');
    
    post.lastActivity = Date.now();
    await post.save();
    
    res.status(201).json({
      success: true,
      message: 'Yorum başarıyla eklendi',
      data: comment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Yorum eklenemedi',
      error: error.message
    });
  }
});

router.put('/comments/:id', [authMiddleware], async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Yorum içeriği gereklidir'
      });
    }
    
    const comment = await ForumComment.findById(req.params.id);
    
    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Yorum bulunamadı'
      });
    }
    
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu yorumu düzenleme yetkiniz yok'
      });
    }
    
    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();
    await comment.populate('author', 'name username');
    
    res.status(200).json({
      success: true,
      message: 'Yorum başarıyla güncellendi',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum güncellenemedi',
      error: error.message
    });
  }
});

router.delete('/comments/:id', [authMiddleware], async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.id);
    
    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Yorum bulunamadı'
      });
    }
    
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu yorumu silme yetkiniz yok'
      });
    }
    
    comment.isActive = false;
    await comment.save();
    
    if (!comment.parentComment) {
      await ForumComment.updateMany(
        { parentComment: comment._id },
        { isActive: false }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Yorum başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum silinemedi',
      error: error.message
    });
  }
});


router.get('/admin/stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const [totalPosts, activePosts, totalComments, activeComments] = await Promise.all([
      ForumPost.countDocuments(),
      ForumPost.countDocuments({ isActive: true }),
      ForumComment.countDocuments(),
      ForumComment.countDocuments({ isActive: true })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        posts: {
          total: totalPosts,
          active: activePosts,
          inactive: totalPosts - activePosts
        },
        comments: {
          total: totalComments,
          active: activeComments,
          inactive: totalComments - activeComments
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Forum istatistikleri getirilemedi',
      error: error.message
    });
  }
});

module.exports = router; 