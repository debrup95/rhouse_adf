import apiService from './apiService';

export interface EmailVerificationRequest {
  user_id: number;
  email: string;
  buyerName: string;
  verificationStatus: 'verified' | 'invalid';
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  verification?: {
    email: string;
    buyerName: string;
    verificationStatus: string;
    verifiedCount: number;
    invalidCount: number;
    netScore: number;
    overallStatus: 'verified' | 'invalid' | 'unverified';
  };
  error?: string;
}

export interface EmailVerificationStats {
  email: string;
  verifiedCount: number;
  invalidCount: number;
  netScore: number;
  verificationStatus: 'verified' | 'invalid' | 'unverified';
}

export interface EmailVerificationStatsResponse {
  success: boolean;
  buyerName: string;
  verificationStats: EmailVerificationStats[];
  error?: string;
}

class EmailVerificationService {
  private baseUrl = '/api/email-verification';

  /**
   * Verify an email for a buyer
   */
  async verifyEmail(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/verify`, request);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Get email verification stats for a buyer
   */
  async getEmailVerificationStats(
    buyerName: string, 
    emails: string[]
  ): Promise<EmailVerificationStatsResponse> {
    try {
      const queryParams = new URLSearchParams({
        emails: JSON.stringify(emails)
      });
      
      const response = await apiService.get(
        `${this.baseUrl}/stats/${encodeURIComponent(buyerName)}?${queryParams}`
      );
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get email verification stats');
    }
  }

  /**
   * Get user's email verification history
   */
  async getUserVerificationHistory(userId: number, limit: number = 50): Promise<{
    success: boolean;
    history: Array<{
      email: string;
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
      throw new Error('Failed to get user email verification history');
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Clean email (remove whitespace)
   */
  cleanEmail(email: string): string {
    return email.trim().toLowerCase();
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
export const emailVerificationService = new EmailVerificationService();
export default emailVerificationService;