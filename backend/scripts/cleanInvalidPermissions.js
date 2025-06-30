const mongoose = require('mongoose');
const Permission = require('../models/Permission');

async function cleanInvalidPermissions() {
  try {
    console.log('🧹 Geçersiz permission kayıtları temizleniyor...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meumt_development';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    const invalidPermissions = await Permission.find({
      $or: [
        { 'permissions.actions': 'approve' },
        { 'permissions.actions': 'reject' },
        { 'permissions.actions': { $in: ['approve', 'reject'] } },
        { 'permissions.actions': 'approve:any' },
        { 'permissions.actions': 'reject:any' },
        { 'permissions.actions': { $in: ['approve:any', 'reject:any'] } }
      ]
    });

    console.log(`🔍 ${invalidPermissions.length} geçersiz permission kaydı bulundu`);

    if (invalidPermissions.length > 0) {
      for (const permission of invalidPermissions) {
        console.log(`❌ Siliniyor: ${permission.role} - ${JSON.stringify(permission.permissions)}`);
      }

      const deleteResult = await Permission.deleteMany({
        $or: [
          { 'permissions.actions': 'approve' },
          { 'permissions.actions': 'reject' },
          { 'permissions.actions': { $in: ['approve', 'reject'] } },
          { 'permissions.actions': 'approve:any' },
          { 'permissions.actions': 'reject:any' },
          { 'permissions.actions': { $in: ['approve:any', 'reject:any'] } }
        ]
      });

      console.log(`✅ ${deleteResult.deletedCount} geçersiz permission kaydı silindi`);
    } else {
      console.log('✅ Geçersiz permission kaydı bulunamadı');
    }

    const allPermissions = await Permission.find({});
    console.log(`📋 Toplam permission kaydı: ${allPermissions.length}`);
    
    for (const permission of allPermissions) {
      console.log(`- ${permission.role}: ${JSON.stringify(permission.permissions)}`);
    }

  } catch (error) {
    console.error('❌ Temizleme sırasında hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

if (require.main === module) {
  cleanInvalidPermissions();
}

module.exports = cleanInvalidPermissions; 