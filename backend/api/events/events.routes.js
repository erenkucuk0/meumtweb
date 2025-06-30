const express = require('express');
const router = express.Router();
const eventController = require('./events.controller');
const { protect, admin } = require('../../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Etkinlik ID'si
 *         title:
 *           type: string
 *           description: Etkinlik başlığı
 *           example: "Müzik Teknolojileri Semineri"
 *         description:
 *           type: string
 *           description: Etkinlik açıklaması
 *         date:
 *           type: string
 *           format: date-time
 *           description: Etkinlik tarihi
 *         type:
 *           type: string
 *           enum: [conference, workshop, seminar, meeting]
 *           description: Etkinlik türü
 *         location:
 *           type: string
 *           description: Etkinlik yeri
 *         capacity:
 *           type: number
 *           description: Maksimum katılımcı sayısı
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Katılımcı kullanıcı ID'leri
 *         isActive:
 *           type: boolean
 *           description: Etkinlik aktif mi
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Oluşturulma tarihi
 *     
 *     EventCreate:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - date
 *         - type
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           description: Etkinlik başlığı
 *           example: "Müzik Teknolojileri Semineri"
 *         description:
 *           type: string
 *           description: Etkinlik açıklaması
 *         date:
 *           type: string
 *           format: date-time
 *           description: Etkinlik tarihi
 *         type:
 *           type: string
 *           enum: [conference, workshop, seminar, meeting]
 *           description: Etkinlik türü
 *         location:
 *           type: string
 *           description: Etkinlik yeri
 *         capacity:
 *           type: number
 *           description: Maksimum katılımcı sayısı
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Tüm etkinlikleri listele
 *     description: Aktif etkinliklerin listesini döndürür
 *     tags: [Events]
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
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [conference, workshop, seminar, meeting]
 *         description: Etkinlik türü filtresi
 *     responses:
 *       200:
 *         description: Etkinlikler başarıyla listelendi
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
 *                     $ref: '#/components/schemas/Event'
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
router.get('/', eventController.getPublicEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Etkinlik detayını getir
 *     description: Belirtilen ID'ye sahip etkinliğin detaylarını döndürür
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Etkinlik ID'si
 *     responses:
 *       200:
 *         description: Etkinlik detayları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Etkinlik bulunamadı
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
router.get('/:id', eventController.getEvent);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Yeni etkinlik oluştur
 *     description: Yeni bir etkinlik oluşturur (Sadece admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreate'
 *     responses:
 *       201:
 *         description: Etkinlik başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
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
 *         description: Yetki yetersiz (Admin gerekli)
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
router.post('/', protect, admin, eventController.createNewEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Etkinlik güncelle
 *     description: Mevcut etkinliği günceller (Sadece admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Etkinlik ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreate'
 *     responses:
 *       200:
 *         description: Etkinlik başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
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
 *         description: Yetki yetersiz (Admin gerekli)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Etkinlik bulunamadı
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
router.put('/:id', protect, admin, eventController.updateEventDetails);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Etkinlik sil
 *     description: Belirtilen etkinliği siler (Sadece admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Etkinlik ID'si
 *     responses:
 *       200:
 *         description: Etkinlik başarıyla silindi
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
 *                   example: "Etkinlik başarıyla silindi"
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Admin gerekli)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Etkinlik bulunamadı
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
router.delete('/:id', protect, admin, eventController.removeEvent);

/**
 * @swagger
 * /api/events/{id}/register:
 *   post:
 *     summary: Etkinliğe katıl
 *     description: Kullanıcıyı belirtilen etkinliğe kaydeder
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Etkinlik ID'si
 *     responses:
 *       200:
 *         description: Etkinliğe başarıyla kaydolundu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Geçersiz istek (Etkinlik dolu veya zaten kayıtlı)
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
 *       404:
 *         description: Etkinlik bulunamadı
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
router.post('/:id/register', protect, eventController.registerForEvent);

/**
 * @swagger
 * /api/events/{id}/register:
 *   delete:
 *     summary: Etkinlik kaydını iptal et
 *     description: Kullanıcının etkinlik kaydını iptal eder
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Etkinlik ID'si
 *     responses:
 *       200:
 *         description: Etkinlik kaydı başarıyla iptal edildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Geçersiz istek (Etkinliğe kayıtlı değil)
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
 *       404:
 *         description: Etkinlik bulunamadı
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
router.delete('/:id/register', protect, eventController.unregisterFromEvent);

module.exports = router; 