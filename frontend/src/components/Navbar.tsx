import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Music, Radio, BookOpen, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, userRole, username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo ve Menu - Sol tarafta hizalı */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold text-xl">MEÜMT</span>
            </Link>

            {/* Desktop Menu - Logoya yakın */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                Ana Sayfa
              </Link>
              <Link to="/events" className="text-gray-300 hover:text-white transition-colors">
                Etkinlikler
              </Link>
              <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                Hakkımızda
              </Link>
              <Link to="/forum" className="text-gray-300 hover:text-white transition-colors">
                Forum
              </Link>
            </div>
          </div>

          {/* Social Media & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Radio and Magazine Icons */}
            <div className="flex items-center space-x-3">
              {/* Radio Icon */}
              <a
                href="https://radyo.mersin.edu.tr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-all duration-300 transform hover:scale-110"
                title="MEÜ Radyo"
              >
                <Radio className="w-5 h-5" />
              </a>

              {/* Magazine Icon */}
              <button
                className="text-gray-400 hover:text-purple-400 transition-all duration-300 transform hover:scale-110"
                title="Dergi (Yakında)"
                onClick={() => {
                  console.log('Dergi linki henüz ayarlanmadı');
                }}
              >
                <BookOpen className="w-5 h-5" />
              </button>

              {/* Social Media Icons */}
              <div className="w-px h-6 bg-gray-600 mx-2"></div>
              
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>

            {/* Auth Buttons / Admin Panel */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  {/* Logged in user */}
                  <span className="text-gray-300 text-sm">Hoş geldin, {username}</span>
                  {userRole === 'admin' && (
                    <Link 
                      to="/admin/settings" 
                      className="text-gray-300 hover:text-white transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-1"
                      title="Ayarlar"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden lg:inline">Ayarlar</span>
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-red-400 transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-1"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Çıkış</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Normal Auth Buttons */}
                  <Link 
                    to="/login" 
                    className="text-gray-300 hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-gray-600"
                  >
                    Siteye Giriş Yap
                  </Link>
                  <Link 
                    to="/join-community" 
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                  >
                    Topluluğa Üye Ol
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 rounded-lg mt-2">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Ana Sayfa
              </Link>
              <Link
                to="/events"
                className="block px-3 py-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Etkinlikler
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Hakkımızda
              </Link>
              <Link
                to="/forum"
                className="block px-3 py-2 text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Forum
              </Link>
              
              <div className="border-t border-gray-700 pt-3 mt-3">
                {isAuthenticated ? (
                  <>
                    {/* Mobile User Panel */}
                    <div className="px-3 py-2 text-gray-300 text-sm">
                      Hoş geldin, {username}
                    </div>
                    {userRole === 'admin' && (
                      <Link
                        to="/admin/settings"
                        className="block px-3 py-2 text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
                        onClick={() => setIsOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Ayarlar</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-300 hover:text-red-400 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-3 py-2 text-gray-300 hover:text-white transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Siteye Giriş Yap
                    </Link>
                    <Link
                      to="/join-community"
                      className="block px-3 py-2 text-green-500 hover:text-green-400 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Topluluğa Üye Ol
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 