const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const enhancedSyncService = require('../services/enhancedSyncService');
const CommunityMember = require('../models/CommunityMember');
const logger = require('../utils/logger');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/meumt_web';

async function testEnhancedSync() {
  try {
    console.log('🚀 Enhanced Sync Service Test Başlatılıyor...\n');

    console.log('🔌 Veritabanına bağlanılıyor...');
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Veritabanı bağlantısı kuruldu\n');

    console.log('📊 Sync Service Durumu:');
    const initialStatus = enhancedSyncService.getStatus();
    console.log('   - Sync Running:', initialStatus.isRunning);
    console.log('   - Last Sync:', initialStatus.lastSyncTime || 'Never');
    console.log('   - Database Health:', initialStatus.health.database);
    console.log('   - Google Sheets Health:', initialStatus.health.googleSheets);
    console.log('   - Circuit Breaker State:', initialStatus.circuitBreaker.state);
    console.log('   - Total Syncs:', initialStatus.stats.totalSyncs);
    console.log('   - Success Rate:', 
      initialStatus.stats.totalSyncs > 0 
        ? `${Math.round((initialStatus.stats.successfulSyncs / initialStatus.stats.totalSyncs) * 100)}%`
        : 'N/A'
    );
    console.log('');

    console.log('🗃️  Mevcut Veritabanı Durumu:');
    const totalMembers = await CommunityMember.countDocuments();
    const pendingMembers = await CommunityMember.countDocuments({ status: 'PENDING' });
    const approvedMembers = await CommunityMember.countDocuments({ status: 'APPROVED' });
    const rejectedMembers = await CommunityMember.countDocuments({ status: 'REJECTED' });
    const fromGoogleSheets = await CommunityMember.countDocuments({ isFromGoogleSheets: true });
    const websiteApplications = await CommunityMember.countDocuments({ applicationSource: 'WEBSITE' });

    console.log(`   - Toplam Üye: ${totalMembers}`);
    console.log(`   - Bekleyen: ${pendingMembers}`);
    console.log(`   - Onaylı: ${approvedMembers}`);
    console.log(`   - Reddedilmiş: ${rejectedMembers}`);
    console.log(`   - Google Sheets'ten: ${fromGoogleSheets}`);
    console.log(`   - Website Başvuruları: ${websiteApplications}`);
    console.log('');

    console.log('🏥 Bağlantı Sağlığı Testi:');
    const healthCheck = await enhancedSyncService.ensureConnectionHealth();
    console.log('   - Database Available:', healthCheck.dbAvailable);
    console.log('   - Google Sheets Available:', healthCheck.sheetsAvailable);
    if (healthCheck.error) {
      console.log('   - Error:', healthCheck.error);
    }
    console.log('');

    console.log('🔄 Sync İşlemi Test Ediliyor...');
    try {
      const syncResult = await enhancedSyncService.performSync({
        syncPendingToSheets: true
      });

      console.log('✅ Sync başarılı!');
      console.log('   - Sync ID:', syncResult.syncId);
      console.log('   - Timestamp:', syncResult.timestamp);
      
      if (syncResult.mode === 'database-only') {
        console.log('   - Mode: Database-only (Fallback)');
        console.log('   - Is Fallback:', syncResult.isFallback);
        console.log('   - Cleaned Records:', syncResult.operations.cleaned);
        console.log('   - Validated Records:', syncResult.operations.validated);
        if (syncResult.operations.errors.length > 0) {
          console.log('   - Errors:', syncResult.operations.errors);
        }
      } else {
        console.log('   - Mode: Full Sync');
        console.log('   - Sheets to DB:');
        console.log('     * Created:', syncResult.sheetsToDb.created);
        console.log('     * Updated:', syncResult.sheetsToDb.updated);
        console.log('     * Errors:', syncResult.sheetsToDb.errors.length);
        
        console.log('   - DB to Sheets:');
        console.log('     * Synced:', syncResult.dbToSheets.synced);
        console.log('     * Errors:', syncResult.dbToSheets.errors.length);
        
        console.log('   - Summary:');
        console.log('     * Total Processed:', syncResult.summary.totalProcessed);
        console.log('     * Total Errors:', syncResult.summary.totalErrors);
      }

    } catch (syncError) {
      console.log('❌ Sync başarısız:', syncError.message);
      
      if (syncError.message.includes('Circuit breaker is OPEN')) {
        console.log('   - Circuit breaker açık durumda');
      }
    }
    console.log('');

    console.log('📊 Final Sync Service Durumu:');
    const finalStatus = enhancedSyncService.getStatus();
    console.log('   - Sync Running:', finalStatus.isRunning);
    console.log('   - Last Sync:', finalStatus.lastSyncTime);
    console.log('   - Circuit Breaker State:', finalStatus.circuitBreaker.state);
    console.log('   - Circuit Breaker Failures:', finalStatus.circuitBreaker.failures);
    console.log('   - Total Syncs:', finalStatus.stats.totalSyncs);
    console.log('   - Successful Syncs:', finalStatus.stats.successfulSyncs);
    console.log('   - Failed Syncs:', finalStatus.stats.failedSyncs);
    console.log('   - Last Error:', finalStatus.stats.lastError || 'None');
    console.log('');

    console.log('🗃️  Final Veritabanı Durumu:');
    const finalTotalMembers = await CommunityMember.countDocuments();
    const finalPendingMembers = await CommunityMember.countDocuments({ status: 'PENDING' });
    const finalApprovedMembers = await CommunityMember.countDocuments({ status: 'APPROVED' });
    const finalSyncedToSheets = await CommunityMember.countDocuments({ syncedToSheets: true });

    console.log(`   - Toplam Üye: ${finalTotalMembers} (Değişim: ${finalTotalMembers - totalMembers > 0 ? '+' : ''}${finalTotalMembers - totalMembers})`);
    console.log(`   - Bekleyen: ${finalPendingMembers} (Değişim: ${finalPendingMembers - pendingMembers > 0 ? '+' : ''}${finalPendingMembers - pendingMembers})`);
    console.log(`   - Onaylı: ${finalApprovedMembers} (Değişim: ${finalApprovedMembers - approvedMembers > 0 ? '+' : ''}${finalApprovedMembers - approvedMembers})`);
    console.log(`   - Sheets'e Senkronize: ${finalSyncedToSheets}`);
    console.log('');

    console.log('💡 Öneriler:');
    if (!healthCheck.sheetsAvailable) {
      console.log('   - ⚠️  Google Sheets erişimi yok - sadece veritabanı işlemleri yapılabilir');
      console.log('   - 🔧 Google Sheets konfigürasyonunu kontrol edin');
    }
    
    if (finalStatus.circuitBreaker.state === 'OPEN') {
      console.log('   - ⚠️  Circuit breaker açık - servis geçici olarak devre dışı');
      console.log('   - ⏰ 1 dakika sonra tekrar denenecek');
    }
    
    if (finalStatus.stats.failedSyncs > 0) {
      console.log('   - ⚠️  Başarısız sync işlemleri var');
      console.log('   - 📋 Log dosyalarını kontrol edin: backend/logs/error.log');
    }
    
    if (finalPendingMembers > 0) {
      console.log(`   - ℹ️  ${finalPendingMembers} adet bekleyen başvuru var`);
      console.log('   - 👥 Admin panelinden onaylanabilir');
    }

    console.log('\n🎉 Enhanced Sync Service testi tamamlandı!');

  } catch (error) {
    console.error('❌ Test başarısız:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Veritabanı bağlantısı kapatıldı');
  }
}

if (require.main === module) {
  testEnhancedSync();
}

module.exports = testEnhancedSync; 