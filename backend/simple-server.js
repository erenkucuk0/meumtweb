const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5002;

app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/hero'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/audio'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece ses dosyaları yüklenebilir'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const uploadsDir = path.join(__dirname, 'uploads/hero');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const audioUploadsDir = path.join(__dirname, 'uploads/audio');
if (!fs.existsSync(audioUploadsDir)) {
  fs.mkdirSync(audioUploadsDir, { recursive: true });
}

let mockMembers = [
  { id: '1', name: 'Eren Küçük', email: 'eren@example.com', studentNumber: '123456', status: 'active' },
  { id: '2', name: 'Test User', email: 'test@example.com', studentNumber: '789012', status: 'pending' }
];

let mockSongs = [
  { 
    _id: '1', 
    songTitle: 'Bohemian Rhapsody', 
    artistName: 'Queen', 
    albumName: 'A Night at the Opera',
    status: 'pending',
    suggestedBy: { username: 'testuser' },
    userNote: 'Harika bir şarkı!'
  },
  { 
    _id: '2', 
    songTitle: 'Stairway to Heaven', 
    artistName: 'Led Zeppelin', 
    albumName: 'Led Zeppelin IV',
    status: 'approved',
    suggestedBy: { username: 'musiclover' },
    userNote: 'Klasik rock şaheseri'
  }
];

let mockHeroSections = [
  {
    _id: '1',
    title: 'MEÜMT\'ye Hoş Geldiniz',
    subtitle: 'Müzik Teknolojileri Topluluğu',
    description: 'Mersin Üniversitesi Müzik Teknolojileri Topluluğu olarak müzik ve teknoloji alanında projeler geliştiriyoruz.',
    backgroundImage: 'default-hero-bg.jpg',
    isActive: true,
    order: 1
  }
];

let mockEvents = [
  {
    _id: '1',
    title: 'Müzik Prodüksiyon Atölyesi',
    description: 'Digital müzik prodüksiyon teknikleri üzerine workshop',
    date: '2025-07-15',
    time: '14:00',
    location: 'Müzik Stüdyosu',
    image: 'default-event.jpg',
    isPublic: true,
    status: 'published'
  }
];

let mockTeamMembers = [
  {
    _id: '1',
    name: 'Eren Küçük',
    position: 'Başkan',
    bio: 'Müzik teknolojileri alanında çalışmalar yapıyor',
    photo: 'default-avatar.jpg',
    isActive: true,
    order: 1
  }
];

app.get('/api/auth/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({
    success: true,
    message: 'Server çalışıyor',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;
  
  if (email === 'admin@meumt.com' && password === 'meumt123456') {
    res.json({
      success: true,
      message: 'Giriş başarılı',
      token: 'test-token-123',
      user: {
        id: '1',
        email: 'admin@meumt.com',
        role: 'admin',
        fullName: 'Admin User'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Geçersiz email veya şifre'
    });
  }
});

app.put('/api/admin/sheets/config', (req, res) => {
  console.log('Google Sheets config:', req.body);
  res.json({
    success: true,
    message: 'Google Sheets konfigürasyonu kaydedildi'
  });
});

app.get('/api/admin/sheets/debug-test', (req, res) => {
  console.log('Google Sheets debug test');
  res.json({
    success: true,
    message: 'Google Sheets bağlantısı test edildi',
    data: {
      spreadsheetId: '195xqak9XApyCVAxEQ7ik777oL_nIKEeiiZtsqasRXY8',
      sheetName: 'Sheet1',
      rowCount: 10
    }
  });
});

app.post('/api/admin/sheets/add-member', (req, res) => {
  console.log('Add member to sheets:', req.body);
  const { name, email, studentNumber } = req.body;
  
  const newMember = {
    id: Date.now().toString(),
    name,
    email,
    studentNumber,
    status: 'active'
  };
  
  mockMembers.push(newMember);
  
  res.json({
    success: true,
    message: 'Üye başarıyla eklendi',
    member: newMember
  });
});

app.post('/api/admin/sheets/sync', (req, res) => {
  console.log('Google Sheets sync request received');
  
  res.json({
    success: true,
    message: 'Google Sheets senkronizasyonu başarılı',
    data: {
      addedMembers: 2,
      updatedMembers: 1,
      totalProcessed: 3
    }
  });
});

app.get('/api/songs/suggestions/admin', (req, res) => {
  console.log('Get song suggestions');
  res.json({
    success: true,
    suggestions: mockSongs
  });
});

app.put('/api/songs/suggestions/admin/:id/status', (req, res) => {
  console.log('Update song status:', req.params.id, req.body);
  const { id } = req.params;
  const { status, reviewNote } = req.body;
  
  const song = mockSongs.find(s => s._id === id);
  if (song) {
    song.status = status;
    song.reviewNote = reviewNote;
    song.reviewedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: 'Şarkı durumu güncellendi',
    song
  });
});

app.post('/api/songs/suggestions', (req, res) => {
  console.log('Add new song:', req.body);
  const newSong = {
    _id: Date.now().toString(),
    ...req.body,
    status: req.body.status || 'approved',
    createdAt: new Date().toISOString()
  };
  
  mockSongs.push(newSong);
  
  res.json({
    success: true,
    message: 'Şarkı başarıyla eklendi',
    song: newSong
  });
});

app.delete('/api/songs/suggestions/:id', (req, res) => {
  console.log('Delete song:', req.params.id);
  const { id } = req.params;
  
  mockSongs = mockSongs.filter(s => s._id !== id);
  
  res.json({
    success: true,
    message: 'Şarkı silindi'
  });
});

app.get('/api/admin/website/hero', (req, res) => {
  res.json({
    success: true,
    data: mockHeroSections
  });
});

app.post('/api/admin/website/hero', (req, res) => {
  console.log('Add hero section:', req.body);
  res.json({
    success: true,
    message: 'Hero bölümü eklendi'
  });
});

app.get('/api/admin/website/team', (req, res) => {
  res.json({
    success: true,
    data: mockTeamMembers
  });
});

app.post('/api/admin/website/team', (req, res) => {
  console.log('Add team member:', req.body);
  res.json({
    success: true,
    message: 'Ekip üyesi eklendi'
  });
});

app.get('/api/admin/website/events', (req, res) => {
  res.json({
    success: true,
    data: mockEvents
  });
});

app.post('/api/admin/website/events', (req, res) => {
  console.log('Add event:', req.body);
  res.json({
    success: true,
    message: 'Etkinlik eklendi'
  });
});

app.post('/api/admin/website/hero/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Resim yüklenemedi'
    });
  }

  res.json({
    success: true,
    message: 'Hero resmi başarıyla yüklendi',
    data: {
      imageUrl: `/uploads/hero/${req.file.filename}`
    }
  });
});

app.post('/api/admin/songs/audio', audioUpload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Ses dosyası yüklenemedi'
    });
  }

  res.json({
    success: true,
    message: 'Ses dosyası başarıyla yüklendi',
    data: {
      audioUrl: `/uploads/audio/${req.file.filename}`
    }
  });
});

app.get('/api/website/hero', (req, res) => {
  console.log('Get hero sections');
  res.json({
    success: true,
    count: mockHeroSections.length,
    data: mockHeroSections
  });
});

app.get('/api/website/team', (req, res) => {
  console.log('Get team members');
  res.json({
    success: true,
    count: mockTeamMembers.length,
    data: mockTeamMembers
  });
});

app.get('/api/events', (req, res) => {
  console.log('Get events');
  res.json({
    success: true,
    count: mockEvents.length,
    data: mockEvents
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
}); 