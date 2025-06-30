import api from './api';

export interface MembershipApplicationData {
  fullName: string;
  email?: string;
  studentNumber: string;
  department: string;
  phoneNumber?: string;
  paymentAmount: number;
  paymentReceipt?: File;
  additionalInfo?: {
    instruments?: string[];
    musicalExperience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    motivation?: string;
  };
}

export interface MembershipApplication {
  _id: string;
  fullName: string;
  email?: string;
  studentNumber: string;
  department: string;
  phoneNumber?: string;
  paymentAmount: number;
  paymentReceipt?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
  };
  isInGoogleSheets: boolean;
  googleSheetsRowIndex?: number;
  googleSheetsVerificationDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  createdUser?: any;
  additionalInfo?: {
    instruments?: string[];
    musicalExperience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    motivation?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GoogleSheetsConfig {
  serviceAccountEmail: string;
  privateKey: string;
  projectId: string;
  spreadsheetUrl: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  data?: {
    totalMembers: number;
    syncTime: Date;
    dbSync: any;
    fromCache: boolean;
  };
}

class MembershipService {
  private static instance: MembershipService;
  private lastSyncTime: Date | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.checkConfiguration();
  }

  public static getInstance(): MembershipService {
    if (!MembershipService.instance) {
      MembershipService.instance = new MembershipService();
    }
    return MembershipService.instance;
  }

  private async checkConfiguration(): Promise<void> {
    try {
      const response = await api.get('/api/admin/sheets/config');
      this.isConfigured = response.data.configured && response.data.isActive;
    } catch (error) {
      console.warn('Google Sheets configuration check failed:', error);
      this.isConfigured = false;
    }
  }

  async setupGoogleSheets(config: GoogleSheetsConfig): Promise<any> {
    try {
      const response = await api.post('/api/admin/sheets/setup', config);
      if (response.data.success) {
        this.isConfigured = true;
      }
      return response.data;
    } catch (error: any) {
      console.error('Setup error:', error);
      throw new Error(error.response?.data?.message || 'Google Sheets yapılandırması başarısız');
    }
  }

  async syncGoogleSheets(): Promise<SyncResponse> {
    try {
      if (!this.isConfigured) {
        await this.checkConfiguration();
      }

      const response = await api.post('/api/admin/sheets/sync');
      
      if (response.data.success) {
        this.lastSyncTime = new Date();
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Sync error:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Google Sheets senkronizasyonu başarısız'
      );
    }
  }

  async checkEligibility(studentNumber: string): Promise<any> {
    try {
      const response = await api.post('/membership/check-eligibility', { studentNumber });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Uygunluk kontrolü yapılırken hata oluştu');
    }
  }

  async submitApplication(data: MembershipApplicationData): Promise<MembershipApplication> {
    try {
      const formData = new FormData();
      
      formData.append('fullName', data.fullName);
      if (data.email) formData.append('email', data.email);
      formData.append('studentNumber', data.studentNumber);
      formData.append('department', data.department);
      if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
      formData.append('paymentAmount', data.paymentAmount.toString());
      
      if (data.paymentReceipt) {
        formData.append('paymentReceipt', data.paymentReceipt);
      }
      
      if (data.additionalInfo) {
        formData.append('additionalInfo', JSON.stringify(data.additionalInfo));
      }

      const response = await api.post('/membership/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvuru gönderilirken hata oluştu');
    }
  }

  async getApplications(page = 1, limit = 10, status?: string): Promise<any> {
    try {
      let url = `/website-membership/admin/applications?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvurular alınırken hata oluştu');
    }
  }

  async getApplication(id: string): Promise<MembershipApplication> {
    try {
      const response = await api.get(`/website-membership/status/${id}`);
      return response.data.application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvuru alınırken hata oluştu');
    }
  }

  async reviewApplication(id: string, status: 'APPROVED' | 'REJECTED', reason?: string): Promise<MembershipApplication> {
    try {
      const response = await api.put(`/website-membership/admin/applications/${id}`, {
        status,
        reason
      });
      return response.data.application;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvuru değerlendirilirken hata oluştu');
    }
  }
}

export default MembershipService.getInstance(); 