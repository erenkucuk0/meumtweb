import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Users, FileSpreadsheet, CheckCircle, AlertCircle, Settings, Clock, FileText, UserPlus, X, Globe, Edit3, Music, Plus, Save, RefreshCw, Trash2 } from 'lucide-react';
import type { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { getImageUrl } from '../utils/imageUtils';

interface HeroSection {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  isActive: boolean;
}

const AdminSettings: React.FC = () => {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [stats] = useState({
    totalMembers: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
    totalApplications: 0
  });
  const [statsLoading] = useState(true);

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [currentSheetsUrl, setCurrentSheetsUrl] = useState('');
  const [sheetsConfigured, setSheetsConfigured] = useState(false);
  
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [showApplications, setShowApplications] = useState(false);

  const [websiteUsers, setWebsiteUsers] = useState<any[]>([]);
  const [websiteUsersLoading, setWebsiteUsersLoading] = useState(false);
  const [showWebsiteUsers, setShowWebsiteUsers] = useState(false);

  const [showWebsiteManagement, setShowWebsiteManagement] = useState(false);
  const [websiteManagementTab, setWebsiteManagementTab] = useState<'hero' | 'team' | 'events' | 'songs'>('hero');
  const [heroSections, setHeroSections] = useState<HeroSection[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [websiteManagementLoading, setWebsiteManagementLoading] = useState(false);
  
  const [showSongManagement, setShowSongManagement] = useState(false);
  const [songSuggestions, setSongSuggestions] = useState<any[]>([]);
  const [songManagementLoading, setSongManagementLoading] = useState(false);

  const [showAddMemberPanel, setShowAddMemberPanel] = useState(false);
  const [newMember, setNewMember] = useState({
    fullName: '',
    studentNumber: '',
    tcKimlikNo: '',
    phoneNumber: '',
    department: ''
  });
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'hero' | 'team' | 'event' | 'song' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  const fetchHeroSections = async () => {
    try {
      const response = await api.get('/website/hero');
      if (response.data.success) {
        setHeroSections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching hero sections:', error);
      toast.error('Hero bölümleri yüklenirken bir hata oluştu');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchHeroSections();
  }, [isAuthenticated, userRole, navigate]);

  useEffect(() => {
    if (websiteManagementTab === 'team' || websiteManagementTab === 'events') {
      loadWebsiteManagementData();
    }
  }, [websiteManagementTab]);

  useEffect(() => {
    if (showApplications) {
      loadApplications();
    }
  }, [showApplications, selectedTab]);

  useEffect(() => {
    if (showWebsiteUsers) {
      loadWebsiteUsers();
    }
  }, [showWebsiteUsers]);


  const checkSheetsConfiguration = async () => {
    try {
      const response = await api.get('/admin/sheets/config-status');
      if (response.data.isConfigured) {
        setCurrentSheetsUrl(response.data.spreadsheetUrl);
        setSheetsUrl(response.data.spreadsheetUrl);
      }
      setSheetsConfigured(response.data.isConfigured);
    } catch (error) {
      console.error('Error checking Sheets config:', error);
      toast.error('Google E-Tablolar yapılandırması kontrol edilirken hata oluştu.');
    }
  };

  useEffect(() => {
    checkSheetsConfiguration();
  }, [isAuthenticated, userRole, navigate]);

  const handleSheetsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/sheets/configure', {
        spreadsheetUrl: sheetsUrl
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        checkSheetsConfiguration(); // Re-check config status
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Bir hata oluştu.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSheetsTest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/sheets/test');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      } else {
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Test sırasında bir hata oluştu.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSheetsRemove = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.delete('/admin/sheets/remove-config');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        setSheetsUrl('');
        setCurrentSheetsUrl('');
        setSheetsConfigured(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Yapılandırma kaldırılırken bir hata oluştu.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSheets = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/sheets/sync');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Senkronizasyon sırasında bir hata oluştu.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setApplicationsLoading(true);
    try {
      const response = await api.get(`/admin/members/applications?status=${selectedTab}`);
      if (response.data.success) {
        setApplications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadWebsiteUsers = async () => {
    setWebsiteUsersLoading(true);
    try {
      const response = await api.get('/admin/users');
      setWebsiteUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching website users:', error);
    } finally {
      setWebsiteUsersLoading(false);
    }
  };

  const handleApplicationAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      let response;
      if (action === 'approve') {
        response = await api.post(`/admin/members/applications/${id}/approve`);
      } else if (action === 'reject') {
        response = await api.post(`/admin/members/applications/${id}/reject`);
      } else {
        response = await api.delete(`/admin/members/applications/${id}`);
      }
      
      if (response.data.success) {
        toast.success(`Başvuru başarıyla ${action === 'approve' ? 'onaylandı' : (action === 'reject' ? 'reddedildi' : 'silindi')}.`);
        loadApplications();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberLoading(true);
    try {
      const response = await api.post('/admin/members/manual-add', newMember);
      if (response.data.success) {
        toast.success('Üye başarıyla eklendi.');
        setShowAddMemberPanel(false);
        setNewMember({
          fullName: '',
          studentNumber: '',
          tcKimlikNo: '',
          phoneNumber: '',
          department: ''
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Üye eklenirken bir hata oluştu.');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const loadWebsiteManagementData = async () => {
    setWebsiteManagementLoading(true);
    try {
      let response;
      switch (websiteManagementTab) {
        case 'hero':
          response = await api.get('/website/hero');
          setHeroSections(response.data.data);
          break;
        case 'team':
          response = await api.get('/website/team');
          setTeamMembers(response.data.data);
          break;
        case 'events':
          response = await api.get('/events');
          setEvents(response.data.data);
          break;
        case 'songs':
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${websiteManagementTab} data:`, error);
      toast.error('İçerik yüklenirken bir hata oluştu.');
    } finally {
      setWebsiteManagementLoading(false);
    }
  };
  
  const loadSongSuggestions = async () => {
    setSongManagementLoading(true);
    try {
      const response = await api.get('/admin/songs/suggestions');
      if (response.data.success) {
        setSongSuggestions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching song suggestions:', error);
      toast.error('Şarkı önerileri yüklenirken bir hata oluştu');
    } finally {
      setSongManagementLoading(false);
    }
  };

  const handleSongAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const response = await api.post(`/admin/songs/suggestions/${id}/${action}`);
      if (response.data.success) {
        toast.success(`Şarkı önerisi başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`);
        loadSongSuggestions();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`"${userName}" kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        toast.success('Kullanıcı başarıyla silindi.');
        loadWebsiteUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kullanıcı silinirken bir hata oluştu.');
    }
  };

  const openModal = (type: 'hero' | 'team' | 'event' | 'song', item?: any) => {
    setModalType(type);
    setEditingItem(item);
    setSelectedFile(null);
    
    if (item) {
      setFormData({ ...item });
    } else {
      if (type === 'hero') {
        setFormData({
          title: '',
          subtitle: '',
          description: '',
          isActive: true,
          order: 0
        });
      } else if (type === 'team') {
        setFormData({
          name: '',
          title: '',
          description: '',
          socialLinks: {},
          isActive: true,
          order: 0
        });
      } else if (type === 'event') {
        setFormData({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          organizer: '',
          eventType: 'other',
          isPublic: true
        });
      } else if (type === 'song') {
        setFormData({
          songTitle: '',
          artistName: '',
          albumName: '',
          status: 'pending',
          suggestedBy: null,
          userNote: '',
          displayInfo: null
        });
      }
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modalType) return;
    
    const dataToSend = { ...formData };

    if (modalType === 'event') {
      if (!dataToSend.title || !dataToSend.description || !dataToSend.date || !dataToSend.time || !dataToSend.location) {
        toast.error('Lütfen tüm zorunlu alanları doldurun.');
        setLoading(false);
        return;
      }
      if (!dataToSend.eventType) {
        dataToSend.eventType = 'other';
      }
    }

    if (modalType === 'hero') {
      dataToSend.isActive = true;
    }
    if (modalType === 'event') {
      dataToSend.isPublic = true;
      dataToSend.status = 'published';
    }

    const payload = new FormData();
    Object.keys(dataToSend).forEach((key) => {
      if (dataToSend[key] !== undefined && dataToSend[key] !== null) {
        payload.append(key, dataToSend[key]);
      }
    });

    if (selectedFile) {
      const fieldName = modalType === 'event' ? 'image' : 'photo';
      payload.append(fieldName, selectedFile);
    }

    setLoading(true);
    setMessage(null);

    try {
      let response;
      const url = editingItem
        ? `/admin/website/${modalType === 'event' ? 'events' : modalType}/${editingItem._id}`
        : `/admin/website/${modalType === 'event' ? 'events' : modalType}`;

      if (editingItem) {
        response = await api.put(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        response = await api.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      if (response.data.success) {
        toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} başarıyla ${editingItem ? 'güncellendi' : 'eklendi'}`);
        closeModal();
        loadWebsiteManagementData(); // Veriyi yeniden yükle
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'hero' | 'team' | 'event' | 'song', id: string) => {
    if (window.confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) {
      try {
        const endpointType = type === 'event' ? 'events' : type;
        const response = await api.delete(`/admin/website/${endpointType}/${id}`);
        if (response.data.success) {
          toast.success('Öğe başarıyla silindi.');
          loadWebsiteManagementData();
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Silme işlemi sırasında bir hata oluştu.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Admin Ayarları</h1>
          </div>
          <p className="text-gray-300">Topluluk yönetimi ve üye listesi ayarları</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Member List Upload */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Upload className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Google Sheets Senkronizasyonu</h2>
            </div>

            <form onSubmit={handleSheetsSubmit} className="space-y-6">
              {/* Message */}
              {message && (
                <div className={`rounded-lg p-4 text-sm flex items-center space-x-2 ${
                  message.type === 'error' 
                    ? 'bg-red-500/20 border border-red-500/50 text-red-200' 
                    : 'bg-green-500/20 border border-green-500/50 text-green-200'
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Current Sheets Configuration */}
              {sheetsConfigured && (
                <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-400" />
                      <h3 className="text-green-200 font-semibold">Mevcut Google Sheets</h3>
                    </div>
                    <button
                      onClick={handleSheetsRemove}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Google Sheets konfigürasyonunu kaldır"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-green-200 text-sm break-all">
                    {currentSheetsUrl}
                  </p>
                  <button
                    onClick={handleSyncSheets}
                    disabled={loading}
                    className="mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Senkronize Et</span>
                  </button>
                </div>
              )}

              {/* Sheets URL Input */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                  <h4 className="text-gray-400 font-semibold">Google Sheets URL</h4>
                </div>
                <input
                  type="text"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="w-full bg-gray-800 text-white p-2 rounded-md mb-2"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <p className="text-sm text-gray-400">
                  Google Sheets dokümanınızın URL'sini girin. Örnek format: https://docs.google.com/spreadsheets/d/ABC123...
                </p>
              </div>

              {/* Sheets Configuration Buttons */}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Kaydediliyor...' : 'Google Sheets Ayarlarını Kaydet'}
                </button>
                
                {/* Test Button */}
                <button
                  type="button"
                  onClick={handleSheetsTest}
                  disabled={loading || !sheetsConfigured}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors mt-2"
                >
                  Google Sheets Bağlantısını Test Et
                </button>
              </div>
            </form>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <h3 className="text-green-200 font-semibold mb-2">Senkronizasyon Bilgisi:</h3>
              <ul className="text-green-200 text-sm space-y-1 list-disc list-inside">
                <li>Google Sheets otomatik olarak yapılandırılmıştır</li>
                <li>Sistem düzenli aralıklarla kendini güncellemektedir</li>
                <li>Manuel senkronizasyon için butonu kullanabilirsiniz</li>
                <li>Senkronizasyon sonrası istatistikler otomatik güncellenir</li>
              </ul>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">İstatistikler</h2>
            </div>

            <div className="space-y-4">
              {/* Pending Applications */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Bekleyen Başvurular</span>
                  <span className="text-2xl font-bold text-yellow-400">
                    {statsLoading ? '...' : stats.pendingApplications}
                  </span>
                </div>
              </div>

              {/* Total Applications */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Toplam Bekleyen Başvuru</span>
                                      <span className="text-2xl font-bold text-blue-400">
                      {statsLoading ? '...' : stats.pendingApplications}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3">Hızlı İşlemler</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setShowApplications(!showApplications)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>Başvuruları Görüntüle</span>
                  <Clock className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowAddMemberPanel(!showAddMemberPanel)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>Manuel Üye Ekle</span>
                  <UserPlus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowWebsiteUsers(!showWebsiteUsers)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>İnternet Sitesi Üyelerini Görüntüle</span>
                  <Users className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowWebsiteManagement(!showWebsiteManagement)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>İnternet Sayfası Yönetimi</span>
                  <Globe className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowSongManagement(!showSongManagement)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors text-left flex items-center justify-between"
                >
                  <span>Şarkı Paneli Düzenle</span>
                  <Music className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Member Addition Panel */}
        {showAddMemberPanel && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <UserPlus className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Manuel Üye Ekleme</h2>
              </div>
              <button 
                onClick={() => setShowAddMemberPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={newMember.fullName}
                    onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Öğrenci Numarası *
                  </label>
                  <input
                    type="text"
                    value={newMember.studentNumber}
                    onChange={(e) => setNewMember({...newMember, studentNumber: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Örn: 20001115"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    T.C. Kimlik No *
                  </label>
                  <input
                    type="text"
                    value={newMember.tcKimlikNo}
                    onChange={(e) => setNewMember({...newMember, tcKimlikNo: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="11 haneli T.C. numarası"
                    maxLength={11}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Telefon Numarası *
                  </label>
                  <input
                    type="tel"
                    value={newMember.phoneNumber}
                    onChange={(e) => setNewMember({...newMember, phoneNumber: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Örn: 05551234567"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Bölüm *
                  </label>
                  <input
                    type="text"
                    value={newMember.department}
                    onChange={(e) => setNewMember({...newMember, department: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Örn: Müzik Öğretmenliği"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMemberPanel(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {addMemberLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Ekleniyor...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Üye Ekle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Applications Section */}
        {showApplications && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-orange-400" />
                <h2 className="text-xl font-semibold text-white">Üyelik Başvuruları</h2>
              </div>
              <button 
                onClick={() => setShowApplications(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-700 rounded-lg p-1">
              {[
                { key: 'PENDING', label: 'Bekleyen', icon: Clock, color: 'yellow' },
                { key: 'APPROVED', label: 'Onaylanan', icon: CheckCircle, color: 'green' },
                { key: 'REJECTED', label: 'Reddedilen', icon: AlertCircle, color: 'red' }
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTab(key as any);
                    window.requestAnimationFrame(() => {
                      window.scrollTo({ top: window.scrollY, behavior: 'auto' });
                    });
                  }}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                    selectedTab === key 
                      ? `bg-${color}-600 text-white` 
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {applicationsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Başvurular yükleniyor...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Bu kategoride başvuru bulunmuyor.</p>
                </div>
              ) : (
                applications.map((application) => (
                  <div key={application._id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400">Ad Soyad</p>
                            <p className="text-white font-medium">{application.fullName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Bölüm</p>
                            <p className="text-white">{application.department}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Öğrenci No</p>
                            <p className="text-white">{application.studentNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">E-posta</p>
                            <p className="text-white">{application.email || 'Belirtilmemiş'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Telefon</p>
                            <p className="text-white">{application.phone || application.phoneNumber || 'Belirtilmemiş'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">TC Kimlik No</p>
                            <p className="text-white">{application.tcKimlikNo || 'Belirtilmemiş'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Başvuru Tarihi</p>
                            <p className="text-white">{new Date(application.createdAt).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Google Sheets'te</p>
                            <p className={`text-sm font-medium ${application.isInGoogleSheets ? 'text-green-400' : 'text-red-400'}`}>
                              {application.isInGoogleSheets ? 'Mevcut' : 'Bulunamadı'}
                            </p>
                          </div>
                        </div>

                        {application.adminNotes && (
                          <div className="mt-3 p-3 bg-gray-600 rounded-lg">
                            <p className="text-sm text-gray-400">Admin Notları</p>
                            <p className="text-white text-sm">{application.adminNotes}</p>
                          </div>
                        )}

                        {application.paymentReceipt && (
                          <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                            <p className="text-sm text-blue-400">Ödeme Dekontu</p>
                            <p className="text-blue-200 text-sm">{application.paymentReceipt.originalName}</p>
                          </div>
                        )}

                        {application.additionalInfo?.motivation && (
                          <div className="mt-3 p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                            <p className="text-sm text-purple-400">Motivasyon</p>
                            <p className="text-purple-200 text-sm">{application.additionalInfo.motivation}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {selectedTab === 'PENDING' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApplicationAction(application._id, 'approve')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                          >
                            <span>Onayla</span>
                          </button>
                          <button
                            onClick={() => handleApplicationAction(application._id, 'reject')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                          >
                            <span>Reddet</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Delete Button for Approved and Rejected */}
                      {(selectedTab === 'APPROVED' || selectedTab === 'REJECTED') && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApplicationAction(application._id, 'delete')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Sil</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Website Users Section */}
        {showWebsiteUsers && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">İnternet Sitesi Üyeleri</h2>
              </div>
              <button 
                onClick={() => setShowWebsiteUsers(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {websiteUsersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Kullanıcılar yükleniyor...</p>
                </div>
              ) : !websiteUsers || websiteUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Henüz kayıtlı kullanıcı bulunmuyor.</p>
                </div>
              ) : (
                websiteUsers.map((user) => (
                  <div key={user._id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Ad Soyad</p>
                          <p className="text-white font-medium">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.fullName || 'Belirtilmemiş'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">E-posta</p>
                          <p className="text-white">{user.email || 'Belirtilmemiş'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Kullanıcı Adı</p>
                          <p className="text-white">{user.username || 'Belirtilmemiş'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Öğrenci No</p>
                          <p className="text-white">{user.studentNumber || 'Belirtilmemiş'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">TC Kimlik No</p>
                          <p className="text-white">{user.tcKimlikNo || 'Belirtilmemiş'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Rol</p>
                          <p className={`text-sm font-medium ${
                            user.role === 'admin' ? 'text-red-400' : 
                            user.role === 'member' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 
                             user.role === 'member' ? 'Üye' : 
                             user.role || 'Kullanıcı'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-400">Kayıt Tarihi</p>
                          <p className="text-white">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                      
                      {/* Delete Button - Only show for non-admin users */}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(
                            user._id, 
                            user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.fullName || user.email || 'Kullanıcı'
                          )}
                          className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Kullanıcıyı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Community Member Connection */}
                    {user.communityMember && (
                      <div className="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <p className="text-sm text-green-400">Topluluk Üyesi</p>
                        <p className="text-green-200 text-sm">
                          {user.communityMember.fullName} - {user.communityMember.status}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Users Summary */}
            {!websiteUsersLoading && websiteUsers && websiteUsers.length > 0 && (
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Özet</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <p className="text-gray-400">Toplam Kullanıcı</p>
                     <p className="text-white font-medium">{websiteUsers.length}</p>
                   </div>
                   <div>
                     <p className="text-gray-400">Admin Sayısı</p>
                     <p className="text-red-400 font-medium">
                       {websiteUsers.filter(u => u.role === 'admin').length}
                     </p>
                   </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Website Management Panel */}
        {showWebsiteManagement && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">İnternet Sayfası Yönetimi</h2>
              </div>
              <button 
                onClick={() => setShowWebsiteManagement(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setWebsiteManagementTab('hero')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  websiteManagementTab === 'hero'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Hero Bölümü
              </button>
              <button
                onClick={() => setWebsiteManagementTab('team')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  websiteManagementTab === 'team'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Ekibimiz
              </button>
              <button
                onClick={() => setWebsiteManagementTab('events')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  websiteManagementTab === 'events'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Etkinlikler
              </button>
              <button
                onClick={() => setWebsiteManagementTab('songs')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  websiteManagementTab === 'songs'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Şarkı Önerileri
              </button>
            </div>

            {/* Loading State */}
            {websiteManagementLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}

            {/* Tab Content */}
            {!websiteManagementLoading && (
              <div className="mt-6">
                {websiteManagementTab === 'hero' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Hero Bölümleri</h3>
                      <button 
                        onClick={() => openModal('hero')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Ekle</span>
                      </button>
                    </div>
                    
                    {/* Hero Section List */}
                    <div className="space-y-4">
                      {heroSections && heroSections.map((hero) => (
                        <div key={hero._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0 w-32 h-16 mr-4">
                                {hero.backgroundImage && (
                                  <img
                                    className="w-full h-full object-cover rounded-md"
                                    src={getImageUrl(hero.backgroundImage, 'hero')}
                                    alt={hero.title}
                                  />
                                )}
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{hero.title}</h4>
                                <p className="text-gray-300 text-sm mt-1">{hero.subtitle}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openModal('hero', hero)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete('hero', hero._id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {websiteManagementTab === 'team' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Ekip Üyeleri</h3>
                      <button 
                        onClick={() => openModal('team')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Üye Ekle</span>
                      </button>
                    </div>
                    
                    {/* Team Members List */}
                    <div className="space-y-4">
                      {teamMembers && teamMembers.map((member) => (
                        <div key={member._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0 w-16 h-16 mr-4">
                                {member.photo && (
                                  <img
                                    className="w-full h-full object-cover rounded-full"
                                    src={getImageUrl(member.photo, 'team')}
                                    alt={member.name}
                                  />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white">{member.name}</p>
                                <p className="text-gray-300 text-sm">{member.title}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openModal('team', member)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete('team', member._id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {websiteManagementTab === 'events' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Etkinlikler</h3>
                      <button 
                        onClick={() => openModal('event')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Etkinlik</span>
                      </button>
                    </div>
                    
                    {/* Events List */}
                    <div className="space-y-4">
                      {events && events.map((event) => (
                        <div key={event._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-12 bg-gray-600 rounded overflow-hidden">
                                {event.image && (
                                  <img
                                    src={`/uploads/events/${event.image}`}
                                    alt={event.title}
                                    className="w-16 h-12 object-cover"
                                  />
                                )}
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{event.title}</h4>
                                <p className="text-gray-300 text-sm mt-1">
                                  {new Date(event.date).toLocaleDateString('tr-TR')} {event.time}
                                </p>
                                <p className="text-gray-400 text-xs">{event.location}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openModal('event', event)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete('event', event._id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {websiteManagementTab === 'songs' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">Şarkı Önerileri</h3>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openModal('song')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Şarkı Ekle</span>
                        </button>
                        <button 
                          onClick={loadSongSuggestions}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Yenile</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Song Suggestions List */}
                    <div className="space-y-4">
                      {songSuggestions && songSuggestions.map((song) => (
                        <div key={song._id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-16 bg-gray-600 rounded overflow-hidden">
                                {song.coverImage && (
                                  <img
                                    src={`/uploads/songs/${song.coverImage}`}
                                    alt={song.songTitle}
                                    className="w-16 h-16 object-cover"
                                  />
                                )}
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{song.songTitle}</h4>
                                <p className="text-gray-300 text-sm">{song.artistName}</p>
                                <p className="text-gray-400 text-xs">{song.albumName}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    song.status === 'approved' ? 'bg-green-600 text-white' :
                                    song.status === 'rejected' ? 'bg-red-600 text-white' :
                                    'bg-yellow-600 text-white'
                                  }`}>
                                    {song.status === 'approved' ? 'Onaylandı' :
                                     song.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                                  </span>
                                  {song.suggestedBy && (
                                    <span className="text-gray-400 text-xs">
                                      @{song.suggestedBy.username}
                                    </span>
                                  )}
                                </div>
                                {song.userNote && (
                                  <p className="text-gray-300 text-sm mt-2 bg-gray-600 p-2 rounded">
                                    {song.userNote}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {song.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleSongAction(song._id, 'approve')}
                                    className="text-green-400 hover:text-green-300"
                                    title="Onayla"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleSongAction(song._id, 'reject')}
                                    className="text-red-400 hover:text-red-300"
                                    title="Reddet"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => openModal('song', song)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Düzenle"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete('song', song._id)}
                                className="text-red-400 hover:text-red-300"
                                title="Sil"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {songSuggestions.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          Henüz şarkı önerisi bulunmuyor
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Song Management Panel */}
        {showSongManagement && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">Şarkı Paneli Düzenleme</h2>
              </div>
              <button 
                onClick={() => setShowSongManagement(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Loading State */}
            {songManagementLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}

            {/* Song Suggestions List */}
            {!songManagementLoading && (
              <div className="space-y-4">
                {songSuggestions && songSuggestions.map((song) => (
                  <div key={song._id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-medium">{song.songTitle}</h4>
                        <p className="text-gray-300 text-sm mt-1">{song.artistName} - {song.albumName}</p>
                        <p className="text-gray-400 text-xs mt-1">Öneren: @{song.suggestedBy?.username}</p>
                        {song.userNote && (
                          <p className="text-gray-300 text-sm mt-2 bg-gray-600 p-2 rounded">
                            {song.userNote}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleSongAction(song._id, 'approve')}
                          className="text-green-400 hover:text-green-300"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleSongAction(song._id, 'reject')}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {songSuggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Henüz şarkı önerisi bulunmuyor
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && modalType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    {editingItem ? 'Düzenle' : 'Yeni Ekle'} - {
                      modalType === 'hero' ? 'Hero Bölümü' :
                      modalType === 'team' ? 'Ekip Üyesi' :
                      modalType === 'event' ? 'Etkinlik' :
                      'Şarkı'
                    }
                  </h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Common Fields */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      {modalType === 'hero' ? 'Başlık' : 
                       modalType === 'team' ? 'İsim' : 
                       modalType === 'event' ? 'Etkinlik Adı' :
                       'Şarkı Adı'}
                    </label>
                    <input
                      type="text"
                      name={modalType === 'hero' ? 'title' : 
                            modalType === 'team' ? 'name' : 
                            modalType === 'event' ? 'title' :
                            'songTitle'}
                      value={formData[modalType === 'hero' ? 'title' : 
                                     modalType === 'team' ? 'name' : 
                                     modalType === 'event' ? 'title' :
                                     'songTitle'] || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  {modalType === 'hero' && (
                    <>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Alt Başlık</label>
                        <input
                          type="text"
                          name="subtitle"
                          value={formData.subtitle || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                    </>
                  )}

                  {modalType === 'team' && (
                    <>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Ünvan</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Instagram</label>
                          <input
                            type="url"
                            value={formData.socialLinks?.instagram || ''}
                            onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">LinkedIn</label>
                          <input
                            type="url"
                            value={formData.socialLinks?.linkedin || ''}
                            onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'event' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Tarih</label>
                          <input
                            type="date"
                            name="date"
                            value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Saat</label>
                          <input
                            type="time"
                            name="time"
                            value={formData.time || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Konum</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Etkinlik Türü</label>
                        <select
                          name="eventType"
                          value={formData.eventType || 'other'}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="workshop">Workshop</option>
                          <option value="concert">Konser</option>
                          <option value="seminar">Seminer</option>
                          <option value="meeting">Toplantı</option>
                          <option value="other">Diğer</option>
                        </select>
                      </div>
                    </>
                  )}

                  {modalType === 'song' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Sanatçı</label>
                          <input
                            type="text"
                            name="artistName"
                            value={formData.artistName || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Albüm</label>
                          <input
                            type="text"
                            name="albumName"
                            value={formData.albumName || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Spotify URL</label>
                          <input
                            type="url"
                            name="spotifyUrl"
                            value={formData.spotifyUrl || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">YouTube URL</label>
                          <input
                            type="url"
                            name="youtubeUrl"
                            value={formData.youtubeUrl || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Durum</label>
                        <select
                          name="status"
                          value={formData.status || 'approved'}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="approved">Onaylandı</option>
                          <option value="rejected">Reddedildi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Admin Notu</label>
                        <textarea
                          name="reviewNote"
                          value={formData.reviewNote || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Admin değerlendirme notu..."
                        />
                      </div>
                    </>
                  )}

                  {/* Description Field */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      {modalType === 'hero' ? 'Arkaplan Resmi' : modalType === 'team' ? 'Fotoğraf' : 'Etkinlik Resmi'}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="fileInput"
                      />
                      <label
                        htmlFor="fileInput"
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Dosya Seç</span>
                      </label>
                      {selectedFile && (
                        <span className="text-green-400 text-sm">{selectedFile.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Active Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive || false}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <label className="text-white text-sm">Aktif</label>
                  </div>

                  {modalType === 'event' && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={formData.isPublic || false}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-white text-sm">Herkese Açık</label>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingItem ? 'Güncelle' : 'Kaydet'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings; 