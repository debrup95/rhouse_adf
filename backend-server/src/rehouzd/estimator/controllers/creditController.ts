import { Request, Response } from 'express';
import {
    getUserCreditInfo,
    getCreditHistory,
    getSubscriptionPlans,
    canPerformAction,
    ensureUserSubscription,
    CREDIT_COSTS
} from '../services/credit/creditService';

/**
 * Get user's current credit information
 */
export const getUserCredits = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        
        const creditInfo = await getUserCreditInfo(userId);
        
        res.json({
            success: true,
            data: {
                availableCredits: creditInfo.availableCredits,
                usedCredits: creditInfo.usedCredits,
                planName: creditInfo.planName,
                planType: creditInfo.planType,
                subscription: {
                    subscriptionId: creditInfo.subscription.subscription_id,
                    planId: creditInfo.subscription.plan_id,
                    status: creditInfo.subscription.status,
                    billingCycleStart: creditInfo.subscription.billing_cycle_start,
                    billingCycleEnd: creditInfo.subscription.billing_cycle_end,
                    autoRenew: creditInfo.subscription.auto_renew
                }
            }
        });
        
    } catch (error) {
        console.error('Error getting user credits:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user credit information'
        });
    }
};

/**
 * Get user's credit transaction history
 */
export const getCreditTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const limit = parseInt(req.query.limit as string, 10) || 50;
        
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        
        const transactions = await getCreditHistory(userId, limit);
        
        res.json({
            success: true,
            data: transactions
        });
        
    } catch (error) {
        console.error('Error getting credit history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get credit transaction history'
        });
    }
};

/**
 * Get all available subscription plans
 */
export const getPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const plans = await getSubscriptionPlans();
        
        res.json({
            success: true,
            data: plans
        });
        
    } catch (error) {
        console.error('Error getting subscription plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get subscription plans'
        });
    }
};

/**
 * Check if user can perform a specific action
 */
export const checkActionAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const actionType = req.params.actionType as keyof typeof CREDIT_COSTS;
        
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        
        if (!CREDIT_COSTS[actionType]) {
            res.status(400).json({
                success: false,
                message: 'Invalid action type'
            });
            return;
        }
        
        const availability = await canPerformAction(userId, actionType);
        
        res.json({
            success: true,
            data: availability
        });
        
    } catch (error) {
        console.error('Error checking action availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check action availability'
        });
    }
};

/**
 * Initialize subscription for a new user
 */
export const initializeUserSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.userId, 10);
        
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        
        const subscription = await ensureUserSubscription(userId);
        
        res.json({
            success: true,
            message: 'User subscription initialized successfully',
            data: {
                subscriptionId: subscription.subscription_id,
                planId: subscription.plan_id,
                availableCredits: subscription.available_credits,
                usedCredits: subscription.used_credits,
                status: subscription.status,
                planName: subscription.plan_name,
                planType: subscription.plan_type
            }
        });
        
    } catch (error) {
        console.error('Error initializing user subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize user subscription'
        });
    }
};

/**
 * Get credit costs for all actions
 */
export const getCreditCosts = async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({
            success: true,
            data: CREDIT_COSTS
        });
    } catch (error) {
        console.error('Error getting credit costs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get credit costs'
        });
    }
}; 