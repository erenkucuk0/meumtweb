const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@meumt.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const testMember = {
  fullName: 'Test Üye Adı',
  studentNumber: '20201234567',
  tcNumber: '12345678901',
  phoneNumber: '+90 555 123 4567',
  department: 'Bilgisayar Mühendisliği'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Admin girişi yapılıyor...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Admin girişi başarılı');
      return true;
    } else {
      console.error('❌ Admin girişi başarısız:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Admin giriş hatası:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGoogleSheetsConnection() {
  try {
    console.log('\n🔍 Google Sheets bağlantısı test ediliyor...');
    const response = await axios.post(
      `${API_BASE_URL}/api/admin/sheets/test-connection`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Google Sheets bağlantısı başarılı!');
      console.log('📊 Toplam üye sayısı:', response.data.data?.totalMembers || 'N/A');
      return true;
    } else {
      console.error('❌ Google Sheets bağlantısı başarısız:', response.data.message);
      console.error('🔍 Hata detayı:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Sheets test hatası:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Detaylı hata:', error.response.data.error);
    }
    return false;
  }
}

async function testSyncGoogleSheets() {
  try {
    console.log('\n🔄 Google Sheets senkronizasyonu test ediliyor...');
    const response = await axios.post(
      `${API_BASE_URL}/api/admin/sheets/sync`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Google Sheets senkronizasyonu başarılı!');
      console.log('📊 Senkronizasyon sonucu:', response.data.data);
      return true;
    } else {
      console.error('❌ Google Sheets senkronizasyonu başarısız:', response.data.message);
      console.error('🔍 Hata detayı:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Sheets senkronizasyon hatası:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Detaylı hata:', error.response.data.error);
    }
    return false;
  }
}

async function testManualMemberAdd() {
  try {
    console.log('\n➕ Manuel üye ekleme test ediliyor...');
    console.log('👤 Test üye bilgileri:', testMember);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/admin/members/add`,
      testMember,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Manuel üye ekleme başarılı!');
      console.log('📊 Eklenen üye:', response.data.data);
      return true;
    } else {
      console.error('❌ Manuel üye ekleme başarısız:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Manuel üye ekleme hatası:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Detaylı hata:', error.response.data.error);
    }
    return false;
  }
}

async function testGoogleSheetsStatus() {
  try {
    console.log('\n📋 Google Sheets konfigürasyon durumu kontrol ediliyor...');
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/sheets/status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Google Sheets durumu alındı');
      console.log('📊 Durum:', response.data.data.status);
      if (response.data.data.setupInstructions) {
        console.log('📝 Kurulum talimatları:', response.data.data.setupInstructions);
      }
      return true;
    } else {
      console.error('❌ Google Sheets durumu alınamadı:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Sheets durum hatası:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Manuel üye ekleme test suite başlatılıyor...\n');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('💥 Test suite sonlandırıldı: Admin girişi başarısız');
    process.exit(1);
  }
  
  const results = {
    login: true,
    status: false,
    connection: false,
    sync: false,
    manualAdd: false
  };
  
  results.status = await testGoogleSheetsStatus();
  results.connection = await testGoogleSheetsConnection();
  results.sync = await testSyncGoogleSheets();
  results.manualAdd = await testManualMemberAdd();
  
  console.log('\n📊 TEST SONUÇLARI:');
  console.log('='.repeat(50));
  console.log(`🔐 Admin Girişi: ${results.login ? '✅' : '❌'}`);
  console.log(`📋 Google Sheets Durumu: ${results.status ? '✅' : '❌'}`);
  console.log(`🔍 Google Sheets Bağlantısı: ${results.connection ? '✅' : '❌'}`);
  console.log(`🔄 Google Sheets Senkronizasyonu: ${results.sync ? '✅' : '❌'}`);
  console.log(`➕ Manuel Üye Ekleme: ${results.manualAdd ? '✅' : '❌'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📈 Genel Sonuç: ${passedTests}/${totalTests} test geçti`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Tüm testler başarılı!');
    process.exit(0);
  } else {
    console.log('⚠️ Bazı testler başarısız oldu. Lütfen hataları kontrol edin.');
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('💥 Beklenmeyen hata:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 İşlenmeyen promise reddi:', error.message);
  process.exit(1);
});

runAllTests(); 