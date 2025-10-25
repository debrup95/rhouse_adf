import { Router } from 'express';
import {
    getUserCredits,
    getCreditTransactionHistory,
    getPlans,
    checkActionAvailability,
    initializeUserSubscription,
    getCreditCosts
} from '../controllers/creditController';

const router = Router();

/**
 * @route GET /api/credits/plans
 * @description Get all available subscription plans
 */
router.get('/plans', getPlans);

/**
 * @route GET /api/credits/costs
 * @description Get credit costs for all actions
 */
router.get('/costs', getCreditCosts);

/**
 * @route GET /api/credits/user/:userId
 * @description Get user's current credit information
 */
router.get('/user/:userId', getUserCredits);

/**
 * @route GET /api/credits/user/:userId/history
 * @description Get user's credit transaction history
 */
router.get('/user/:userId/history', getCreditTransactionHistory);

/**
 * @route GET /api/credits/user/:userId/can-perform/:actionType
 * @description Check if user can perform a specific action
 */
router.get('/user/:userId/can-perform/:actionType', checkActionAvailability);

/**
 * @route POST /api/credits/user/:userId/initialize
 * @description Initialize subscription for a new user
 */
router.post('/user/:userId/initialize', initializeUserSubscription);

export default router; 