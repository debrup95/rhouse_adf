import express from 'express';
import { buyerMatchingController } from '../../controllers/buyerMatchingController';

const router = express.Router();

/**
 * @route GET /api/buyer-matching/all-active
 * @desc Get all active buyers
 * @access Public
 */
router.get('/all-active', buyerMatchingController.getAllActiveBuyers.bind(buyerMatchingController));

/**
 * @route POST /api/buyer-matching/ranked
 * @desc Get ranked buyers for a property
 * @access Public
 */
router.post('/ranked', buyerMatchingController.getRankedBuyersForProperty.bind(buyerMatchingController));

// Cache refresh endpoint removed - caches now auto-refresh after 12 hours

export default router; 