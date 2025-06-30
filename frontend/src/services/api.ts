import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { CONFIG } from '../config';
import { toast } from 'react-toastify';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface TokenResponse {
  token: string;
}

class ApiService {
  private instance: AxiosInstance;
  private retryDelay = 1000;
  private maxRetries = 3;

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: CONFIG.apiTimeout,
      withCredentials: true
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config: CustomAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (CONFIG.DEBUG) {
          console.log('API Request:', config.method?.toUpperCase(), config.url);
          if (config.data) {
            console.log('Request Data:', config.data);
          }
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        if (CONFIG.DEBUG) {
          console.error('Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response) => {
        if (CONFIG.DEBUG) {
          console.log('API Response:', response.status, response.data);
        }
        return response;
      },
      async (error: AxiosError) => {
        if (CONFIG.DEBUG) {
          console.error('Response Error:', error);
        }

        const originalRequest = error.config as CustomAxiosRequestConfig;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data = {}, config = {}): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data = {}, config = {}): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  private handleError(error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data as { error: string };
        const message = data.error || 'Bir hata oluştu';
        toast.error(message);
      } else if (error.request) {
        toast.error('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.');
      } else {
        toast.error('Beklenmeyen bir hata oluştu.');
      }
    }
  }
}

export const api = new ApiService();

export const websiteAPI = {
  async getHeroSections() {
    try {
      const response = await api.get('/website/hero');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching hero sections:', error);
      throw error;
    }
  },

  async getEvents() {
    try {
      const response = await api.get('/events');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  async getTeamMembers() {
    try {
      const response = await api.get('/website/team');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  },

  getWebsiteSettings: async () => {
    try {
      const response = await api.get('/website/settings');
      if (!response.data.success) {
        throw new Error(response.data.message || 'Website ayarları getirilemedi');
      }
      return response.data.data || null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          console.error('Website settings endpoint not found');
          throw new Error('Website ayarları bulunamadı');
        }
        if (axiosError.code === 'ECONNABORTED') {
          console.error('Website settings request timeout');
          throw new Error('Website ayarları yüklenirken zaman aşımı oluştu');
        }
        if (axiosError.code === 'ERR_NETWORK') {
          console.error('Network error while fetching website settings');
          throw new Error('Ağ hatası: Sunucuya bağlanılamadı');
        }
      }
      console.error('Website settings fetch error:', error);
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    try {
      const response = await api.post(url, data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'İşlem başarısız');
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          console.error('Endpoint not found:', url);
          throw new Error('İstek yapılan endpoint bulunamadı');
        }
        if (axiosError.code === 'ECONNABORTED') {
          console.error('Request timeout:', url);
          throw new Error('İstek zaman aşımına uğradı');
        }
        if (axiosError.code === 'ERR_NETWORK') {
          console.error('Network error:', url);
          throw new Error('Ağ hatası: Sunucuya bağlanılamadı');
        }
      }
      console.error('API post error:', error);
      throw error;
    }
  }
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const usersAPI = {
  getAll: async (params: any = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const communityAPI = {
  submitApplication: async (data: any) => {
    const response = await api.post('/community', data);
    return response.data;
  },

  getApplications: async (params: any = {}) => {
    const response = await api.get('/community/applications', { params });
    return response.data;
  },

  updateApplication: async (id: string, data: any) => {
    const response = await api.put(`/community/applications/${id}`, data);
    return response.data;
  },

  deleteApplication: async (id: string) => {
    const response = await api.delete(`/community/applications/${id}`);
    return response.data;
  }
};

export default api; 