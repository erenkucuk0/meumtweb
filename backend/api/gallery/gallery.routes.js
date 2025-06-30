const express = require('express');
const {
  getGalleryItems,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  uploadGalleryImages,
  getGalleryByCategory,
  getFeaturedGallery
} = require('./gallery.controller');

const { protect, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GalleryItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Galeri öğesi ID'si
 *         title:
 *           type: string
 *           description: Galeri öğesi başlığı
 *           example: "Konser Fotoğrafları"
 *         description:
 *           type: string
 *           description: Galeri öğesi açıklaması
 *         category:
 *           type: string
 *           enum: [events, equipment, studio, performances, workshops]
 *           description: Galeri kategorisi
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: Resim URL'i
 *               caption:
 *                 type: string
 *                 description: Resim açıklaması
 *               isMain:
 *                 type: boolean
 *                 description: Ana resim mi
 *         isFeatured:
 *           type: boolean
 *           description: Öne çıkarılmış mı
 *         isActive:
 *           type: boolean
 *           description: Aktif mi
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Etiketler
 *         createdBy:
 *           type: string
 *           description: Oluşturan kullanıcı ID'si
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Oluşturulma tarihi
 *     
 *     GalleryItemCreate:
 *       type: object
 *       required:
 *         - title
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           description: Galeri öğesi başlığı
 *           example: "Konser Fotoğrafları"
 *         description:
 *           type: string
 *           description: Galeri öğesi açıklaması
 *         category:
 *           type: string
 *           enum: [events, equipment, studio, performances, workshops]
 *           description: Galeri kategorisi
 *         isFeatured:
 *           type: boolean
 *           description: Öne çıkarılmış mı
 *           default: false
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Etiketler
 */

/**
 * @swagger
 * /api/gallery:
 *   get:
 *     summary: Galeri öğelerini listele
 *     description: Aktif galeri öğelerinin listesini döndürür
 *     tags: [Gallery]
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
 *           default: 12
 *         description: Sayfa başına öğe sayısı
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [events, equipment, studio, performances, workshops]
 *         description: Kategori filtresi
 *     responses:
 *       200:
 *         description: Galeri öğeleri başarıyla listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GalleryItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getGalleryItems);

/**
 * @swagger
 * /api/gallery/featured:
 *   get:
 *     summary: Öne çıkarılmış galeri öğelerini getir
 *     description: Öne çıkarılmış galeri öğelerinin listesini döndürür
 *     tags: [Gallery]
 *     responses:
 *       200:
 *         description: Öne çıkarılmış galeri öğeleri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GalleryItem'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/featured', getFeaturedGallery);

/**
 * @swagger
 * /api/gallery/category/{category}:
 *   get:
 *     summary: Kategoriye göre galeri öğelerini getir
 *     description: Belirtilen kategorideki galeri öğelerini döndürür
 *     tags: [Gallery]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [events, equipment, studio, performances, workshops]
 *         description: Galeri kategorisi
 *     responses:
 *       200:
 *         description: Kategori galeri öğeleri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GalleryItem'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/category/:category', getGalleryByCategory);

/**
 * @swagger
 * /api/gallery/{id}:
 *   get:
 *     summary: Galeri öğesi detayını getir
 *     description: Belirtilen galeri öğesinin detaylarını döndürür
 *     tags: [Gallery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Galeri öğesi ID'si
 *     responses:
 *       200:
 *         description: Galeri öğesi detayları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GalleryItem'
 *       404:
 *         description: Galeri öğesi bulunamadı
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
router.get('/:id', getGalleryItem);

router.use(protect); // All routes after this middleware are protected

/**
 * @swagger
 * /api/gallery:
 *   post:
 *     summary: Yeni galeri öğesi oluştur
 *     description: Yeni bir galeri öğesi oluşturur (Admin/Organizer)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/GalleryItemCreate'
 *               - type: object
 *                 properties:
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *                     description: Galeri resimleri (maksimum 10 adet)
 *     responses:
 *       201:
 *         description: Galeri öğesi başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GalleryItem'
 *       400:
 *         description: Geçersiz veri
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Admin/Organizer gerekli)
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
router.post('/', authorize('admin', 'organizer'), upload.array('images', 10), createGalleryItem);

/**
 * @swagger
 * /api/gallery/{id}:
 *   put:
 *     summary: Galeri öğesi güncelle
 *     description: Mevcut galeri öğesini günceller (Admin/Organizer)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Galeri öğesi ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GalleryItemCreate'
 *     responses:
 *       200:
 *         description: Galeri öğesi başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GalleryItem'
 *       400:
 *         description: Geçersiz veri
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Admin/Organizer gerekli)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Galeri öğesi bulunamadı
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
 *   delete:
 *     summary: Galeri öğesi sil
 *     description: Belirtilen galeri öğesini siler (Admin/Organizer)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Galeri öğesi ID'si
 *     responses:
 *       200:
 *         description: Galeri öğesi başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Galeri öğesi başarıyla silindi"
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Admin/Organizer gerekli)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Galeri öğesi bulunamadı
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
router.put('/:id', authorize('admin', 'organizer'), updateGalleryItem);
router.delete('/:id', authorize('admin', 'organizer'), deleteGalleryItem);

/**
 * @swagger
 * /api/gallery/{id}/images:
 *   post:
 *     summary: Galeri öğesine resim ekle
 *     description: Mevcut galeri öğesine yeni resimler ekler (Admin/Organizer)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Galeri öğesi ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Eklenecek resimler (maksimum 5 adet)
 *     responses:
 *       200:
 *         description: Resimler başarıyla eklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GalleryItem'
 *       400:
 *         description: Geçersiz dosya
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Admin/Organizer gerekli)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Galeri öğesi bulunamadı
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
router.post('/:id/images', authorize('admin', 'organizer'), upload.array('images', 5), uploadGalleryImages);

module.exports = router; 