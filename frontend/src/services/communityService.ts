import api from './api';

export interface CommunityMemberData {
  fullName: string;
  email: string;
  tcKimlikNo: string;
  studentNumber: string;
  phoneNumber: string;
  department: string;
}

export interface CommunityMember {
  id: string;
  fullName: string;
  email: string;
  tcKimlikNo: string;
  studentNumber: string;
  phoneNumber: string;
  department: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipStats {
  overview: {
    totalMembers: number;
    pendingApplications: number;
    rejectedApplications: number;
    totalApplications: number;
  };
  departmentBreakdown: Array<{
    _id: string;
    count: number;
  }>;
  monthlyApplications: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
  sourceBreakdown: Array<{
    _id: boolean;
    count: number;
  }>;
}

export interface GoogleSheetsCredentials {
  type: 'service_account' | 'api_key';
  data: any;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    totalRows: number;
    validMembers: number;
    parseErrors: number;
    imported: number;
    updated: number;
    duplicates: number;
    importErrors: number;
  };
  details?: {
    parseErrors: string[];
    importErrors: string[];
  };
}

class CommunityService {
  async getMembers(page = 1, limit = 10) {
    try {
      const response = await api.get('/api/admin/community-members', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async applyMembership(data: CommunityMemberData): Promise<CommunityMember> {
    try {
      const response = await api.post('/api/membership/apply', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getApplication(id: string): Promise<CommunityMember> {
    try {
      const response = await api.get(`/api/membership/application/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async approveApplication(id: string): Promise<CommunityMember> {
    try {
      const response = await api.post(`/api/admin/approve-member/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async rejectApplication(id: string, reason?: string): Promise<CommunityMember> {
    try {
      const response = await api.post(`/api/admin/reject-member/${id}`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    return new Error('An error occurred while processing your request');
  }

  async getApplications(page = 1, limit = 10, status?: string): Promise<any> {
    try {
      let url = `/community/admin/applications?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvurular alınırken hata oluştu');
    }
  }

  async updateApplication(id: string, data: Partial<CommunityMember>): Promise<CommunityMember> {
    try {
      const response = await api.put(`/community/admin/applications/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvuru güncellenirken hata oluştu');
    }
  }

  async deleteApplication(id: string): Promise<void> {
    try {
      await api.delete(`/community/admin/applications/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Başvuru silinirken hata oluştu');
    }
  }

  async importFromGoogleSheets(
    spreadsheetUrl: string,
    credentials: GoogleSheetsCredentials,
    range?: string
  ): Promise<ImportResult> {
    try {
      const response = await api.post('/community/admin/import-sheets', {
        spreadsheetUrl,
        credentials,
        range
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google Sheets import edilirken hata oluştu');
    }
  }

  async getMembershipStats(): Promise<MembershipStats> {
    try {
      const response = await api.get('/community/admin/stats');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'İstatistikler alınırken hata oluştu');
    }
  }

  validateTCNumber(tcNumber: string): boolean {
    if (!tcNumber || tcNumber.length !== 11) return false;
    
    if (!/^\d{11}$/.test(tcNumber)) return false;
    
    const digits = tcNumber.split('').map(Number);
    
    if (digits[0] === 0) return false;
    
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    
    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + digits[9]) % 10;
    
    return check1 === digits[9] && check2 === digits[10];
  }

  validateStudentNumber(studentNumber: string): boolean {
    return /^\d{9,12}$/.test(studentNumber);
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    return /^(\+90|0)?[5][0-9]{9}$/.test(phoneNumber);
  }

  getDepartmentOptions(): string[] {
    return [
      'Müzik',
      'Müzik Öğretmenliği',
      'Müzik Teknolojisi',
      'Sahne Sanatları',
      'Diğer'
    ];
  }
}

export default new CommunityService(); 