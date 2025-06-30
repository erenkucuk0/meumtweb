import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Users, Search, Music, Guitar, Headphones } from 'lucide-react';
import { websiteAPI } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  eventType?: string;
  organizer?: {
    firstName?: string;
    lastName?: string;
  };
  image: string;
  isPublic: boolean;
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadEventsDebounced = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await websiteAPI.getEvents();
        if (isMounted && response) {
          const eventsWithDefaults = response.map((event: Event) => ({
            ...event,
            eventType: event.eventType || 'other'
          }));
          setEvents(eventsWithDefaults || []);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Events loading error:', err);
          setError(err.response?.data?.message || err.message || 'Etkinlikler yüklenirken bir hata oluştu');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    timeoutId = setTimeout(loadEventsDebounced, 300);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const eventsData = await websiteAPI.getEvents();
      if (eventsData) {
        const eventsWithDefaults = eventsData.map((event: Event) => ({
          ...event,
          eventType: event.eventType || 'other'
        }));
        setEvents(eventsWithDefaults);
      }
    } catch (err: any) {
      console.error('Events loading error:', err);
      setError(err.response?.data?.message || err.message || 'Etkinlikler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    loadEvents();
  };

  const filteredEvents = events.filter(event => {
    const searchString = searchTerm.toLowerCase();
    return (
      event.title?.toLowerCase().includes(searchString) ||
      event.description?.toLowerCase().includes(searchString) ||
      event.eventType?.toLowerCase().includes(searchString) ||
      event.location?.toLowerCase().includes(searchString)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getEventTypeIcon = (eventType: string | undefined) => {
    if (!eventType) return <Calendar className="w-5 h-5" />;
    
    switch (eventType.toLowerCase()) {
      case 'concert':
        return <Music className="w-5 h-5" />;
      case 'workshop':
        return <Guitar className="w-5 h-5" />;
      case 'seminar':
        return <Headphones className="w-5 h-5" />;
      case 'meeting':
        return <Users className="w-5 h-5" />;
      case 'other':
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventTypeLabel = (eventType: string | undefined) => {
    if (!eventType) return 'Diğer';
    
    switch (eventType.toLowerCase()) {
      case 'concert':
        return 'Konser';
      case 'workshop':
        return 'Workshop';
      case 'seminar':
        return 'Seminer';
      case 'meeting':
        return 'Toplantı';
      default:
        return 'Diğer';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse" />
          
          {/* Floating Music Notes */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/10 text-3xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 3 + 5}s`
              }}
            >
              ♫
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Calendar className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Etkinlikler
            </span>
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-white mb-4 animate-fade-in">
            Müzikal Yolculuğunuza Katılın
          </p>

          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fade-in-delay">
            Konserlerden atölyelere, seminerlerden festivallere kadar 
            müzik dünyasının her alanında sizleri bekleyen etkinlikler.
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="py-16 px-4 bg-black/20">
        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <div className="mb-12 text-center">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Etkinlik ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Calendar className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Etkinlikler Yükleniyor...
              </h3>
              <p className="text-gray-400">
                Lütfen bekleyin
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Hata Oluştu
              </h3>
              <p className="text-gray-400 mb-6">
                {error}
              </p>
              <button 
                onClick={handleRetry}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300"
              >
                Tekrar Dene
              </button>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => (
                <div
                  key={event._id}
                  className="group hover:scale-105 hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="bg-white/5 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 h-full">
                    {/* Event Image */}
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Event Type Badge */}
                      <div className="absolute top-4 left-4">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          {getEventTypeIcon(event.eventType)}
                          {getEventTypeLabel(event.eventType)}
                        </div>
                      </div>
                    </div>

                    {/* Event Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                        {event.title}
                      </h3>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="text-sm">{formatDate(event.date)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4 text-green-400" />
                          <span className="text-sm">{event.time}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                        
                        {event.organizer && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">
                              {event.organizer.firstName || 'Anonim'} {event.organizer.lastName || ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-400 text-sm line-clamp-3">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400">Etkinlik bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events; 