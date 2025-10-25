import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getCreditBundles,
  createSkipTraceCheckout,
  handleSkipTraceSuccess
} from '../controllers/paymentController';

const router = Router();

/**
 * @route POST /api/payments/create-intent
 * @description Create a Stripe payment intent for credit purchase
 */
router.post('/create-intent', createPaymentIntent);

/**
 * @route POST /api/payments/confirm
 * @description Confirm payment and add credits to user account
 */
router.post('/confirm', confirmPayment);

/**
 * @route GET /api/payments/bundles
 * @description Get available credit bundles
 */
router.get('/bundles', getCreditBundles);

/**
 * @route POST /api/payments/create-skip-trace-checkout
 * @description Create a Stripe checkout session for skip trace credits
 */
router.post('/create-skip-trace-checkout', createSkipTraceCheckout);

/**
 * @route POST /api/payments/handle-skip-trace-success
 * @description Handle successful skip trace payment and update user credits
 */
router.post('/handle-skip-trace-success', handleSkipTraceSuccess);

export default router; 