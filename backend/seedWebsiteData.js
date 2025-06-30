const mongoose = require('mongoose');
const connectDB = require('./config/database');

const { HeroSection, TeamMember, WebsiteSettings } = require('./models/WebsiteContent');
const Event = require('./models/event');
const User = require('./models/User');

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

    const heroSections = [
      {
        title: 'MEÜMT',
        subtitle: 'Mersin Üniversitesi Müzik Teknolojileri Topluluğu',
        description: 'Müzik ve teknolojinin buluştuğu noktada, yaratıcılığımızı paylaşıyoruz.',
        ctaText: 'Keşfet',
        ctaLink: '#about',
        backgroundImage: 'default-hero-bg.jpg',
        isActive: true,
        order: 1
      }
    ];

    const teamMembers = [
      {
        name: 'Ahmet Yılmaz',
        title: 'Başkan',
        description: 'Müzik teknolojileri alanında deneyimli, topluluğumuzun kurucu üyelerinden.',
        photo: 'default-avatar.jpg',
        socialLinks: {
          instagram: 'https://instagram.com/ahmetyilmaz',
          linkedin: 'https://linkedin.com/in/ahmetyilmaz'
        },
        isActive: true,
        order: 1,
        addedBy: adminUser._id
      },
      {
        name: 'Ayşe Demir',
        title: 'Başkan Yardımcısı',
        description: 'Etkinlik organizasyonu ve sosyal medya yönetimi konularında uzman.',
        photo: 'default-avatar.jpg',
        socialLinks: {
          instagram: 'https://instagram.com/aysedemir',
          twitter: 'https://twitter.com/aysedemir'
        },
        isActive: true,
        order: 2,
        addedBy: adminUser._id
      },
      {
        name: 'Mehmet Özkan',
        title: 'Teknoloji Sorumlusu',
        description: 'Yazılım geliştirme ve ses teknolojileri alanında aktif çalışmalar yürütüyor.',
        photo: 'default-avatar.jpg',
        socialLinks: {
          github: 'https://github.com/mehmetozkan',
          linkedin: 'https://linkedin.com/in/mehmetozkan'
        },
        isActive: true,
        order: 3,
        addedBy: adminUser._id
      }
    ];

    const events = [
      {
        title: 'Müzik Teknolojileri Workshop',
        description: 'DAW kullanımı, müzik prodüksiyonu ve ses teknolojileri üzerine interaktif workshop.',
        date: new Date('2024-04-15'),
        time: '14:00',
        location: 'MEÜMT Stüdyo',
        organizer: 'MEÜMT',
        eventType: 'workshop',
        image: 'default-event.jpg',
        isPublic: true
      },
      {
        title: 'Akustik Konser',
        description: 'Topluluk üyelerinin performans sergileyeceği akustik konser etkinliği.',
        date: new Date('2024-04-22'),
        time: '19:00',
        location: 'Mersin Üniversitesi Kültür Merkezi',
        organizer: 'MEÜMT',
        eventType: 'concert',
        image: 'default-event.jpg',
        isPublic: true
      },
      {
        title: 'Elektronik Müzik Semineri',
        description: 'Elektronik müzik üretimi ve dijital ses işleme teknikleri semineri.',
        date: new Date('2024-05-05'),
        time: '16:00',
        location: 'Mühendislik Fakültesi Amfi',
        organizer: 'MEÜMT',
        eventType: 'seminar',
        image: 'default-event.jpg',
        isPublic: true
      }
    ];

    const websiteSettings = {
      siteName: 'MEÜMT',
      siteDescription: 'Mersin Üniversitesi Müzik Teknolojileri Topluluğu',
      logo: 'default-logo.png',
      socialMedia: {
        instagram: 'https://instagram.com/meumt',
        youtube: 'https://youtube.com/@meumt',
        twitter: 'https://twitter.com/meumt'
      },
      contactEmail: 'info@meumt.com',
      contactPhone: '+90 324 000 00 00',
      address: 'Mersin Üniversitesi, Çiftlikköy Kampüsü, Yenişehir/Mersin'
    };

    await HeroSection.insertMany(heroSections);
    console.log('Hero sections created successfully');

    await TeamMember.insertMany(teamMembers);
    console.log('Team members created successfully');

    await Event.insertMany(events);
    console.log('Events created successfully');

    await WebsiteSettings.create(websiteSettings);
    console.log('Website settings created successfully');

    console.log('Website sample data seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding website data:', error);
    process.exit(1);
  }
};

seedWebsiteData(); 