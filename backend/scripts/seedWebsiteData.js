const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meumt_web', {});
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const { HeroSection, TeamMember, WebsiteSettings } = require('../models/WebsiteContent');
const Event = require('../models/event');
const User = require('../models/User');

const seedWebsiteData = async () => {
  try {
    await connectDB();

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('Admin kullanıcı bulunamadı. Önce admin kullanıcı oluşturun.');
      process.exit(1);
    }

    await HeroSection.deleteMany({});
    await TeamMember.deleteMany({});
    await Event.deleteMany({});

    const sourceDir = path.join(__dirname, '..', '..', 'photos');
    const targetDir = path.join(__dirname, '..', 'uploads', 'hero');

    await fs.mkdir(targetDir, { recursive: true });

    const photosToUse = [
      'art212.jpg',
      'music.jpg',
      'gettyimages-157185630.webp',
      'Music-Streaming-Wars.webp',
      '1708844206-mdl_beast_jb_2022_12_04_02_1400-2386_alivecoverage.avif'
    ];

    for (const photo of photosToUse) {
      try {
        await fs.copyFile(
          path.join(sourceDir, photo),
          path.join(targetDir, photo)
        );
        console.log(`${photo} başarıyla kopyalandı`);
      } catch (error) {
        console.error(`${photo} kopyalanırken hata oluştu:`, error);
      }
    }

    const heroSections = [
      {
        title: 'MEÜMT',
        subtitle: 'Mersin Üniversitesi Müzik Teknolojileri Topluluğu',
        description: 'Müzik ve teknolojinin buluştuğu noktada, yaratıcılığımızı paylaşıyoruz.',
        backgroundImage: 'art212.jpg',
        isActive: true,
        order: 1
      },
      {
        title: 'Müzik Tutkusu',
        subtitle: 'Birlikte Üretiyoruz',
        description: 'Topluluğumuzda müzik yapmanın ve üretmenin keyfini çıkarın.',
        backgroundImage: 'music.jpg',
        isActive: true,
        order: 2
      },
      {
        title: 'Canlı Performanslar',
        subtitle: 'Sahne Deneyimi',
        description: 'Düzenli etkinliklerimizle sahne deneyimi kazanın.',
        backgroundImage: 'gettyimages-157185630.webp',
        isActive: true,
        order: 3
      },
      {
        title: 'Müzik Teknolojileri',
        subtitle: 'Modern Ekipmanlar',
        description: 'En son teknoloji ekipmanlarla müzik üretimi yapın.',
        backgroundImage: 'Music-Streaming-Wars.webp',
        isActive: true,
        order: 4
      },
      {
        title: 'Etkinlikler',
        subtitle: 'Konserler ve Workshoplar',
        description: 'Düzenli etkinliklerimizle müzik dünyasını keşfedin.',
        backgroundImage: '1708844206-mdl_beast_jb_2022_12_04_02_1400-2386_alivecoverage.avif',
        isActive: true,
        order: 5
      }
    ];

    await HeroSection.insertMany(heroSections);
    console.log('Hero sections created successfully');

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedWebsiteData(); 