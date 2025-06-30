const express = require('express');
const {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
  replyToContact
} = require('./contact.controller');

const { protect, authorize } = require('../../middleware/auth');
const { contactValidation, idValidation, paginationValidation } = require('../../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ContactMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: İletişim mesajı ID'si
 *         name:
 *           type: string
 *           description: Gönderen kişinin adı
 *           example: "Ahmet Yılmaz"
 *         email:
 *           type: string
 *           format: email
 *           description: Gönderen kişinin e-posta adresi
 *           example: "ahmet@example.com"
 *         subject:
 *           type: string
 *           description: Mesaj konusu
 *           example: "Etkinlik Hakkında Soru"
 *         message:
 *           type: string
 *           description: Mesaj içeriği
 *         phone:
 *           type: string
 *           description: Telefon numarası (opsiyonel)
 *           example: "+90 555 123 45 67"
 *         status:
 *           type: string
 *           enum: [pending, replied, resolved, archived]
 *           description: Mesaj durumu
 *           default: pending
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Mesaj önceliği
 *           default: medium
 *         assignedTo:
 *           type: string
 *           description: Atanan admin ID'si
 *         reply:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *               description: Cevap içeriği
 *             repliedBy:
 *               type: string
 *               description: Cevaplayan admin ID'si
 *             repliedAt:
 *               type: string
 *               format: date-time
 *               description: Cevap tarihi
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Mesaj etiketleri
 *         isRead:
 *           type: boolean
 *           description: Okundu mu
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Oluşturulma tarihi
 *     
 *     ContactMessageCreate:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - subject
 *         - message
 *       properties:
 *         name:
 *           type: string
 *           description: Gönderen kişinin adı
 *           example: "Ahmet Yılmaz"
 *         email:
 *           type: string
 *           format: email
 *           description: Gönderen kişinin e-posta adresi
 *           example: "ahmet@example.com"
 *         subject:
 *           type: string
 *           description: Mesaj konusu
 *           example: "Etkinlik Hakkında Soru"
 *         message:
 *           type: string
 *           description: Mesaj içeriği
 *           example: "Merhaba, yaklaşan konser hakkında bilgi alabilir miyim?"
 *         phone:
 *           type: string
 *           description: Telefon numarası (opsiyonel)
 *           example: "+90 555 123 45 67"
 *     
 *     ContactReply:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: Cevap içeriği
 *           example: "Merhaba, konser bilgileri için web sitemizi ziyaret edebilirsiniz."
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: İletişim formu gönder
 *     description: Yeni bir iletişim mesajı gönderir
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactMessageCreate'
 *     responses:
 *       201:
 *         description: İletişim mesajı başarıyla gönderildi
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
 *                   example: "Mesajınız başarıyla gönderildi"
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
 *       400:
 *         description: Geçersiz veri
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
router.post('/', contactValidation.create, submitContactForm);

router.use(protect); // All routes after this middleware are protected

/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: İletişim mesajlarını listele
 *     description: Tüm iletişim mesajlarını listeler (Admin/Organizer)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
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
 *         description: Sayfa başına mesaj sayısı
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, replied, resolved, archived]
 *         description: Durum filtresi
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Öncelik filtresi
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi (isim, e-posta, konu)
 *     responses:
 *       200:
 *         description: İletişim mesajları başarıyla listelendi
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
 *                     $ref: '#/components/schemas/ContactMessage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
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
router.get('/', authorize('admin', 'organizer'), paginationValidation, getContactMessages);

/**
 * @swagger
 * /api/contact/{id}:
 *   get:
 *     summary: İletişim mesajı detayını getir
 *     description: Belirtilen iletişim mesajının detaylarını döndürür (Admin/Organizer)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: İletişim mesajı ID'si
 *     responses:
 *       200:
 *         description: İletişim mesajı detayları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
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
 *         description: İletişim mesajı bulunamadı
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
 *   put:
 *     summary: İletişim mesajını güncelle
 *     description: İletişim mesajının durumunu, önceliğini veya etiketlerini günceller (Admin/Organizer)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: İletişim mesajı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, replied, resolved, archived]
 *                 description: Mesaj durumu
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Mesaj önceliği
 *               assignedTo:
 *                 type: string
 *                 description: Atanan admin ID'si
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Mesaj etiketleri
 *               isRead:
 *                 type: boolean
 *                 description: Okundu durumu
 *     responses:
 *       200:
 *         description: İletişim mesajı başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
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
 *         description: İletişim mesajı bulunamadı
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
 *     summary: İletişim mesajını sil
 *     description: Belirtilen iletişim mesajını siler (Sadece Admin)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: İletişim mesajı ID'si
 *     responses:
 *       200:
 *         description: İletişim mesajı başarıyla silindi
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
 *                   example: "İletişim mesajı başarıyla silindi"
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Yetki yetersiz (Sadece Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: İletişim mesajı bulunamadı
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
router.get('/:id', authorize('admin', 'organizer'), idValidation, getContactMessage);
router.put('/:id', authorize('admin', 'organizer'), idValidation, updateContactMessage);
router.delete('/:id', authorize('admin'), idValidation, deleteContactMessage);

/**
 * @swagger
 * /api/contact/{id}/reply:
 *   post:
 *     summary: İletişim mesajına cevap ver
 *     description: Belirtilen iletişim mesajına cevap gönderir (Admin/Organizer)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: İletişim mesajı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactReply'
 *     responses:
 *       200:
 *         description: Cevap başarıyla gönderildi
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
 *                   example: "Cevap başarıyla gönderildi"
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
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
 *         description: İletişim mesajı bulunamadı
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
router.post('/:id/reply', authorize('admin', 'organizer'), idValidation, replyToContact);

module.exports = router; 
 