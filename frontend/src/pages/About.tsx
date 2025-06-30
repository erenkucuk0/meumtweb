import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Music, Heart, Target, Lightbulb, Award, Users, Calendar, MapPin, Mail, Phone } from 'lucide-react';
import { websiteAPI } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';

interface TeamMember {
  _id: string;
  name: string;
  title: string;
  photo: string;
  socialLinks?: {
    github?: string;
    email?: string;
  };
}

const About: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const teamData = await websiteAPI.getTeamMembers();
      setTeamMembers(teamData || []);
    } catch (err: any) {
      console.error('Team loading error:', err);
      setError(err.response?.data?.message || err.message || 'Ekip üyeleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Ekip Üyeleri Yükleniyor...
          </h3>
          <p className="text-gray-400">
            Lütfen bekleyin
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Hata Oluştu
          </h3>
          <p className="text-gray-400 mb-6">
            {error}
          </p>
          <button 
            onClick={loadTeamMembers}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const values = [
    {
      icon: Heart,
      title: "Tutku",
      description: "Müziğe olan sonsuz sevgimiz ve tutkumuz bizi bir araya getiriyor.",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Birliktelik",
      description: "Farklı enstrümanlardan gelen sesler, güçlü bir uyum oluşturuyor.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "Hedef Odaklılık",
      description: "Müzikal mükemmelliğe ulaşmak için sürekli çalışıyor ve gelişiyoruz.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Lightbulb,
      title: "Yaratıcılık",
      description: "Özgün müzikler yaratarak sanatsal sınırları zorluyoruz.",
      color: "from-purple-500 to-violet-500"
    }
  ];

  const achievements = [
    { number: "150+", label: "Aktif Üye", icon: Users },
    { number: "50+", label: "Konser", icon: Music },
    { number: "25+", label: "Ödül", icon: Award },
    { number: "5", label: "Yıllık Deneyim", icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse" />
          
          {/* Floating Music Notes */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/10 text-4xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${10 + Math.random() * 10}s`
              }}
            >
              ♪
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Music className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              MEÜMT
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-gray-300 mb-8 font-light leading-relaxed animate-slide-up-delay">
            Mersin Üniversitesi Müzik Topluluğu
          </p>

          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fade-in-delay">
            Müziğin evrensel dilini konuşan, yaratıcılığı ve tutkuyu bir araya getiren 
            dinamik bir topluluk. 2019'dan beri müzik severleri buluşturuyor, 
            sanatsal sınırları zorluyoruz.
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Hikayemiz
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white mb-6">
                Müziğin Gücüne İnanıyoruz
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                2019 yılında Mersin Üniversitesi'nde müzik tutkusu olan öğrencilerin 
                bir araya gelmesiyle kurulan topluluğumuz, bugün 150'den fazla aktif 
                üyeye sahip dinamik bir aile haline geldi.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Farklı müzik türlerinden gelen sesler, ortak bir vizyonla buluşarak 
                benzersiz bir uyum yaratıyor. Rock'tan caz'a, klasikten pop'a kadar 
                geniş bir yelpazede müzik yapıyoruz.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Amacımız sadece müzik yapmak değil, aynı zamanda müziğin birleştirici 
                gücüyle toplumsal farkındalık yaratmak ve kültürel zenginliğe katkıda bulunmak.
              </p>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Müzik Topluluğu"
                  className="w-full h-96 object-cover hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              
              {/* Floating Stats */}
              <div className="absolute -top-6 -right-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:scale-105 transition-transform duration-300">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">5+</div>
                  <div className="text-sm text-gray-300">Yıllık Deneyim</div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:scale-105 transition-transform duration-300">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">150+</div>
                  <div className="text-sm text-gray-300">Aktif Üye</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-24 px-4 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Değerlerimiz
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Bizi bir arada tutan ve ilham veren temel değerlerimiz
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="group hover:scale-105 hover:-translate-y-2 transition-all duration-300"
              >
                <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 h-full hover:border-white/20 transition-all duration-300">
                  <div className={`w-16 h-16 bg-gradient-to-r ${value.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                    {value.title}
                  </h3>
                  
                  <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Başarılarımız
            </h2>
            <p className="text-xl text-gray-300">
              Birlikte elde ettiğimiz gurur verici sonuçlar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="text-center group hover:scale-105 hover:-translate-y-2 transition-all duration-300"
              >
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <achievement.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="text-4xl md:text-5xl font-black text-white mb-2 hover:scale-110 transition-transform duration-300">
                    {achievement.number}
                  </div>
                  
                  <div className="text-lg text-gray-300 font-medium">
                    {achievement.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Ekibimiz
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Topluluğumuzu yöneten deneyimli ve tutkulu müzisyenler
            </p>
          </div>

          {teamMembers && teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <div 
                  key={member._id}
                  className="text-center bg-gray-800/50 p-6 rounded-2xl shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms`, animation: 'fade-in 0.5s ease-out forwards' }}
                >
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <img
                      src={getImageUrl(member.photo, 'team')}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover border-4 border-gray-700"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white">{member.name}</h3>
                  <p className="text-cyan-400">{member.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Henüz Ekip Üyesi Eklenmemiş
              </h3>
              <p className="text-gray-400">
                Ekip üyeleri yakında eklenecek.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Bize Katıl
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Müzik tutkunu musun? Bizimle birlikte bu büyülü yolculuğa çık!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Adres</h3>
              <p className="text-gray-300">Mersin Üniversitesi<br />Çiftlikköy Kampüsü</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <Mail className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">E-posta</h3>
              <p className="text-gray-300">info@meumusik.com</p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <Phone className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Telefon</h3>
              <p className="text-gray-300">+90 324 XXX XX XX</p>
            </div>
          </div>

          <div>
            <Link to="/join-community" className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-2xl text-lg font-semibold shadow-2xl hover:scale-105 transition-all duration-300">
              Aramıza Katıl
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 