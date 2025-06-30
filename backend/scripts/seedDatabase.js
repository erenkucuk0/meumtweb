const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Permission = require('../models/Permission');
const SystemConfig = require('../models/SystemConfig');

const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    console.log('🚀 Database seeding started...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Permission.deleteMany({});
    await SystemConfig.deleteMany({});
    console.log('✅ Existing data cleared');

    console.log('📋 Creating default permissions...');
    await Permission.createDefaultPermissions();
    console.log('✅ Default permissions created');

    console.log('👤 Creating default admin user...');
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      admin = new User({
        firstName: 'Admin',
        lastName: 'MEUMT',
        email: 'admin@meumt.edu.tr',
        password: 'admin123456',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        permissions: []
      });
      
      await admin.save();
      console.log('✅ Default admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: admin123456`);

    const allPermissions = await Permission.find({ isActive: true });
    admin.permissions = allPermissions.map(p => p._id);
    await admin.save();
    console.log('✅ All permissions assigned to admin');

    console.log('⚙️ Creating default system configuration...');
    const systemConfig = await SystemConfig.create({
      membershipFee: {
        amount: 50,
        currency: 'TL'
      },
      paymentInfo: {
        ibanNumber: 'TR33 0006 1005 1978 6457 8413 26',
        bankName: 'Türkiye İş Bankası',
        accountHolderName: 'MEUMT Topluluk Hesabı',
        description: 'Üyelik ücretinizi bu hesaba yatırarak dekont fotoğrafını yükleyiniz.'
      },
      heroSection: {
        maxImages: 5,
        minImages: 1
      },
      songSuggestions: {
        maxSongs: 10,
        minSongs: 7,
        autoApproval: false
      },
      eventsSection: {
        maxEvents: 3,
        minEvents: 1
      },
      siteSettings: {
        siteName: 'MEUMT Müzik Topluluğu',
        siteDescription: 'Mersin Üniversitesi Müzik Topluluğu resmi web sitesi',
        contactEmail: 'iletisim@meumt.com'
      },
      socialMedia: {
        twitter: 'https://twitter.com/meumt',
        instagram: 'https://instagram.com/meumt',
        youtube: 'https://youtube.com/@meumt',
        tiktok: 'https://tiktok.com/@meumt'
      },
      googleSheets: {
        isActive: false,
        worksheetName: 'Members'
      },
      isActive: true,
      lastUpdatedBy: admin._id,
      version: '1.0.0'
    });
    console.log('✅ Default system configuration created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👤 Admin User: ${admin.email}`);
    console.log(`   🔐 Password: admin123456`);
    console.log(`   📋 Permissions: ${allPermissions.length} created`);
    console.log(`   ⚙️ System Config: Version ${systemConfig.version}`);
    console.log(`   💰 Membership Fee: ${systemConfig.formattedMembershipFee}`);
    
    console.log('\n🔗 Next Steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Login with admin credentials');
    console.log('   3. Configure Google Sheets (optional)');
    console.log('   4. Update system settings as needed');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase; 