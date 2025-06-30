const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Permission = require('../models/Permission');
const logger = require('../utils/logger');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/meumt_web';

async function fixAccessControlPermissions() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Veritabanı bağlantısı kuruldu');

    console.log('🔍 Geçersiz permission kayıtları aranıyor...');
    
    const invalidPermissions = await Permission.find({
      $or: [
        { 'actions': 'approve' },
        { 'actions': 'reject' },
        { 'actions': { $in: ['approve', 'reject'] } },
        { 'actions': 'approve:any' },
        { 'actions': 'reject:any' },
        { 'actions': { $in: ['approve:any', 'reject:any'] } }
      ]
    });

    console.log(`📊 ${invalidPermissions.length} adet geçersiz permission bulundu`);

    if (invalidPermissions.length > 0) {
      console.log('📋 Silinecek geçersiz permissionlar:');
      for (const perm of invalidPermissions) {
        console.log(`   - ${perm.role}: ${perm.resource} -> ${perm.actions.join(', ')}`);
      }

      const deleteResult = await Permission.deleteMany({
        $or: [
          { 'actions': 'approve' },
          { 'actions': 'reject' },
          { 'actions': { $in: ['approve', 'reject'] } },
          { 'actions': 'approve:any' },
          { 'actions': 'reject:any' },
          { 'actions': { $in: ['approve:any', 'reject:any'] } }
        ]
      });

      console.log(`✅ ${deleteResult.deletedCount} adet geçersiz permission silindi`);
    } else {
      console.log('✅ Geçersiz permission bulunamadı');
    }

    console.log('\n🔍 Diğer geçersiz actionlar kontrol ediliyor...');
    
    const validActions = [
      'create:any', 'read:any', 'update:any', 'delete:any',
      'create:own', 'read:own', 'update:own', 'delete:own'
    ];

    const allPermissions = await Permission.find({});
    const invalidActionPerms = [];

    for (const perm of allPermissions) {
      const hasInvalidAction = perm.actions.some(action => !validActions.includes(action));
      if (hasInvalidAction) {
        invalidActionPerms.push(perm);
      }
    }

    if (invalidActionPerms.length > 0) {
      console.log(`📊 ${invalidActionPerms.length} adet geçersiz action içeren permission bulundu`);
      console.log('📋 Silinecek geçersiz action permissionları:');
      
      for (const perm of invalidActionPerms) {
        console.log(`   - ${perm.role}: ${perm.resource} -> ${perm.actions.join(', ')}`);
        await Permission.findByIdAndDelete(perm._id);
      }
      
      console.log(`✅ ${invalidActionPerms.length} adet geçersiz action permissionı silindi`);
    } else {
      console.log('✅ Geçersiz action bulunamadı');
    }

    console.log('\n🔍 Temizlik sonrası kontrol ediliyor...');
    const remainingPerms = await Permission.find({});
    console.log(`📊 Kalan permission sayısı: ${remainingPerms.length}`);

    if (remainingPerms.length > 0) {
      console.log('📋 Kalan permissionlar:');
      for (const perm of remainingPerms) {
        console.log(`   - ${perm.role}: ${perm.resource} -> ${perm.actions.join(', ')}`);
      }
    }

    console.log('\n🎉 AccessControl permission temizliği tamamlandı!');

  } catch (error) {
    console.error('❌ Permission temizleme hatası:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Veritabanı bağlantısı kapatıldı');
    process.exit(0);
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

console.log('🚀 AccessControl Permission Temizleme Başlatılıyor...\n');
fixAccessControlPermissions(); 