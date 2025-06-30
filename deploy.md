# 🚀 MEÜMT Web Platform - Bulut Dağıtım Rehberi

Bu dokümantasyon, MEÜMT Web Platform'un bulut servislerine (AWS, Azure, Vercel, DigitalOcean) nasıl deploy edileceğini açıklar.

## 📋 İçindekiler

- [Heroku Deployment](#heroku-deployment)
- [Vercel Deployment](#vercel-deployment)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Azure Deployment](#azure-deployment)
- [DigitalOcean Deployment](#digitalocean-deployment)
- [MongoDB Atlas](#mongodb-atlas)
- [Environment Variables](#environment-variables)

## 🌐 Heroku Deployment

### 1. Heroku CLI Kurulumu
```bash
# Heroku CLI'yi yükleyin
npm install -g heroku

# Giriş yapın
heroku login
```

### 2. Heroku Uygulaması Oluşturma
```bash
# Backend için
heroku create meumt-backend-api

# Frontend için (ayrı uygulama)
heroku create meumt-frontend-app
```

### 3. Backend Deployment
```bash
cd backend

# Git remote ekle
heroku git:remote -a meumt-backend-api

# Environment variables set et
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-production-key
heroku config:set MONGO_URI=your-mongodb-atlas-connection-string

# MongoDB Atlas addon (opsiyonel)
heroku addons:create mongolab:sandbox

# Deploy
git subtree push --prefix backend heroku main
```

### 4. Frontend Deployment (Heroku)
```bash
cd frontend

# Build script ekle package.json'a
{
  "scripts": {
    "heroku-postbuild": "npm run build"
  }
}

# Deploy
heroku git:remote -a meumt-frontend-app
git subtree push --prefix frontend heroku main
```

## ⚡ Vercel Deployment

### 1. Frontend (Vercel)
```bash
# Vercel CLI yükle
npm install -g vercel

cd frontend

# Deploy
vercel

# Production deploy
vercel --prod
```

### 2. Backend (Vercel Functions)
```javascript
// api/index.js (Vercel serverless function)
const app = require('../backend/server');

module.exports = app;
```

### 3. Vercel Configuration
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "MONGO_URI": "@mongo_uri",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

## ☁️ AWS EC2 Deployment

### 1. EC2 Instance Kurulumu
```bash
# Ubuntu 20.04 LTS instance başlat
# Security Group: HTTP (80), HTTPS (443), SSH (22)

# SSH ile bağlan
ssh -i your-key.pem ubuntu@your-ec2-ip

# Node.js yükle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB yükle
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Nginx yükle
sudo apt update
sudo apt install nginx

# PM2 yükle (process manager)
sudo npm install -g pm2
```

### 2. Uygulama Deploy
```bash
# Git repo clone
git clone https://github.com/your-repo/meumt-web-platform.git
cd meumt-web-platform

# Backend kurulum
cd backend
npm install --production
cp .env.example .env
# .env dosyasını düzenle

# PM2 ile başlat
pm2 start server.js --name "meumt-backend"
pm2 startup
pm2 save

# Frontend build
cd ../frontend
npm install
npm run build
```

### 3. Nginx Configuration
```nginx
# /etc/nginx/sites-available/meumt
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /home/ubuntu/meumt-web-platform/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Nginx konfigürasyonunu aktive et
sudo ln -s /etc/nginx/sites-available/meumt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)
```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

sudo certbot --nginx -d your-domain.com
```

## 🔵 Azure Deployment

### 1. Azure App Service
```bash
# Azure CLI yükle ve login
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login

# Resource group oluştur
az group create --name meumt-rg --location "East US"

# App Service plan oluştur
az appservice plan create --name meumt-plan --resource-group meumt-rg --sku B1 --is-linux

# Web app oluştur (Backend)
az webapp create --resource-group meumt-rg --plan meumt-plan --name meumt-backend --runtime "NODE|18-lts"

# Web app oluştur (Frontend)
az webapp create --resource-group meumt-rg --plan meumt-plan --name meumt-frontend --runtime "NODE|18-lts"
```

### 2. Environment Variables
```bash
# Backend env vars
az webapp config appsettings set --resource-group meumt-rg --name meumt-backend --settings \
  NODE_ENV=production \
  JWT_SECRET=your-secret \
  MONGO_URI=your-mongodb-atlas-uri \
  PORT=8000
```

### 3. Deploy with GitHub Actions
```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd backend
        npm install
        
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'meumt-backend'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: ./backend
```

## 🌊 DigitalOcean Deployment

### 1. Droplet Oluşturma
```bash
# Ubuntu 20.04 droplet oluştur (CLI veya web interface)
# 1GB RAM, 25GB SSD ($5/month plan)

# SSH key ekle
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 2. Docker Deployment
```bash
# Droplet'e SSH ile bağlan
ssh root@your-droplet-ip

# Docker yükle
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose yükle
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git repo clone
git clone https://github.com/your-repo/meumt-web-platform.git
cd meumt-web-platform

# Environment dosyası oluştur
cp backend/.env.example backend/.env
# Düzenle

# Docker ile deploy
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5002:5002"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongodb:27017/meumt_web_prod
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    restart: unless-stopped

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl-certs:/etc/nginx/ssl
    restart: unless-stopped

volumes:
  mongodb_data:
```

## 🍃 MongoDB Atlas Setup

### 1. Atlas Cluster Oluşturma
```bash
# MongoDB Atlas'a kaydol
# M0 (Free tier) cluster oluştur
# Region: Yakın bölge seç (eu-west-1, us-east-1)
```

### 2. Database Configuration
```javascript
// Connection string
const MONGO_URI = "mongodb+srv://username:password@cluster0.abc123.mongodb.net/meumt_web?retryWrites=true&w=majority";

// IP Whitelist
// 0.0.0.0/0 (tüm IP'ler için - production'da önerilmez)
// Specific IPs (production için önerilen)
```

### 3. Security Settings
```javascript
// Database User oluştur
// Permissions: readWrite @meumt_web

// Network Access
// Add IP Address: Current IP
// Add IP Address: 0.0.0.0/0 (geliştirme için)
```

## 🔧 Environment Variables

### Production Environment Variables
```env
# Shared
NODE_ENV=production
PORT=5002

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/meumt_web

# Authentication
JWT_SECRET=super-secret-production-key-min-32-chars
JWT_EXPIRE=7d

# Security
CORS_ORIGIN=https://your-frontend-domain.com

# Email (Production SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=noreply@yourdomain.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn

# Caching
REDIS_URL=redis://localhost:6379
```

### Platform-Specific Deployment Commands

```bash
# Heroku
heroku config:set NODE_ENV=production JWT_SECRET=xxx MONGO_URI=xxx

# Vercel
vercel env add NODE_ENV
vercel env add JWT_SECRET
vercel env add MONGO_URI

# AWS (using AWS CLI)
aws ssm put-parameter --name "/meumt/NODE_ENV" --value "production" --type "String"

# Azure
az webapp config appsettings set --resource-group meumt-rg --name meumt-backend --settings NODE_ENV=production
```

## 📊 Monitoring & Logging

### 1. Application Monitoring
```javascript
// Sentry for error tracking
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### 2. Logging Configuration
```javascript
// Production Winston config
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 🚀 CI/CD Pipeline Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd backend
          npm ci
          
      - name: Run tests
        run: |
          cd backend
          npm run test:coverage
          
      - name: Security audit
        run: |
          cd backend
          npm audit --audit-level high

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "meumt-backend-api"
          heroku_email: "your-email@example.com"
          appdir: "backend"
```

---

Bu rehber, MEÜMT Web Platform'un çeşitli bulut servislerine nasıl deploy edileceğini gösterir. Her platform için özel konfigürasyonlar ve best practice'ler uygulanmıştır. 