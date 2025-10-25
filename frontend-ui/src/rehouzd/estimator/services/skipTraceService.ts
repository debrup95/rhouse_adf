import apiService from './apiService';
import { CreditBundle, SkipTraceResult } from '../store/skipTraceSlice';

// Skip Trace API request interfaces
export interface SkipTraceRequest {
  buyerId: string;
  buyerName: string;
  inputData: {
    address?: string;
    ownerName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  propertyAddresses?: string[]; // Array of property addresses from buyer's purchase history
}

export interface SkipTraceResponse {
  success: boolean;
  lookupId?: string;
  result?: SkipTraceResult;
  error?: string;
  creditUsed: 'free' | 'paid' | 'cached';
  remainingCredits: {
    free: number;
    paid: number;
  };
}

// Credit purchase interfaces
export interface CreditPurchaseRequest {
  bundleId: string;
  credits: number;
  amount: number;
  paymentMethodId?: string;
}

export interface CreditPurchaseResponse {
  success: boolean;
  purchaseId: string;
  credits: number;
  amount: number;
  paymentStatus: 'completed' | 'pending' | 'failed';
  stripePaymentIntentId?: string;
  error?: string;
}

// Credit balance interfaces
export interface CreditBalanceResponse {
  success: boolean;
  credits: {
    free: number;
    paid: number;
    total: number;
  };
  history: Array<{
    id: string;
    type: 'earned' | 'purchased' | 'used';
    amount: number;
    description: string;
    date: string;
  }>;
}

class SkipTraceService {
  private baseUrl = '/api/skip-trace';

  /**
   * Get user's skip trace credit balance and history
   */
  async getCreditBalance(userId: number): Promise<CreditBalanceResponse> {
    try {
      const response = await apiService.get(`${this.baseUrl}/credits/balance/${userId}`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch credit balance');
    }
  }

  /**
   * Perform skip trace lookup
   */
  async skipTrace(userId: number, request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      // Add user_id to the request body (like underwrite requests)
      const requestWithUserId = {
        user_id: userId,
        ...request
      };
      const response = await apiService.post(`${this.baseUrl}/lookup`, requestWithUserId);
      return await response.json();
    } catch (error: any) {
      // Handle specific error cases
      if (error.status === 402) {
        throw new Error('Insufficient credits');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.status === 400) {
        throw new Error('Invalid request data');
      }
      
      throw new Error('Failed to perform skip trace');
    }
  }

  /**
   * Get skip trace results history
   */
  async getSkipTraceHistory(userId: number, limit: number = 50): Promise<{
    success: boolean;
    results: SkipTraceResult[];
    pagination?: {
      limit: number;
      offset: number;
      count: number;
    };
  }> {
    try {
      const response = await apiService.get(`${this.baseUrl}/history/${userId}?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Failed to fetch skip trace history');
    }
  }

  /**
   * Get a specific skip trace result by lookup ID
   */
  async getSkipTraceResult(lookupId: string): Promise<SkipTraceResult> {
    try {
      const response = await apiService.get(`${this.baseUrl}/result/${lookupId}`);
      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error('Failed to fetch skip trace result');
    }
  }

  /**
   * Purchase skip trace credits
   */
  async purchaseCredits(request: CreditPurchaseRequest): Promise<CreditPurchaseResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/credits/purchase`, request);
      return await response.json();
    } catch (error: any) {
      // Handle specific error cases
      if (error.status === 402) {
        throw new Error('Payment failed');
      } else if (error.status === 400) {
        throw new Error('Invalid purchase request');
      }
      
      throw new Error('Failed to purchase credits');
    }
  }

  /**
   * Create Stripe payment intent for credit purchase
   */
  async createPaymentIntent(bundleId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const response = await apiService.post(`${this.baseUrl}/credits/payment-intent`, {
        bundleId
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm payment and complete credit purchase
   */
  async confirmPayment(paymentIntentId: string): Promise<CreditPurchaseResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/credits/confirm-payment`, {
        paymentIntentId
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to confirm payment');
    }
  }

  /**
   * Get available credit bundles
   */
  async getAvailableBundles(): Promise<CreditBundle[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/credits/bundles`);
      const data = await response.json();
      return data.bundles || [];
    } catch (error) {
      // Return default bundles if API fails
      return [
        { credits: 10, price: 1.50, perLookup: 0.15 },
        { credits: 25, price: 3.75, perLookup: 0.15, popular: true },
        { credits: 50, price: 7.50, perLookup: 0.15 },
        { credits: 100, price: 15.00, perLookup: 0.15 },
      ];
    }
  }

  /**
   * Validate skip trace input data
   */
  validateSkipTraceInput(inputData: SkipTraceRequest['inputData']): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // At minimum, we need either an address or owner name
    if (!inputData.address && !inputData.ownerName) {
      errors.push('Either address or owner name is required');
    }

    // Validate address format if provided
    if (inputData.address && inputData.address.trim().length < 5) {
      errors.push('Address must be at least 5 characters long');
    }

    // Validate owner name if provided
    if (inputData.ownerName && inputData.ownerName.trim().length < 2) {
      errors.push('Owner name must be at least 2 characters long');
    }

    // Validate state if provided
    if (inputData.state && inputData.state.length !== 2) {
      errors.push('State must be a 2-letter abbreviation');
    }

    // Validate zip code if provided
    if (inputData.zipCode && !/^\d{5}(-\d{4})?$/.test(inputData.zipCode)) {
      errors.push('Zip code must be in format 12345 or 12345-6789');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format skip trace input data from buyer information
   */
  formatSkipTraceInput(buyer: any): SkipTraceRequest['inputData'] {
    return {
      address: buyer.address,
      ownerName: buyer.name,
      city: this.extractCityFromAddress(buyer.address),
      state: this.extractStateFromAddress(buyer.address),
      zipCode: this.extractZipFromAddress(buyer.address),
    };
  }

  /**
   * Extract city from address string
   */
  private extractCityFromAddress(address: string): string | undefined {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return undefined;
  }

  /**
   * Extract state from address string
   */
  private extractStateFromAddress(address: string): string | undefined {
    const stateZipMatch = address.match(/\b([A-Z]{2})\s+\d{5}/);
    return stateZipMatch ? stateZipMatch[1] : undefined;
  }

  /**
   * Extract zip code from address string
   */
  private extractZipFromAddress(address: string): string | undefined {
    const zipMatch = address.match(/\b(\d{5}(-\d{4})?)\b/);
    return zipMatch ? zipMatch[1] : undefined;
  }

  /**
   * Get skip trace statistics for analytics
   */
  async getSkipTraceStats(): Promise<{
    totalLookups: number;
    successRate: number;
    avgPhoneNumbers: number;
    avgEmails: number;
    creditsUsed: number;
    creditsRemaining: number;
  }> {
    try {
      const response = await apiService.get(`${this.baseUrl}/stats`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch skip trace statistics');
    }
  }
}

// Export singleton instance
export const skipTraceService = new SkipTraceService();
export default skipTraceService; 