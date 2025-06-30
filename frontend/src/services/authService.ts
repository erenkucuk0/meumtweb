import axios, { AxiosRequestConfig } from 'axios';
import { api } from './api';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  membershipStatus: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  errorCode?: string;
  suggestion?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  studentNumber: string;
}

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

class AuthService {
  private static instance: AuthService;
  private tokenKey = 'token';
  private userKey = 'user';
  private tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private setupTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    if (!this.isAuthenticated()) {
      return;
    }

    this.tokenRefreshInterval = setInterval(() => {
      if (this.isAuthenticated()) {
        this.validateAndRefreshToken();
      } else {
        if (this.tokenRefreshInterval) {
          clearInterval(this.tokenRefreshInterval);
          this.tokenRefreshInterval = null;
        }
      }
    }, 50 * 60 * 1000); // 50 dakika
  }

  private async validateAndRefreshToken() {
    try {
      const token = this.getToken();
      if (!token) {
        this.logout();
        return;
      }

      const response = await api.post('/auth/validate-token', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.newToken) {
        this.setToken(response.data.newToken);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.logout();
        if (window.location.pathname.includes('/admin')) {
          window.location.href = '/login';
        }
      }
    }
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  setUser(user: User) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user && user.id);
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('Login attempt for:', credentials.email);
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
        this.setupTokenRefresh();
        console.log('Login successful for:', credentials.email);
        return {
          success: true,
          message: 'Giriş başarılı',
          token: response.data.token,
          user: response.data.user
        };
      }
      
      throw new Error(response.data.message || 'Giriş başarısız');
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        const errorMessage = errorData.message || 'Giriş yapılırken bir hata oluştu';
        
        const detailedError = new Error(errorMessage) as any;
        detailedError.errorCode = errorData.errorCode;
        detailedError.suggestion = errorData.suggestion;
        detailedError.details = errorData.details;
        
        throw detailedError;
      }
      throw error;
    }
  }

  async register(data: RegisterData) {
    try {
      const response = await api.post('/auth/register', {
        ...data,
        email: data.email.toLowerCase()
      });
      
      if (response.data.success) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
        this.setupTokenRefresh();
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        const errorMessage = errorData.message || 'Kayıt olurken bir hata oluştu';
        
        const detailedError = new Error(errorMessage) as any;
        detailedError.errorCode = errorData.errorCode;
        detailedError.suggestion = errorData.suggestion;
        detailedError.details = errorData.details;
        
        throw detailedError;
      }
      throw error;
    }
  }

  logout() {
    console.log('Logging out user:', this.getUser()?.email);
    localStorage.removeItem('token');
    localStorage.removeItem(this.userKey);
    
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
    
    delete axios.defaults.headers.common['Authorization'];
    
    console.log('Logout completed');
  }

  async checkAdminStatus() {
    try {
      const response = await api.get('/auth/check-admin');
      return response.data.isAdmin;
    } catch (error) {
      console.error('Admin status check error:', error);
      return false;
    }
  }

  isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      this.logout();
      throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        this.setUser(response.data.user);
        return response.data.user;
      } else {
        throw new Error(response.data.message || 'Kullanıcı bilgileri alınamadı');
      }
    } catch (error) {
      console.error('Get current user error:', error);
      this.logout(); // On any error with fetching the user, log them out.
      throw new Error('Kullanıcı bilgileri alınamadı');
    }
  }

  async getAllUsers(page = 1, limit = 10): Promise<any> {
    try {
      const response = await api.get('/admin/users', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Kullanıcı listesi alınamadı');
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await api.post('/auth/validate-token');
      return response.data.success;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}

export default AuthService.getInstance();