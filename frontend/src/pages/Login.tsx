import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Music, AlertCircle, Info } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<{
    message: string;
    errorCode?: string;
    suggestion?: string;
    details?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      setError({
        message: error.message || 'Giriş yapılırken bir hata oluştu',
        errorCode: error.errorCode,
        suggestion: error.suggestion,
        details: error.details
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = (errorCode?: string) => {
    switch (errorCode) {
      case 'MISSING_CREDENTIALS':
      case 'INVALID_EMAIL_FORMAT':
        return <Info className="w-5 h-5" />;
      case 'USER_NOT_FOUND':
      case 'INVALID_PASSWORD':
      case 'ACCOUNT_SUSPENDED':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getErrorColor = (errorCode?: string) => {
    switch (errorCode) {
      case 'MISSING_CREDENTIALS':
      case 'INVALID_EMAIL_FORMAT':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200';
      case 'USER_NOT_FOUND':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-200';
      case 'INVALID_PASSWORD':
      case 'ACCOUNT_SUSPENDED':
        return 'bg-red-500/20 border-red-500/50 text-red-200';
      default:
        return 'bg-red-500/20 border-red-500/50 text-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Music className="w-7 h-7 text-white" />
            </div>
            <span className="text-white font-bold text-2xl">MEÜMT</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Siteye Giriş</h1>
          <p className="text-gray-300">Yönetim paneline erişim için giriş yapın</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className={`${getErrorColor(error.errorCode)} border rounded-lg p-4 text-sm space-y-2`}>
                <div className="flex items-start space-x-2">
                  {getErrorIcon(error.errorCode)}
                  <div className="flex-1">
                    <p className="font-medium">{error.message}</p>
                    {error.suggestion && (
                      <p className="mt-1 text-xs opacity-80">
                        💡 {error.suggestion}
                      </p>
                    )}
                    {error.details && (
                      <div className="mt-2 text-xs opacity-70">
                        {error.details.email && <p>• {error.details.email}</p>}
                        {error.details.password && <p>• {error.details.password}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                    error?.errorCode === 'INVALID_EMAIL_FORMAT' || error?.details?.email ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : ''
                  }`}
                  placeholder="ornek@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                    error?.errorCode === 'INVALID_PASSWORD' || error?.details?.password ? 'border-red-500/50 ring-1 ring-red-500/20' : ''
                  }`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Beni hatırla</span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          {/* Site Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Siteye kayıt olmak mı istiyorsunuz?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 