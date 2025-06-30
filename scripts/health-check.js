#!/usr/bin/env node

/**
 * MEÜMT Health Check Script
 * Context7 pattern: Comprehensive system health monitoring
 */

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const config = {
  backend: {
    host: 'localhost',
    port: 5002,
    healthEndpoint: '/api/health'
  },
  frontend: {
    host: 'localhost',
    port: 3000
  },
  database: {
    // Will be checked via backend health endpoint
  }
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const checkPort = (host, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 3000;

    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
};

const checkHttpEndpoint = (host, port, path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout'
      });
    });

    req.end();
  });
};

const checkFileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

const checkBackend = async () => {
  log('\n🔍 Backend Durumu Kontrol Ediliyor...', 'cyan');
  
  const portOpen = await checkPort(config.backend.host, config.backend.port);
  if (!portOpen) {
    log(`❌ Backend port ${config.backend.port} kapalı`, 'red');
    return false;
  }
  
  log(`✅ Backend port ${config.backend.port} açık`, 'green');
  
  const healthCheck = await checkHttpEndpoint(
    config.backend.host,
    config.backend.port,
    config.backend.healthEndpoint
  );
  
  if (healthCheck.status === 200 && healthCheck.data) {
    log('✅ Backend health endpoint çalışıyor', 'green');
    log(`   📊 Uptime: ${Math.floor(healthCheck.data.uptime)}s`, 'blue');
    log(`   💾 Database: ${healthCheck.data.database}`, 
        healthCheck.data.database === 'connected' ? 'green' : 'red');
    log(`   🌍 Environment: ${healthCheck.data.environment}`, 'blue');
    return true;
  } else {
    log(`❌ Backend health endpoint hatası: ${healthCheck.error || healthCheck.status}`, 'red');
    return false;
  }
};

const checkFrontend = async () => {
  log('\n🔍 Frontend Durumu Kontrol Ediliyor...', 'cyan');
  
  const portOpen = await checkPort(config.frontend.host, config.frontend.port);
  if (!portOpen) {
    log(`❌ Frontend port ${config.frontend.port} kapalı`, 'red');
    return false;
  }
  
  log(`✅ Frontend port ${config.frontend.port} açık`, 'green');
  return true;
};

const checkFiles = () => {
  log('\n🔍 Önemli Dosyalar Kontrol Ediliyor...', 'cyan');
  
  const criticalFiles = [
    'backend/package.json',
    'backend/server.js',
    'backend/.env',
    'frontend/package.json',
    'frontend/vite.config.ts',
    'backend/config/googleSheetsConfig.js'
  ];
  
  let allFilesExist = true;
  
  criticalFiles.forEach(file => {
    if (checkFileExists(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} eksik`, 'red');
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
};

const checkProcesses = async () => {
  log('\n🔍 Çalışan Processleri Kontrol Ediliyor...', 'cyan');
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('lsof -ti:5002,3000', (error, stdout, stderr) => {
      if (stdout) {
        const processes = stdout.trim().split('\n').filter(p => p);
        log(`📊 ${processes.length} process çalışıyor (port 5002, 3000)`, 'blue');
        processes.forEach(pid => {
          log(`   PID: ${pid}`, 'blue');
        });
      } else {
        log('⚠️ Port 5002 ve 3000\'de çalışan process bulunamadı', 'yellow');
      }
      resolve(true);
    });
  });
};

const suggestFixes = (results) => {
  log('\n🔧 Önerilen Çözümler:', 'magenta');
  
  if (!results.backend) {
    log('📝 Backend Sorunları:', 'yellow');
    log('   • cd backend && npm install', 'cyan');
    log('   • cd backend && npm run dev', 'cyan');
    log('   • .env dosyasını kontrol edin', 'cyan');
  }
  
  if (!results.frontend) {
    log('📝 Frontend Sorunları:', 'yellow');
    log('   • cd frontend && npm install', 'cyan');
    log('   • cd frontend && npm run dev', 'cyan');
  }
  
  if (!results.files) {
    log('📝 Dosya Sorunları:', 'yellow');
    log('   • Eksik dosyaları yeniden oluşturun', 'cyan');
    log('   • Git repository\'yi kontrol edin', 'cyan');
  }
  
  log('\n🚀 Hızlı Başlatma:', 'green');
  log('   • npm run dev (hem backend hem frontend)', 'cyan');
  log('   • npm run dev:backend (sadece backend)', 'cyan');
  log('   • npm run dev:frontend (sadece frontend)', 'cyan');
};

const main = async () => {
  log('🏥 MEÜMT Platform Health Check', 'bright');
  log('=====================================', 'bright');
  
  const results = {
    backend: await checkBackend(),
    frontend: await checkFrontend(),
    files: checkFiles(),
    processes: await checkProcesses()
  };
  
  log('\n📊 SONUÇ RAPORU:', 'bright');
  log('================', 'bright');
  
  Object.entries(results).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    const color = value ? 'green' : 'red';
    log(`${icon} ${key.toUpperCase()}: ${value ? 'OK' : 'HATA'}`, color);
  });
  
  const overallHealth = Object.values(results).every(r => r);
  
  log(`\n🎯 GENEL DURUM: ${overallHealth ? 'SAĞLIKLI' : 'SORUNLU'}`, 
      overallHealth ? 'green' : 'red');
  
  if (!overallHealth) {
    suggestFixes(results);
  }
  
  process.exit(overallHealth ? 0 : 1);
};

if (require.main === module) {
  main().catch((error) => {
    log(`❌ Health check hatası: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, checkBackend, checkFrontend, checkFiles }; 