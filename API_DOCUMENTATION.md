# MEÜMT API Dokümantasyonu

## Genel Bakış

MEÜMT (Mersin Üniversitesi Müzik Teknolojileri) API'si, müzik teknolojileri topluluğu için geliştirilmiş RESTful web servisidir. Bu API, kullanıcı yönetimi, etkinlik organizasyonu, forum işlemleri, galeri yönetimi ve daha fazlası için kapsamlı endpoint'ler sunar.

## 🚀 Hızlı Başlangıç

### API Dokümantasyonuna Erişim

API dokümantasyonu Swagger UI ile interaktif olarak sunulmaktadır:

- **Development**: http://localhost:5002/api-docs
- **Production**: https://api.meumt.edu.tr/api-docs

### Base URL'ler

- **Development**: `http://localhost:5002/api`
- **Production**: `https://api.meumt.edu.tr/api`

## 🔐 Kimlik Doğrulama

API, JWT (JSON Web Token) tabanlı kimlik doğrulama kullanır.

### Token Alma

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Token Kullanımı

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Token Yenileme

```bash
POST /api/auth/refresh-token
# Refresh token otomatik olarak cookie'den alınır
```

## 📋 Ana Endpoint Kategorileri

### 1. Kimlik Doğrulama (Authentication)
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgileri
- `POST /api/auth/refresh-token` - Token yenileme

### 2. Kullanıcı Yönetimi (Users)
- `POST /api/users/register` - Yeni kullanıcı kaydı
- `POST /api/users/login` - Kullanıcı girişi
- `POST /api/users/logout` - Kullanıcı çıkışı
- `POST /api/users/forgot-password` - Şifre sıfırlama isteği
- `PUT /api/users/reset-password/:token` - Şifre sıfırlama
- `GET /api/users/verify-email/:token` - E-posta doğrulama
- `GET /api/users/me` - Profil bilgileri
- `PUT /api/users/update-profile` - Profil güncelleme
- `PUT /api/users/update-password` - Şifre değiştirme
- `POST /api/users/upload-avatar` - Avatar yükleme

### 3. Etkinlik Yönetimi (Events)
- `GET /api/events` - Etkinlik listesi
- `GET /api/events/:id` - Etkinlik detayı
- `POST /api/events` - Yeni etkinlik oluşturma (Admin)
- `PUT /api/events/:id` - Etkinlik güncelleme (Admin)
- `DELETE /api/events/:id` - Etkinlik silme (Admin)
- `POST /api/events/:id/register` - Etkinliğe katılma
- `DELETE /api/events/:id/register` - Etkinlik kaydını iptal etme

### 4. Forum İşlemleri
- `GET /api/forum` - Forum gönderileri
- `POST /api/forum` - Yeni gönderi oluşturma
- `GET /api/forum/:id` - Gönderi detayı
- `PUT /api/forum/:id` - Gönderi güncelleme
- `DELETE /api/forum/:id` - Gönderi silme

### 5. Galeri Yönetimi
- `GET /api/gallery` - Galeri öğeleri
- `POST /api/gallery` - Yeni galeri öğesi ekleme
- `GET /api/gallery/:id` - Galeri öğesi detayı
- `PUT /api/gallery/:id` - Galeri öğesi güncelleme
- `DELETE /api/gallery/:id` - Galeri öğesi silme

### 6. İletişim
- `POST /api/contact` - İletişim formu gönderimi
- `GET /api/contact` - İletişim mesajları (Admin)

### 7. Üyelik Başvuruları
- `POST /api/membership` - Üyelik başvurusu
- `GET /api/membership` - Başvuru listesi (Admin)
- `PUT /api/membership/:id` - Başvuru durumu güncelleme (Admin)

## 🔒 Yetkilendirme Seviyeleri

### Kullanıcı Rolleri
- **user**: Temel kullanıcı (varsayılan)
- **moderator**: Moderatör yetkileri
- **admin**: Tam yönetici yetkileri

### Yetki Gereksinimleri
- 🔓 **Herkese Açık**: Kimlik doğrulama gerektirmez
- 🔐 **Korumalı**: JWT token gerektirir
- 👑 **Admin**: Admin rolü gerektirir
- 🛡️ **Moderatör**: Moderatör veya Admin rolü gerektirir

## 📊 Standart Yanıt Formatları

### Başarılı Yanıt
```json
{
  "success": true,
  "data": {
    // Veri objesi
  },
  "message": "İşlem başarılı"
}
```

### Hata Yanıtı
```json
{
  "success": false,
  "message": "Hata mesajı",
  "errorCode": "ERROR_CODE",
  "suggestion": "Kullanıcı için öneri",
  "details": {
    // Detaylı hata bilgileri
  }
}
```

## 🔍 Filtreleme ve Sayfalama

### Query Parametreleri
- `page`: Sayfa numarası (varsayılan: 1)
- `limit`: Sayfa başına kayıt sayısı (varsayılan: 10)
- `sort`: Sıralama alanı
- `order`: Sıralama yönü (asc/desc)
- `search`: Arama terimi
- `filter`: Filtreleme kriterleri

### Örnek Kullanım
```bash
GET /api/events?page=2&limit=20&type=workshop&sort=date&order=desc
```

### Sayfalama Yanıtı
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## 📁 Dosya Yükleme

### Desteklenen Dosya Türleri
- **Resimler**: jpg, jpeg, png, gif (maks. 5MB)
- **Dökümanlar**: pdf, doc, docx (maks. 10MB)
- **Ses Dosyaları**: mp3, wav, ogg (maks. 50MB)

### Örnek Dosya Yükleme
```bash
POST /api/users/upload-avatar
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Form Data:
avatar: [file]
```

## ⚡ Rate Limiting

API istekleri sınırlandırılmıştır:
- **Genel**: 100 istek/dakika/IP
- **Giriş**: 5 deneme/15 dakika/IP
- **Kayıt**: 3 kayıt/saat/IP
- **Dosya Yükleme**: 10 yükleme/dakika/kullanıcı

## 🛡️ Güvenlik Özellikleri

### Güvenlik Başlıkları
- CORS koruması
- Helmet.js güvenlik başlıkları
- XSS koruması
- SQL injection koruması
- HPP (HTTP Parameter Pollution) koruması

### Veri Doğrulama
- Joi ile input validation
- MongoDB sanitization
- XSS temizleme
- File type validation

## 🔧 Hata Kodları

### Kimlik Doğrulama Hataları
- `MISSING_CREDENTIALS`: Kimlik bilgileri eksik
- `INVALID_EMAIL_FORMAT`: Geçersiz e-posta formatı
- `USER_NOT_FOUND`: Kullanıcı bulunamadı
- `INVALID_PASSWORD`: Yanlış şifre
- `ACCOUNT_SUSPENDED`: Hesap askıya alınmış
- `TOKEN_EXPIRED`: Token süresi dolmuş
- `INVALID_TOKEN`: Geçersiz token

### Genel Hata Kodları
- `VALIDATION_ERROR`: Veri doğrulama hatası
- `PERMISSION_DENIED`: Yetki yetersiz
- `RESOURCE_NOT_FOUND`: Kaynak bulunamadı
- `DUPLICATE_ENTRY`: Tekrarlanan kayıt
- `FILE_TOO_LARGE`: Dosya çok büyük
- `INVALID_FILE_TYPE`: Geçersiz dosya türü
- `RATE_LIMIT_EXCEEDED`: İstek sınırı aşıldı
- `DATABASE_ERROR`: Veritabanı hatası
- `INTERNAL_SERVER_ERROR`: Sunucu hatası

## 📝 Örnek Kullanım Senaryoları

### 1. Kullanıcı Kaydı ve Girişi
```bash
# 1. Kayıt ol
POST /api/users/register
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "email": "ahmet@example.com",
  "password": "password123"
}

# 2. E-posta doğrula (e-postadan gelen link)
GET /api/users/verify-email/VERIFICATION_TOKEN

# 3. Giriş yap
POST /api/users/login
{
  "email": "ahmet@example.com",
  "password": "password123"
}
```

### 2. Etkinlik Oluşturma ve Katılım
```bash
# 1. Etkinlik oluştur (Admin)
POST /api/events
Authorization: Bearer ADMIN_TOKEN
{
  "title": "Müzik Teknolojileri Workshopu",
  "description": "Ableton Live ile müzik prodüksiyonu",
  "date": "2024-02-15T14:00:00Z",
  "type": "workshop",
  "location": "Müzik Stüdyosu",
  "capacity": 20
}

# 2. Etkinliğe katıl
POST /api/events/EVENT_ID/register
Authorization: Bearer USER_TOKEN

# 3. Etkinlik detaylarını görüntüle
GET /api/events/EVENT_ID
```

### 3. Forum Gönderisi Oluşturma
```bash
# 1. Yeni gönderi oluştur
POST /api/forum
Authorization: Bearer USER_TOKEN
{
  "title": "Synthesizer Önerileri",
  "content": "Başlangıç seviyesi için hangi synthesizer'ı önerirsiniz?",
  "category": "equipment"
}

# 2. Gönderileri listele
GET /api/forum?category=equipment&page=1&limit=10
```

## 🧪 Test Etme

### Postman Collection
API'yi test etmek için Postman collection'ı kullanabilirsiniz:
- Collection URL: `/api/docs.json`

### Örnek Test Komutları
```bash
# Health check
curl -X GET http://localhost:5002/api/health

# Giriş testi
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Korumalı endpoint testi
curl -X GET http://localhost:5002/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📈 Performans İpuçları

### Önbellekleme
- Redis ile response caching
- Database query optimization
- Static file caching

### Optimizasyon
- Pagination kullanın
- Gereksiz field'ları select etmeyin
- Index'leri doğru kullanın
- Connection pooling

## 🐛 Hata Ayıklama

### Log Seviyeleri
- `error`: Kritik hatalar
- `warn`: Uyarılar
- `info`: Genel bilgiler
- `debug`: Detaylı debug bilgileri

### Log Lokasyonları
- Development: Console output
- Production: Log files + External logging service

## 📞 Destek

### İletişim
- **E-posta**: api-support@meumt.edu.tr
- **GitHub**: https://github.com/meumt/api
- **Dokümantasyon**: https://docs.meumt.edu.tr

### Sık Sorulan Sorular

**S: Token'ım neden geçersiz oluyor?**
A: JWT token'larının 30 günlük süresi vardır. Refresh token ile yenileyebilirsiniz.

**S: Dosya yükleme hatası alıyorum?**
A: Dosya boyutu ve türü limitlerini kontrol edin. Desteklenen formatlar dokümantasyonda belirtilmiştir.

**S: Rate limit hatası alıyorum?**
A: İstek sıklığınızı azaltın veya daha yüksek limit için iletişime geçin.

## 📄 Lisans

Bu API MIT lisansı altında lisanslanmıştır. Detaylar için LICENSE dosyasına bakınız.

---

**Son Güncelleme**: 2024-12-19
**API Versiyonu**: v1.0.0
**Dokümantasyon Versiyonu**: 1.0.0 