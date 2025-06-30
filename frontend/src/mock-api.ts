export const mockHeroSections = [
  {
    _id: '1',
    title: "MEÜMT'e Hoş Geldiniz",
    subtitle: "Müzik Tutkusunu Paylaşalım",
    description: "Mersin Üniversitesi Müzik Topluluğu olarak müziğin büyülü dünyasında bir araya geliyoruz",
    backgroundImage: "/uploads/hero/default-hero-bg.jpg",
    isActive: true,
    order: 1
  },
  {
    _id: '2',
    title: "Müzikal Yolculuk",
    subtitle: "Her Notada Bir Hikaye",
    description: "Farklı türlerden müziklerle zengin bir repertuar oluşturuyoruz",
    backgroundImage: "/uploads/hero/default-hero-bg.jpg",
    isActive: true,
    order: 2
  },
  {
    _id: '3',
    title: "Topluluk Ruhu",
    subtitle: "Birlikte Daha Güçlüyüz",
    description: "Müzik sevgisini paylaşan arkadaşlarla unutulmaz anılar yaratıyoruz",
    backgroundImage: "/uploads/hero/default-hero-bg.jpg",
    isActive: true,
    order: 3
  }
];

export const mockEvents = [
  {
    _id: '1',
    title: "Akustik Gece",
    date: "2025-07-15",
    time: "20:00",
    location: "Merkez Kütüphane Salonu",
    description: "Akustik enstrümanlarla unutulmaz bir gece",
    eventType: "konser",
    organizer: "MEÜMT",
    image: "default-event.jpg",
    isPublic: true
  },
  {
    _id: '2',
    title: "Müzik Atölyesi",
    date: "2025-07-20",
    time: "18:00",
    location: "Müzik Odası",
    description: "Yeni başlayanlar için müzik atölyesi",
    eventType: "workshop",
    organizer: "MEÜMT",
    image: "default-event.jpg",
    isPublic: true
  },
  {
    _id: '3',
    title: "Yıl Sonu Konseri",
    date: "2025-08-01",
    time: "19:30",
    location: "Kongre Merkezi",
    description: "Yılın en büyük konseri",
    eventType: "konser",
    organizer: "MEÜMT",
    image: "default-event.jpg",
    isPublic: true
  }
];

export const mockTeamMembers = [
  {
    _id: '1',
    name: "Ahmet Kaya",
    position: "Topluluk Başkanı",
    description: "Müzik tutkusu ile topluluğu yönetiyor",
    photo: "default-avatar.jpg",
    socialLinks: {
      instagram: "https://instagram.com/ahmtkaya",
      twitter: "https://twitter.com/ahmtkaya"
    },
    isActive: true,
    order: 1
  },
  {
    _id: '2',
    name: "Zeynep Demir",
    position: "Sanat Yönetmeni",
    description: "Konserlerin sanatsal yönünü planlar",
    photo: "default-avatar.jpg",
    socialLinks: {
      instagram: "https://instagram.com/zeynepdemir"
    },
    isActive: true,
    order: 2
  }
];

export const mockSongSuggestions = [
  {
    id: 1,
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    year: 1975,
    genre: 'Rock',
    votes: 156,
    image: '/images/default-album.svg'
  },
  {
    id: 2,
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    album: 'Led Zeppelin IV',
    year: 1971,
    genre: 'Rock',
    votes: 142,
    image: '/images/default-album.svg'
  },
  {
    id: 3,
    title: 'Hotel California',
    artist: 'Eagles',
    album: 'Hotel California',
    year: 1977,
    genre: 'Rock',
    votes: 128,
    image: '/images/default-album.svg'
  },
  {
    id: 4,
    title: 'Sweet Child O\' Mine',
    artist: 'Guns N\' Roses',
    album: 'Appetite for Destruction',
    year: 1987,
    genre: 'Rock',
    votes: 115,
    image: '/images/default-album.svg'
  },
  {
    id: 5,
    title: 'Nothing Else Matters',
    artist: 'Metallica',
    album: 'Metallica',
    year: 1991,
    genre: 'Metal',
    votes: 98,
    image: '/images/default-album.svg'
  }
]; 