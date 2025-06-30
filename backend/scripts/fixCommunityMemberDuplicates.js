const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CommunityMember = require('../models/CommunityMember');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/meumt_web';

async function fixCommunityMemberDuplicates() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Veritabanı bağlantısı kuruldu');

    console.log('🔍 Null/boş TC Kimlik numaralı üyeler aranıyor...');
    
    const nullTcMembers = await CommunityMember.find({
      $or: [
        { tcKimlikNo: null },
        { tcKimlikNo: '' },
        { tcKimlikNo: { $exists: false } }
      ]
    });

    console.log(`📊 ${nullTcMembers.length} adet null/boş TC Kimlik numaralı üye bulundu`);

    if (nullTcMembers.length > 0) {
      console.log('📋 Temizlenecek üyeler:');
      for (const member of nullTcMembers) {
        console.log(`   - ${member.fullName} (${member.studentNumber}) - TC: ${member.tcKimlikNo}`);
        
        await CommunityMember.findByIdAndUpdate(
          member._id,
          { $unset: { tcKimlikNo: 1 } },
          { strict: false }
        );
      }
      
      console.log(`✅ ${nullTcMembers.length} adet üyenin TC Kimlik numarası temizlendi`);
    } else {
      console.log('✅ Null/boş TC Kimlik numaralı üye bulunamadı');
    }

    console.log('\\n🔍 Duplicate öğrenci numaraları kontrol ediliyor...');
    
    const duplicateStudentNumbers = await CommunityMember.aggregate([
      {
        $match: {
          studentNumber: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$studentNumber',
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', fullName: '$fullName', createdAt: '$createdAt' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📊 ${duplicateStudentNumbers.length} adet duplicate öğrenci numarası bulundu`);

    for (const duplicate of duplicateStudentNumbers) {
      console.log(`\\n📋 Öğrenci Numarası: ${duplicate._id}`);
      console.log('   Duplicates:');
      
      const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const toKeep = sortedDocs[0];
      const toRemove = sortedDocs.slice(1);
      
      console.log(`   ✅ Korunacak: ${toKeep.fullName} (${toKeep.id})`);
      
      for (const doc of toRemove) {
        console.log(`   ❌ Silinecek: ${doc.fullName} (${doc.id})`);
        await CommunityMember.findByIdAndDelete(doc.id);
      }
    }

    if (duplicateStudentNumbers.length > 0) {
      console.log(`\\n✅ ${duplicateStudentNumbers.length} grup duplicate öğrenci numarası temizlendi`);
    }

    console.log('\\n🔍 Final durum kontrol ediliyor...');
    const finalCount = await CommunityMember.countDocuments();
    const nullTcCount = await CommunityMember.countDocuments({
      $or: [
        { tcKimlikNo: null },
        { tcKimlikNo: '' },
        { tcKimlikNo: { $exists: false } }
      ]
    });
    
    console.log(`📊 Toplam üye sayısı: ${finalCount}`);
    console.log(`📊 Null/boş TC Kimlik numaralı üye: ${nullTcCount}`);

    console.log('\\n🎉 CommunityMember duplicate temizliği tamamlandı!');

  } catch (error) {
    console.error('❌ Duplicate temizleme hatası:', error);
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

console.log('🚀 CommunityMember Duplicate Temizleme Başlatılıyor...\\n');
fixCommunityMemberDuplicates(); 