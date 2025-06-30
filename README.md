# 🎵 MEÜMT Web Platform

Mersin Üniversitesi Müzik Topluluğu'nun resmi web platformu. Modern teknolojiler kullanılarak geliştirilmiş full-stack web uygulaması.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Stack](#teknoloji-stack)
- [Kurulum](#kurulum)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Test](#test)
- [Docker](#docker)
- [Güvenlik](#güvenlik)
- [Proje Yapısı](#proje-yapısı)
- [Katkı](#katkı)

## ✨ Özellikler

### 🔐 Kimlik Doğrulama & Yetkilendirme
- JWT tabanlı authentication
- Role-based access control (RBAC)
- Güvenli password hashing (bcrypt)
- Multi-factor authentication desteği

### 🎉 Etkinlik Yönetimi
- CRUD operasyonları
- Gelişmiş filtreleme ve arama
- Pagination & sorting
- Real-time notifications

### 👥 Topluluk Yönetimi
- Üyelik sistemi
- Kullanıcı profilleri
- Admin dashboard
- İstatistik raporları

### 🛡️ Güvenlik
- Rate limiting
- XSS/CSRF koruması
- Input sanitization
- Security headers (helmet.js)

### 🚀 Performans
- Memory caching (node-cache)
- Database query optimization
- Compression middleware
- Async/await pattern

## 🛠️ Teknoloji Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL veritabanı
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **Google Sheets API** - Üye verileri entegrasyonu
- **Multer** - File upload

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Health check endpoints
- **Caching**: Node-cache (Memory)

## 🚀 Kurulum

### Hızlı Başlangıç

```bash
# Repository'yi klonlayın
git clone https://github.com/meumt/web-platform.git
cd meumt-web-platform

# Tüm bağımlılıkları yükleyin
npm run install:all

# Sistem durumunu kontrol edin
npm run health

# Development sunucularını başlatın
npm run dev
```

### Manuel Kurulum

```bash
# Backend kurulumu
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenleyin

# Frontend kurulumu
cd ../frontend
npm install

# Ana dizinden her ikisini başlatın
cd ..
npm run dev
```

## 🔧 Kullanılabilir Komutlar

### Geliştirme
```bash
npm run dev                # Backend + Frontend (önerilen)
npm run dev:backend        # Sadece backend
npm run dev:frontend       # Sadece frontend
```

### Üretim
```bash
npm run build             # Tüm projeyi build et
npm run start             # Üretim sunucularını başlat
```

### Bakım
```bash
npm run health            # Sistem durumu kontrolü
npm run kill-ports        # Port 5002 ve 3000'i temizle
npm run clean             # node_modules temizle
npm run setup             # Kurulum + health check
```

## 🏥 Sistem Durumu Kontrolü

Platform, kronik sorunları otomatik tespit eden gelişmiş bir health check sistemi içerir:

```bash
npm run health
```

Bu komut şunları kontrol eder:
- ✅ Backend durumu (port 5002)
- ✅ Frontend durumu (port 3000)
- ✅ Database bağlantısı
- ✅ Kritik dosyaların varlığı
- ✅ Çalışan process'ler

## 🔀 Port Yönetimi

### Otomatik Port Bulma
Sistem, port çakışması durumunda otomatik olarak müsait port bulur:

**Backend**: 5002, 5003, 5004, ...
**Frontend**: 3000, 3001, 3002, ...

### Manuel Port Temizleme
```bash
npm run kill-ports
```

## 🛡️ Çözülen Kronik Sorunlar

### 1. SystemConfig Populate Hatası
- **Sorun**: `adminUser` field'ı için StrictPopulateError
- **Çözüm**: Context7 best practices ile `strictPopulate: false` ve güvenli populate pattern'leri

### 2. Auth Middleware User.findById Hatası
- **Sorun**: User model lazy loading sorunları
- **Çözüm**: Enhanced caching, retry logic ve connection validation

### 3. Port Çakışmaları
- **Sorun**: EADDRINUSE hataları
- **Çözüm**: Otomatik port bulma ve graceful shutdown

### 4. Google Sheets Entegrasyon Sorunları
- **Sorun**: API initialization ve configuration hataları
- **Çözüm**: Enhanced error handling ve fallback mechanisms

### 5. Frontend Proxy Sorunları
- **Sorun**: Vite proxy konfigürasyonu
- **Çözüm**: Enhanced proxy configuration ve error handling

## 📁 Proje Yapısı

```
meumt-web-platform/
├── backend/                 # Node.js API
│   ├── api/                # Route handlers
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── scripts/                # Utility scripts
│   └── health-check.js     # System health monitoring
└── package.json            # Root package configuration
```

## 🔐 Environment Variables

Backend `.env` dosyası:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/meumt_web

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=30d

# Google Sheets
GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/your-sheet-id

# Server
PORT=5002
NODE_ENV=development
```

## 🧪 Testing

```bash
npm run test              # Tüm testler
npm run test:backend      # Backend testleri
npm run test:frontend     # Frontend testleri
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/register` - Kullanıcı kaydı
- `GET /api/auth/me` - Kullanıcı profili

### Membership
- `POST /api/membership/apply` - Üyelik başvurusu
- `GET /api/membership/admin/applications` - Başvuru listesi (Admin)
- `POST /api/membership/admin/sync-sheets` - Google Sheets senkronizasyonu

### Health Check
- `GET /api/health` - Sistem durumu

## 🚨 Sorun Giderme

### Backend Başlamıyor
```bash
# Port kontrolü
npm run kill-ports

# Dependencies kontrolü
cd backend && npm install

# Environment kontrolü
cp backend/.env.example backend/.env
```

### Frontend Başlamıyor
```bash
# Port kontrolü
npm run kill-ports

# Dependencies kontrolü
cd frontend && npm install

# Build cache temizleme
cd frontend && rm -rf node_modules/.vite
```

### Database Bağlantı Sorunu
```bash
# MongoDB durumu kontrol et
brew services list | grep mongodb
# veya
systemctl status mongod

# MongoDB başlat
brew services start mongodb-community
# veya
sudo systemctl start mongod
```

### Google Sheets Entegrasyonu
1. Service account JSON dosyasını `backend/config/` klasörüne yerleştirin
2. Google Sheets URL'ini `.env` dosyasına ekleyin
3. Sheet'e service account email'ini paylaşım izni verin

## 📝 Changelog

### v1.1.0 - Kronik Sorunlar Çözüldü
- ✅ SystemConfig populate hataları düzeltildi
- ✅ Auth middleware enhanced error handling
- ✅ Otomatik port management eklendi
- ✅ Google Sheets entegrasyonu iyileştirildi
- ✅ Frontend proxy konfigürasyonu düzeltildi
- ✅ Health check sistemi eklendi
- ✅ Graceful shutdown implementasyonu

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👥 Geliştirici Ekibi

- **MEÜMT Development Team** - [GitHub](https://github.com/meumt)

## 📞 İletişim

- **Website**: [meumt.com](https://meumt.com)
- **Email**: iletisim@meumt.com
- **GitHub**: [github.com/meumt](https://github.com/meumt)

---

**Not**: Bu platform Context7 best practices kullanılarak geliştirilmiştir ve üretim ortamında güvenle kullanılabilir.

## 📚 API Dokümantasyonu

### Swagger UI
Geliştirme sırasında API dokümantasyonuna erişim:
```
http://localhost:5002/api-docs/
```

### Temel Endpoint'ler

#### 🔐 Authentication
```
POST /api/auth/register    # Kullanıcı kaydı
POST /api/auth/login       # Giriş
GET  /api/auth/me          # Profil bilgisi
PUT  /api/auth/profile     # Profil güncelleme
```

#### 🎉 Events
```
GET    /api/events         # Tüm etkinlikler (pagination, filtering)
POST   /api/events         # Yeni etkinlik oluştur (auth required)
GET    /api/events/:id     # Tek etkinlik detayı
PUT    /api/events/:id     # Etkinlik güncelle (auth required)
DELETE /api/events/:id     # Etkinlik sil (admin only)
```

#### 👥 Community
```
GET    /api/community/members        # Topluluk üyeleri
POST   /api/community/join           # Topluluğa katıl
GET    /api/community/admin/stats    # Admin istatistikleri
```

#### 📧 Contact
```
POST   /api/contact                  # İletişim formu gönder
```

### API Features

#### Pagination
```
GET /api/events?page=1&limit=10
```

#### Filtering & Search
```
GET /api/events?type=workshop&search=react&sort=-date
```

#### HATEOAS Support
```json
{
  "success": true,
  "data": { "events": [...] },
  "_links": {
    "self": "/api/events?page=1",
    "next": "/api/events?page=2",
    "create": "/api/events"
  }
}
```

## 🐳 Docker

### Development Environment

```bash
# Build ve run
docker-compose up --build

# Background'da çalıştır
docker-compose up -d

# Sadece backend
docker-compose up backend mongodb

# Clean up
docker-compose down -v
```

### Production Build

```bash
# Backend image oluştur
cd backend
docker build -t meumt-backend:latest .

# Multi-stage production build
docker build -f Dockerfile.prod -t meumt-backend:prod .
```

### Servisler
- **Backend**: http://localhost:5002
- **Frontend**: http://localhost:3000  
- **MongoDB**: localhost:27017
- **API Docs**: http://localhost:5002/api-docs

## 🔒 Güvenlik

### Uygulanan Güvenlik Önlemleri

1. **Input Validation & Sanitization**
   - express-validator ile kapsamlı validation
   - xss-clean ile XSS koruması
   - express-mongo-sanitize ile NoSQL injection koruması

2. **Authentication & Authorization**
   - JWT token tabanlı auth
   - bcryptjs ile password hashing
   - Role-based access control

3. **Rate Limiting**
   - API endpoint'leri için rate limiting
   - Brute force attack koruması

4. **Security Headers**
   - helmet.js ile güvenlik header'ları
   - CORS konfigürasyonu
   - CSP (Content Security Policy)

5. **Data Protection**
   - Hassas veri maskeleme
   - Secure cookie settings
   - Environment variable kullanımı

## 📁 Proje Yapısı

```
meumt-web-platform/
├── backend/
│   ├── api/                 # API routes & controllers
│   │   ├── auth/           # Authentication endpoints
│   │   ├── events/         # Event management
│   │   ├── community/      # Community features
│   │   └── contact/        # Contact form
│   ├── config/             # Configuration files
│   │   ├── database.js     # MongoDB connection
│   │   ├── swagger.js      # API documentation
│   │   └── logger.js       # Winston logger config
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── validation.js   # Input validation
│   │   ├── cache.js        # Caching middleware
│   │   ├── versioning.js   # API versioning
│   │   └── errorHandler.js # Error handling
│   ├── models/             # Mongoose models
│   │   ├── User.js         # User model
│   │   ├── Event.js        # Event model
│   │   └── CommunityMember.js
│   ├── services/           # Business logic
│   │   ├── accessControlService.js
│   │   └── membershipValidationService.js
│   ├── utils/              # Utility functions
│   │   ├── apiFeatures.js  # API utilities (pagination, etc.)
│   │   └── seedAdmin.js    # Database seeding
│   ├── tests/              # Test suites
│   │   ├── auth.test.js    # Authentication tests
│   │   ├── events.test.js  # Event tests
│   │   ├── validation.test.js
│   │   └── security.test.js
│   ├── Dockerfile          # Docker configuration
│   ├── jest.config.js      # Test configuration
│   └── server.js           # Application entry point
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── styles/         # CSS styles
│   └── public/             # Static assets
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docker-compose.yml      # Multi-container setup
└── README.md
```

## 🤝 Katkı

### Development Workflow

1. **Feature branch oluşturun:**
```bash
git checkout -b feature/new-feature
```

2. **Değişikliklerinizi commit edin:**
```bash
git commit -m "feat: add new feature"
```

3. **Testleri çalıştırın:**
```bash
npm test
```

4. **Pull request oluşturun**

### Commit Convention
```
feat: yeni özellik
fix: bug düzeltmesi  
docs: dokümantasyon güncellemesi
style: code formatting
refactor: kod düzenlemesi
test: test ekleme/güncelleme
chore: build/dependency güncellemeleri
```

### Code Standards
- ESLint rules takip edilmeli
- Test coverage %80+ olmalı
- Security best practices uygulanmalı
- API dokümantasyonu güncel tutulmalı

## 📊 Monitoring & Health

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "success",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

### Logging
- **Development**: Console output
- **Production**: Winston file logging
- **Request logging**: Morgan middleware

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.

## 👥 Takım

- **MEÜMT Development Team**
- Frontend & Backend Development
- DevOps & Infrastructure

---

**Son Güncelleme**: Aralık 2024  
**Versiyon**: 1.0.0  
**Node.js**: 18+  
**Express.js**: 4.18+ 