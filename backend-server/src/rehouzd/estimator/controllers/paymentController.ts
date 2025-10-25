import { Request, Response } from 'express';
import stripeService from '../services/payment/stripeService';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Create a Stripe payment intent for credit purchase
 * POST /api/payments/create-intent
 */
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, bundle } = req.body;

    if (!userId || !bundle) {
      res.status(400).json({
        success: false,
        message: 'User ID and credit bundle are required'
      });
      return;
    }

    logger.info('Creating payment intent', { userId, bundle });

    const paymentIntent = await stripeService.createPaymentIntent(userId, bundle);

    res.status(200).json({
      success: true,
      data: paymentIntent
    });

  } catch (error: any) {
    logger.error('Error creating payment intent', { error: error.message });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent'
      });
    }
  }
};

/**
 * Confirm payment and add credits to user account
 * POST /api/payments/confirm
 */
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, userId } = req.body;

    if (!paymentIntentId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Payment intent ID and user ID are required'
      });
      return;
    }

    logger.info('Confirming payment', { paymentIntentId, userId });

    const result = await stripeService.confirmPayment(paymentIntentId, userId);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Error confirming payment', { error: error.message });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment'
      });
    }
  }
};

/**
 * Get available credit bundles
 * GET /api/payments/bundles
 */
export const getCreditBundles = async (req: Request, res: Response): Promise<void> => {
  try {
    const bundles = stripeService.getCreditBundles();

    res.status(200).json({
      success: true,
      data: bundles
    });

  } catch (error: any) {
    logger.error('Error getting credit bundles', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get credit bundles'
    });
  }
}; 

/**
 * Create a Stripe checkout session for skip trace credits
 * POST /api/payments/create-skip-trace-checkout
 */
export const createSkipTraceCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, creditBundle } = req.body;

    if (!userId || !creditBundle) {
      res.status(400).json({
        success: false,
        message: 'User ID and credit bundle are required'
      });
      return;
    }

    // Validate credit bundle structure
    if (!creditBundle.credits || !creditBundle.price) {
      res.status(400).json({
        success: false,
        message: 'Invalid credit bundle format'
      });
      return;
    }

    logger.info('Creating skip trace checkout session', { userId, creditBundle });

    const checkoutSession = await stripeService.createSkipTraceCheckoutSession(userId, creditBundle);

    res.status(200).json({
      success: true,
      data: {
        sessionId: checkoutSession.sessionId,
        url: checkoutSession.url
      }
    });

  } catch (error: any) {
    logger.error('Error creating skip trace checkout', { error: error.message });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create checkout session'
      });
    }
  }
};

/**
 * Handle successful payment and update user credits
 * POST /api/payments/handle-skip-trace-success
 */
export const handleSkipTraceSuccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
      return;
    }

    // Retrieve the session from Stripe to verify payment
    const session = await stripeService.retrieveCheckoutSession(sessionId);
    
    if (session.payment_status !== 'paid') {
      res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
      return;
    }

    // Extract metadata
    const userId = parseInt(session.metadata?.userId || '0');
    const credits = parseInt(session.metadata?.credits || '0');

    if (!userId || !credits) {
      res.status(400).json({
        success: false,
        message: 'Invalid session metadata'
      });
      return;
    }

    // Update user credits
    const updatedCredits = await stripeService.addSkipTraceCredits(userId, credits, session.id);

    res.status(200).json({
      success: true,
      data: {
        creditsAdded: credits,
        newBalance: updatedCredits
      }
    });

  } catch (error: any) {
    logger.error('Error handling skip trace success', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Failed to process payment success'
    });
  }
}; 