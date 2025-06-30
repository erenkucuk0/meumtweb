import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    Calendar, 
    MapPin, 
    Clock, 
    Music, 
    X, 
    Send, 
    Mail, 
    Phone,
    Users,
    Guitar,
    Headphones,
    Instagram
  } from 'lucide-react';
import { websiteAPI } from '../services/api';
import { mockSongSuggestions } from '../mock-api';
import { getImageUrl } from '../utils/imageUtils';

interface HeroSection {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  isActive: boolean;
  order: number;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  eventType: string;
  organizer: {
    firstName: string;
    lastName: string;
  };
  image: string;
  isPublic: boolean;
}

const Home = () => {
  const [hoveredSong, setHoveredSong] = useState<number | null>(null);
  const [isScrollPaused, setIsScrollPaused] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  
  const [showSongModal, setShowSongModal] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [heroSections, setHeroSections] = useState<HeroSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [heroData, eventsData] = await Promise.all([
        websiteAPI.getHeroSections(),
        websiteAPI.getEvents()
      ]);
      
      setHeroSections(heroData || []);
      const events = Array.isArray(eventsData) ? eventsData : [];
      setUpcomingEvents(events.slice(0, 3)); // En yakın 3 etkinlik
    } catch (error: any) {
      console.error('Data refetch error:', error);
      setError(error.message || 'Veriler tekrar yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true' && !!token;
    setIsLoggedIn(loggedIn);
    
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const [heroData, eventsData] = await Promise.all([
          websiteAPI.getHeroSections(),
          websiteAPI.getEvents()
        ]);
        
        if (isMounted) {
          setHeroSections(heroData || []);
          const events = Array.isArray(eventsData) ? eventsData : [];
          setUpcomingEvents(events.slice(0, 3)); // En yakın 3 etkinlik
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('Data fetch error:', error);
          setError(error.message || 'Veriler yüklenirken bir hata oluştu');
          setHeroSections([]);
          setUpcomingEvents([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    timeoutId = setTimeout(fetchData, 300);
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (heroSections.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSections.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [heroSections.length]);

  useEffect(() => {
    if (!isScrollPaused) {
      let animationId: number;
      let lastTime = 0;
      
      const animate = (currentTime: number) => {
        if (currentTime - lastTime >= 16) { // ~60 FPS
          setScrollPosition(prev => {
            const newPos = prev - 0.03; // Çok küçük adımlar
            return newPos <= -50 ? 0 : newPos;
          });
          lastTime = currentTime;
        }
        animationId = requestAnimationFrame(animate);
      };
      
      animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [isScrollPaused]);

  const handleSongSuggestion = () => {
    if (!isLoggedIn) {
      alert('Şarkı önermek için giriş yapmalısınız');
      return;
    }
    setShowSongModal(true);
  };

  const submitSongSuggestion = async () => {
    if (!songUrl.trim()) {
      alert('Şarkı bağlantısı gereklidir');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/songs/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          songUrl: songUrl.trim(),
          songTitle: songTitle.trim(),
          artistName: artistName.trim(),
          albumName: albumName.trim(),
          userNote: userNote.trim()
        })
      });

      if (response.ok) {
        alert('Şarkı öneriniz başarıyla gönderildi! Admin onayından sonra yayınlanacaktır.');
        closeSongModal();
      } else {
        const data = await response.json();
        alert(data.message || 'Şarkı önerisi gönderilemedi');
      }
    } catch (error) {
      console.error('Şarkı önerisi hatası:', error);
      alert('Şarkı önerisi gönderilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSongModal = () => {
    setShowSongModal(false);
    setSongUrl('');
    setSongTitle('');
    setArtistName('');
    setAlbumName('');
    setUserNote('');
  };

  const songSuggestions = mockSongSuggestions;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative h-screen">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400">Hero bölümleri yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={refetchData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 flex items-center justify-center mx-auto"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tekrar Dene
              </button>
            </div>
          </div>
        ) : heroSections.length > 0 ? (
          <>
            {/* Hero Slider */}
            <div className="relative h-full">
              {heroSections.map((slide, index) => (
                <div
                  key={slide._id}
                  className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
                  style={{
                    backgroundImage: `url(${getImageUrl(slide.backgroundImage, 'hero')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: index === currentSlide ? 1 : 0,
                  }}
                >
                  <div className="absolute inset-0 bg-black/60"></div>
                  
                  {/* Hero Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white max-w-4xl mx-auto px-6">
                      <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
                        {slide.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-blue-300 mb-8 animate-fade-in-up animation-delay-200">
                        {slide.subtitle}
                      </p>
                      <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Slider Navigation */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {heroSections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentSlide ? 'bg-blue-500' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-400">Henüz hero bölümü eklenmemiş</p>
            </div>
          </div>
        )}
      </div>

      {/* Üyelerin Önerileri */}
      <section className="py-20 bg-gray-900 overflow-hidden">
        <div className="w-full px-0">
          {/* Başlık */}
          <div className="text-center mb-12 px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Üyelerin Önerileri
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Topluluk üyelerimizin önerdiği şarkılar
            </p>
          </div>

          {/* Müzik Önerileri Şeridi */}
          <div 
            className="relative overflow-hidden bg-gray-800/50 backdrop-blur-sm p-6 pb-28"
          >
            
            <div className="relative">
              <div 
                className="flex gap-6"
                style={{
                  width: 'calc(200% + 24px)',
                  transform: `translateX(${scrollPosition}%)`,
                  transition: isScrollPaused ? 'transform 0.5s ease-out' : 'none',
                  willChange: 'transform'
                }}
                onMouseEnter={() => setIsScrollPaused(true)}
                onMouseLeave={() => setIsScrollPaused(false)}
              >
                {/* Şarkıları iki kez render et (sonsuz döngü için) */}
                {[...songSuggestions, ...songSuggestions].map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    className="flex-shrink-0 w-72 bg-gray-800 p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer group shadow-xl"
                    onMouseEnter={() => setHoveredSong(song.id)}
                    onMouseLeave={() => setHoveredSong(null)}
                  >
                    <div className="relative w-full h-64 mb-6 overflow-hidden bg-gray-800 shadow-2xl vinyl-container">
                      {/* Albüm Kapağı - hover'da sola kayar */}
                      <div className={`absolute inset-0 transition-all duration-500 ease-in-out z-20 ${
                        hoveredSong === song.id ? 'transform -translate-x-2/3' : 'transform translate-x-0'
                      }`}>
                        <img 
                          src={song.image} 
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/default-album.svg';
                          }}
                        />
                      </div>

                      {/* Dönen Plak - gerçekçi tasarım */}
                      <div className="absolute inset-0 flex items-center justify-center z-10 transition-all duration-500 ease-in-out opacity-100">
                        <div className="relative">
                          {/* Ana plak - Gerçek plak görünümü */}
                          <div 
                            className="w-60 h-60 rounded-full flex items-center justify-center shadow-2xl vinyl-record-realistic vinyl-rotation-smooth relative overflow-hidden"
                          >
                            {/* Plak yüzeyi - Gerçek vinil doku */}
                            <div className="w-60 h-60 rounded-full flex items-center justify-center relative overflow-hidden">
                              
                              {/* Konsantrik çemberler - Gerçek plak çizgileri */}
                              {[58, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20].map((size, index) => (
                                <div 
                                  key={index}
                                  className="vinyl-groove"
                                  style={{
                                    width: `${size * 0.25}rem`,
                                    height: `${size * 0.25}rem`,
                                    borderColor: index % 3 === 0 ? 'rgba(112,112,112,0.12)' : 'rgba(80,80,80,0.18)',
                                    borderWidth: index % 4 === 0 ? '0.7px' : '0.3px',
                                    opacity: 0.15 - (index * 0.003)
                                  }}
                                />
                              ))}
                              
                              {/* Plak etiket alanı */}
                              <div className="w-32 h-32 rounded-full flex items-center justify-center relative z-20 vinyl-label">
                                
                                {/* Merkez delik çevresi */}
                                <div className="w-28 h-28 rounded-full flex items-center justify-center relative">
                                  
                                  {/* Albüm kapağı - Parlak cam efekti */}
                                  <div className="w-24 h-24 rounded-full overflow-hidden relative z-30 shadow-2xl border border-gray-700 album-cover-glass">
                                    <img 
                                      src={song.image} 
                                      alt={song.title}
                                      className="w-full h-full object-cover rounded-full"
                                      style={{ 
                                        filter: 'brightness(1.4) contrast(1.3) saturate(1.2)',
                                      }}
                                    />
                                    
                                    {/* Oynatma butonu */}
                                    <div className="absolute inset-0 flex items-center justify-center z-40">
                                      <button 
                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group play-button-enhanced"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('Oynatılacak şarkı:', song.title);
                                        }}
                                      >
                                        <svg className="w-5 h-5 text-gray-800 ml-0.5 group-hover:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Merkez delik */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full center-hole" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Plak kenar efekti */}
                              <div className="vinyl-edge-glow" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Şarkı bilgileri - yumuşak kayma */}
                    <div className="mb-4">
                      <div className="overflow-hidden mb-2">
                        <h3 
                          className={`font-bold text-white text-xl whitespace-nowrap transition-transform duration-3000 ease-in-out ${
                            hoveredSong === song.id && song.title.length > 25 ? 'animate-marquee-smooth' : ''
                          }`}
                        >
                          {song.title}
                        </h3>
                      </div>
                      <div className="text-blue-400 text-base flex items-center">
                        <Music className="w-5 h-5 mr-2 flex-shrink-0" />
                        <div className="overflow-hidden flex-1">
                          <span 
                            className={`whitespace-nowrap transition-transform duration-3000 ease-in-out ${
                              hoveredSong === song.id && song.artist.length > 20 ? 'animate-marquee-smooth-artist' : ''
                            }`}
                          >
                            Öneren: {song.artist}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Şarkı Ekle Butonu - Sağ Alt */}
            <div className="absolute bottom-4 right-4 z-50">
              <button 
                onClick={handleSongSuggestion}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Music className="w-5 h-5" />
                Şarkı Öner
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Yaklaşan Etkinlikler */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Yaklaşan Etkinlikler
            </h2>
            <p className="text-gray-400 text-lg">
              Müzikal yolculuğunuza eşlik edecek en yakın etkinlikler
            </p>
          </div>

          {error ? (
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={refetchData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Tekrar Dene
              </button>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300"
                >
                  <div className="relative overflow-hidden h-48">
                    <img 
                      src={getImageUrl(event.image, 'events')}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/default-event.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3">
                      {event.title}
                    </h3>

                    <div className="space-y-2 text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-blue-400" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-400" />
                        <span>
                          {typeof event.organizer === 'object' 
                            ? `${event.organizer.firstName} ${event.organizer.lastName}` 
                            : event.organizer}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/events"
                      className="mt-6 inline-block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                    >
                      Detayları Gör
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400">Yaklaşan etkinlik bulunmuyor</p>
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/events"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105"
              >
                Tüm Etkinlikleri Gör
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Şarkı Önerisi Modal */}
      {showSongModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Şarkı Öner</h3>
                <button
                  onClick={closeSongModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Şarkı Bağlantısı <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={songUrl}
                    onChange={(e) => setSongUrl(e.target.value)}
                    placeholder="Spotify, YouTube, SoundCloud bağlantısı..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Desteklenen platformlar: Spotify, YouTube, SoundCloud, Apple Music
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Şarkı Adı
                  </label>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Şarkı adını girin..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Sanatçı Adı
                  </label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Sanatçı adını girin..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Albüm Adı
                  </label>
                  <input
                    type="text"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="Albüm adını girin..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Notunuz
                  </label>
                  <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Bu şarkıyı neden öneriyorsunuz?"
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={submitSongSuggestion}
                  disabled={!songUrl.trim() || isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gönder
                    </>
                  )}
                </button>
                <button
                  onClick={closeSongModal}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300"
                >
                  İptal
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-400 text-center">
                Öneriniz admin onayından sonra ana sayfada görüntülenecektir.
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Home; 