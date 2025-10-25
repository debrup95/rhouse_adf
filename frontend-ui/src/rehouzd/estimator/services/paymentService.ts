import { loadStripe } from '@stripe/stripe-js';
import apiService from './apiService';

// Load Stripe with fallback for development
const stripePromise = (() => {
  const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    return Promise.resolve(null);
  }
  return loadStripe(key);
})();

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  credits: number;
}

export interface CreditBundle {
  credits: number;
  price: number;
  perLookup: number;
  popular?: boolean;
}

class PaymentService {
  /**
   * Create payment intent for credit purchase
   */
  async createPaymentIntent(userId: number, bundle: CreditBundle): Promise<PaymentIntent> {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        bundle
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create payment intent');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(paymentIntentId: string, userId: number): Promise<{
    success: boolean;
    creditsAdded: number;
    purchaseId: number;
  }> {
    const response = await fetch('/api/payments/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId,
        userId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to confirm payment');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get Stripe instance
   */
  async getStripe() {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to initialize - check your publishable key');
      }
      return stripe;
    } catch (error) {
      throw new Error('Payment system is not available. Please check your configuration.');
    }
  }

  /**
   * Create a checkout session for skip trace credits
   */
  async createSkipTraceCheckout(userId: number, creditBundle: { credits: number; price: number }): Promise<{
    sessionId: string;
    url: string;
  }> {
    try {
      const response = await apiService.post('/api/payments/create-skip-trace-checkout', {
        userId,
        creditBundle
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      return data.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create checkout session');
    }
  }

  /**
   * Handle successful payment and update credits
   */
  async handleSkipTraceSuccess(sessionId: string): Promise<{
    creditsAdded: number;
    newBalance: { free: number; paid: number; total: number };
  }> {
    try {
      const response = await apiService.post('/api/payments/handle-skip-trace-success', {
        sessionId
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to process payment');
      }

      return data.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to process payment');
    }
  }
}

export default new PaymentService(); 