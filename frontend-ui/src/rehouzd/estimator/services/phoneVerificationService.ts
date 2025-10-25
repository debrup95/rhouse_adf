import apiService from './apiService';

export interface PhoneVerificationRequest {
  user_id: number;
  phoneNumber: string;
  buyerName: string;
  verificationStatus: 'verified' | 'invalid';
}

export interface PhoneVerificationResponse {
  success: boolean;
  message: string;
  verification?: {
    phoneNumber: string;
    buyerName: string;
    verificationStatus: string;
    verifiedCount: number;
    invalidCount: number;
    netScore: number;
    overallStatus: 'verified' | 'invalid' | 'unverified';
  };
  error?: string;
}

export interface PhoneVerificationStats {
  phoneNumber: string;
  verifiedCount: number;
  invalidCount: number;
  netScore: number;
  verificationStatus: 'verified' | 'invalid' | 'unverified';
}

export interface VerificationStatsResponse {
  success: boolean;
  buyerName: string;
  verificationStats: PhoneVerificationStats[];
  error?: string;
}

class PhoneVerificationService {
  private baseUrl = '/api/phone-verification';

  /**
   * Verify a phone number for a buyer
   */
  async verifyPhone(request: PhoneVerificationRequest): Promise<PhoneVerificationResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/verify`, request);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to verify phone number');
    }
  }

  /**
   * Get phone verification stats for a buyer
   */
  async getPhoneVerificationStats(
    buyerName: string, 
    phoneNumbers: string[]
  ): Promise<VerificationStatsResponse> {
    try {
      const queryParams = new URLSearchParams({
        phoneNumbers: JSON.stringify(phoneNumbers)
      });
      
      const response = await apiService.get(
        `${this.baseUrl}/stats/${encodeURIComponent(buyerName)}?${queryParams}`
      );
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get phone verification stats');
    }
  }

  /**
   * Get user's verification history
   */
  async getUserVerificationHistory(userId: number, limit: number = 50): Promise<{
    success: boolean;
    history: Array<{
      phoneNumber: string;
      buyerName: string;
      verificationStatus: string;
      verificationDate: string;
      createdAt: string;
    }>;
    pagination: {
      limit: number;
      offset: number;
      count: number;
    };
  }> {
    try {
      const response = await apiService.get(`${this.baseUrl}/user-history/${userId}?limit=${limit}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get user verification history');
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phoneNumber;
  }

  /**
   * Clean phone number (remove formatting)
   */
  cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Get verification status badge color
   */
  getVerificationBadgeColor(status: string): string {
    switch (status) {
      case 'verified': return 'green';
      case 'invalid': return 'red';
      case 'unverified': 
      default: return 'gray';
    }
  }

  /**
   * Get verification status display text
   */
  getVerificationStatusText(status: string, verifiedCount: number = 0): string {
    switch (status) {
      case 'verified': 
        return verifiedCount > 1 ? `Verified by ${verifiedCount} users` : 'Verified by 1 user';
      case 'invalid': 
        return 'Marked as invalid';
      case 'unverified': 
      default: 
        return 'Not verified';
    }
  }
}

// Export singleton instance
export const phoneVerificationService = new PhoneVerificationService();
export default phoneVerificationService; 