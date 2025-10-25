import Stripe from 'stripe';
import { query } from '../../config/db';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

// Initialize Stripe with fallback for development
const stripe = (() => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('Stripe secret key not found. Payment features will be disabled.');
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  });
})();

export interface CreditBundle {
  credits: number;
  price: number;
  perLookup: number;
  popular?: boolean;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  credits: number;
}

class StripeService {
  /**
   * Create a payment intent for credit purchase
   */
  async createPaymentIntent(
    userId: number,
    bundle: CreditBundle
  ): Promise<PaymentIntent> {
    try {
      if (!stripe) {
        throw new AppError('Payment system is not configured', 503);
      }

      const amountInCents = Math.round(bundle.price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          userId: userId.toString(),
          credits: bundle.credits.toString(),
          bundleType: `${bundle.credits}_credits`,
        },
      });

      logger.info('Payment intent created', {
        userId,
        bundleCredits: bundle.credits,
        amount: bundle.price,
        paymentIntentId: paymentIntent.id,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: bundle.price,
        credits: bundle.credits,
      };
    } catch (error: any) {
      logger.error('Error creating payment intent', { 
        userId, 
        bundle, 
        error: error.message 
      });
      throw new AppError('Failed to create payment', 500);
    }
  }

  /**
   * Confirm payment and add credits to user account
   */
  async confirmPayment(
    paymentIntentId: string,
    userId: number
  ): Promise<{
    success: boolean;
    creditsAdded: number;
    purchaseId: number;
  }> {
    try {
      if (!stripe) {
        throw new AppError('Payment system is not configured', 503);
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new AppError('Payment not completed', 400);
      }

      const credits = parseInt(paymentIntent.metadata.credits || '0');
      const amountPaidCents = paymentIntent.amount;

      // Record purchase in database
      const purchaseResult = await query(`
        INSERT INTO skip_trace_purchases (
          user_id,
          credits_purchased,
          amount_paid_cents,
          payment_provider,
          payment_intent_id,
          payment_status,
          bundle_type,
          unit_price_cents,
          currency,
          payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING purchase_id
      `, [
        userId,
        credits,
        amountPaidCents,
        'stripe',
        paymentIntentId,
        'completed',
        `${credits}_credits`,
        Math.round(amountPaidCents / credits),
        'USD',
        paymentIntent.payment_method_types[0] || 'card'
      ]);

      const purchaseId = purchaseResult.rows[0].purchase_id;

      // Add credits to user account
      const addCreditsResult = await query(`
        SELECT * FROM add_skip_trace_credits($1, $2, $3)
      `, [userId, credits, purchaseId]);

      const creditsResult = addCreditsResult.rows[0];

      if (!creditsResult.success) {
        throw new AppError('Failed to add credits to account', 500);
      }

      logger.info('Payment confirmed and credits added', {
        userId,
        paymentIntentId,
        creditsAdded: credits,
        purchaseId,
        newBalance: creditsResult.new_total_balance
      });

      return {
        success: true,
        creditsAdded: credits,
        purchaseId
      };

    } catch (error: any) {
      logger.error('Error confirming payment', { 
        paymentIntentId, 
        userId, 
        error: error.message 
      });
      throw new AppError('Failed to confirm payment', 500);
    }
  }

  /**
   * Get available credit bundles
   */
  getCreditBundles(): CreditBundle[] {
    return [
      { credits: 10, price: 1.50, perLookup: 0.15 },
      { credits: 25, price: 3.75, perLookup: 0.15, popular: true },
      { credits: 50, price: 7.50, perLookup: 0.15 },
      { credits: 100, price: 15.00, perLookup: 0.15 },
    ];
  }

  /**
   * Create a checkout session for skip trace credit purchase
   */
  async createSkipTraceCheckoutSession(userId: number, creditBundle: { credits: number; price: number }): Promise<{
    sessionId: string;
    url: string;
  }> {
    try {
      if (!stripe) {
        throw new AppError('Payment system is not configured', 503);
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Skip Trace Credits - ${creditBundle.credits} Credits`,
              description: `${creditBundle.credits} skip trace lookups at $0.15 each`,
            },
            unit_amount: Math.round(creditBundle.price * 100), // Convert to cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
        metadata: {
          userId: userId.toString(),
          credits: creditBundle.credits.toString(),
          purpose: 'skip_trace_credits',
        },
        customer_email: undefined, // Let user enter email
        billing_address_collection: 'required',
      });

      logger.info('Stripe checkout session created', {
        sessionId: session.id,
        userId,
        credits: creditBundle.credits,
        amount: creditBundle.price
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error: any) {
      logger.error('Error creating checkout session', { 
        userId, 
        creditBundle, 
        error: error.message 
      });
      throw new AppError('Failed to create payment session', 500);
    }
  }

  /**
   * Retrieve a checkout session from Stripe
   */
  async retrieveCheckoutSession(sessionId: string): Promise<any> {
    try {
      if (!stripe) {
        throw new AppError('Payment system is not configured', 503);
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      logger.info('Retrieved checkout session', {
        sessionId,
        paymentStatus: session.payment_status,
        metadata: session.metadata
      });

      return session;
    } catch (error: any) {
      logger.error('Error retrieving checkout session', { 
        sessionId, 
        error: error.message 
      });
      throw new AppError('Failed to retrieve payment session', 500);
    }
  }

  /**
   * Add skip trace credits to user account
   */
  async addSkipTraceCredits(userId: number, credits: number, sessionId: string): Promise<{
    free: number;
    paid: number;
    total: number;
  }> {
    try {
      // First check if this session has already been processed
      const existingPurchase = await query(`
        SELECT purchase_id, user_id, credits_purchased 
        FROM skip_trace_purchases 
        WHERE stripe_session_id = $1
      `, [sessionId]);

      if (existingPurchase.rows.length > 0) {
        const purchase = existingPurchase.rows[0];
        
        // Verify it's for the same user (ensure both are numbers for comparison)
        if (parseInt(purchase.user_id.toString()) !== parseInt(userId.toString())) {
          throw new AppError('Session belongs to different user', 400);
        }
        
        logger.info('Session already processed, returning existing credits', {
          sessionId,
          userId,
          existingCredits: purchase.credits_purchased
        });
        
        // Return current user credits
        const currentCredits = await query(`
          SELECT free_credits_remaining, paid_credits_remaining
          FROM skip_trace_credits
          WHERE user_id = $1
        `, [userId]);
        
        if (currentCredits.rows.length === 0) {
          throw new Error('User credit record not found');
        }
        
        const credits = currentCredits.rows[0];
        return {
          free: credits.free_credits_remaining || 0,
          paid: credits.paid_credits_remaining || 0,
          total: (credits.free_credits_remaining || 0) + (credits.paid_credits_remaining || 0)
        };
      }

      // Record the purchase first (this will fail if duplicate due to unique constraint)
      await query(`
        INSERT INTO skip_trace_purchases (
          user_id,
          credits_purchased,
          amount_paid_cents,
          payment_method,
          stripe_session_id,
          payment_status,
          purchase_date
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        userId,
        credits,
        credits * 15, // $0.15 per credit in cents
        'stripe_checkout',
        sessionId,
        'completed'
      ]);

      // Update user's paid credits in the database
      const result = await query(`
        INSERT INTO skip_trace_credits (user_id, paid_credits_remaining, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
          paid_credits_remaining = skip_trace_credits.paid_credits_remaining + $2,
          updated_at = NOW()
        RETURNING free_credits_remaining, paid_credits_remaining
      `, [userId, credits]);

      if (result.rows.length === 0) {
        throw new Error('Failed to update user credits');
      }

      const updatedCredits = result.rows[0];

      logger.info('Skip trace credits added successfully', {
        userId,
        creditsAdded: credits,
        newBalance: {
          free: updatedCredits.free_credits_remaining,
          paid: updatedCredits.paid_credits_remaining,
          total: updatedCredits.free_credits_remaining + updatedCredits.paid_credits_remaining
        },
        sessionId
      });

      return {
        free: updatedCredits.free_credits_remaining || 0,
        paid: updatedCredits.paid_credits_remaining || 0,
        total: (updatedCredits.free_credits_remaining || 0) + (updatedCredits.paid_credits_remaining || 0)
      };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint === 'unique_stripe_session_id') {
        logger.warn('Duplicate session ID detected, checking existing purchase', {
          sessionId,
          userId,
          credits
        });
        
        // Return current credits without error
        const currentCredits = await query(`
          SELECT free_credits_remaining, paid_credits_remaining
          FROM skip_trace_credits
          WHERE user_id = $1
        `, [userId]);
        
        if (currentCredits.rows.length > 0) {
          const credits = currentCredits.rows[0];
          return {
            free: credits.free_credits_remaining || 0,
            paid: credits.paid_credits_remaining || 0,
            total: (credits.free_credits_remaining || 0) + (credits.paid_credits_remaining || 0)
          };
        }
      }
      
      logger.error('Error adding skip trace credits', { 
        userId, 
        credits, 
        sessionId, 
        error: error.message 
      });
      throw new AppError('Failed to add credits to user account', 500);
    }
  }
}

export default new StripeService(); 