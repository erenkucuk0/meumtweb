import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Phone, GraduationCap, Hash, Music, Upload, FileText } from 'lucide-react';

const JoinCommunity: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    tcKimlikNo: '',
    studentNumber: '',
    phone: '',
    department: '',
    paymentReceipt: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!formData.fullName || formData.fullName.trim().length < 2) {
        setMessage({ type: 'error', text: 'Ad Soyad alanı zorunludur.' });
        return;
      }

      if (!formData.tcKimlikNo || formData.tcKimlikNo.length !== 11) {
        setMessage({ type: 'error', text: 'TC Kimlik Numarası 11 haneli olmalıdır.' });
        return;
      }

      if (!formData.phone || formData.phone.length < 10) {
        setMessage({ type: 'error', text: 'Telefon numarası gereklidir.' });
        return;
      }

      if (!formData.department.trim()) {
        setMessage({ type: 'error', text: 'Bölüm bilgisi gereklidir.' });
        return;
      }

      if (!formData.paymentReceipt) {
        setMessage({ type: 'error', text: 'Ödeme dekontu yüklenmesi zorunludur.' });
        return;
      }

      const submitFormData = new FormData();
      submitFormData.append('fullName', formData.fullName);
      submitFormData.append('tcKimlikNo', formData.tcKimlikNo);
      submitFormData.append('studentNumber', formData.studentNumber || '');
      submitFormData.append('phone', formData.phone);
      submitFormData.append('department', formData.department);
      submitFormData.append('paymentReceipt', formData.paymentReceipt);
      
      const response = await fetch('/api/community/apply', {
        method: 'POST',
        body: submitFormData
      });
      
      if (!response.ok) {
        let errorMessage = 'Başvuru gönderilirken bir hata oluştu.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server hatası: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: 'Başvurunuz alındı! Admin onayı bekleniyor. Onay sonrası Google Sheets\'e ekleneceksiniz.' 
      });
      
      setFormData({
        fullName: '',
        tcKimlikNo: '',
        studentNumber: '',
        phone: '',
        department: '',
        paymentReceipt: null
      });

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Başvuru gönderilirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if ((name === 'tcKimlikNo' || name === 'phone' || name === 'studentNumber') && !/^\d*$/.test(value)) {
      return;
    }
    
    if (name === 'tcKimlikNo' && value.length > 11) {
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Sadece JPG, PNG veya PDF dosyaları kabul edilir.' });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' });
        return;
      }
      
      setFormData({
        ...formData,
        paymentReceipt: file
      });
      if (message.text) setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-blue-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Music className="w-7 h-7 text-white" />
            </div>
            <span className="text-white font-bold text-2xl">MEÜMT</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Topluluğa Katıl!</h1>
          <p className="text-gray-300">MEÜ Müzik Topluluğu üyelik başvurusu</p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message */}
            {message.text && (
              <div className={`rounded-lg p-3 text-sm ${
                message.type === 'error' 
                  ? 'bg-red-500/20 border border-red-500/50 text-red-200' 
                  : 'bg-green-500/20 border border-green-500/50 text-green-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Ad Soyad */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-200 mb-2">
                Ad Soyad *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ad Soyadınız"
                  required
                />
              </div>
            </div>

            {/* TC Kimlik No */}
            <div>
              <label htmlFor="tcKimlikNo" className="block text-sm font-medium text-gray-200 mb-2">
                TC Kimlik Numarası *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="tcKimlikNo"
                  name="tcKimlikNo"
                  value={formData.tcKimlikNo}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="12345678901"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            {/* Öğrenci Numarası */}
            <div>
              <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-200 mb-2">
                Öğrenci Numarası
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="studentNumber"
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="Okul Numaranız"
                />
              </div>
            </div>

            {/* Telefon Numarası */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-200 mb-2">
                Telefon Numarası *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="555 123 4567"
                  required
                />
              </div>
            </div>

            {/* Bölüm */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-200 mb-2">
                Bölüm (Okuduğu Bölüm)
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  placeholder="Bilgisayar Mühendisliği"
                />
              </div>
            </div>

            {/* Ödeme Dekontu */}
            <div>
              <label htmlFor="paymentReceipt" className="block text-sm font-medium text-gray-200 mb-2">
                Ödeme Dekontu *
              </label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="file"
                  id="paymentReceipt"
                  name="paymentReceipt"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  required
                />
              </div>
              {formData.paymentReceipt && (
                <div className="mt-2 flex items-center text-sm text-green-300">
                  <FileText className="w-4 h-4 mr-2" />
                  {formData.paymentReceipt.name}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG veya PNG formatında, maksimum 5MB
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Başvuru Gönderiliyor...
                </div>
              ) : (
                'Başvuruyu Gönder'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Başvurunuz admin onayından sonra Google Sheets'e eklenecektir.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Onaylanan başvurularda ödeme türü otomatik olarak "IBAN" olarak işaretlenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinCommunity; 