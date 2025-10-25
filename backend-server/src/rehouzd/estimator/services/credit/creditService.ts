import { 
    getUserSubscription, 
    createUserSubscription, 
    updateUserCredits, 
    hasUserCredits,
    getUserCreditHistory,
    getActivePlans,
    UserSubscription,
    CreditTransaction,
    SubscriptionPlan
} from '../../models/subscription/subscriptionModel';

// Define credit costs for different actions
export const CREDIT_COSTS = {
    UNDERWRITE_REQUEST: 1,
    OFFER_REQUEST: 1,
    OFFER_MATCHING: 1, // Future use
    PROPERTY_ESTIMATE: 1, // Future use
    ADVANCED_ANALYTICS: 2, // Future use
} as const;

/**
 * Ensure user has a subscription (create free plan if none exists)
 */
export const ensureUserSubscription = async (userId: number): Promise<UserSubscription> => {
    let subscription = await getUserSubscription(userId);
    
    if (!subscription) {
        console.log(`Creating free subscription for user ${userId}`);
        subscription = await createUserSubscription(userId);
    }
    
    return subscription;
};

/**
 * Get user's current credit balance and subscription info
 */
export const getUserCreditInfo = async (userId: number): Promise<{
    subscription: UserSubscription;
    availableCredits: number;
    usedCredits: number;
    planName: string;
    planType: string;
}> => {
    const subscription = await ensureUserSubscription(userId);
    
    return {
        subscription,
        availableCredits: subscription.available_credits,
        usedCredits: subscription.used_credits,
        planName: subscription.plan_name || 'Unknown Plan',
        planType: subscription.plan_type || 'free'
    };
};

/**
 * Validate and consume credits for an action
 */
export const consumeCredits = async (
    userId: number,
    actionType: keyof typeof CREDIT_COSTS,
    referenceId?: number,
    referenceTable?: string,
    metadata?: any
): Promise<{
    success: boolean;
    message: string;
    newBalance: number;
    transactionId?: number;
}> => {
    try {
        const creditCost = CREDIT_COSTS[actionType];
        
        // Check if user has sufficient credits
        const hasSufficientCredits = await hasUserCredits(userId, creditCost);
        
        if (!hasSufficientCredits) {
            const creditInfo = await getUserCreditInfo(userId);
            return {
                success: false,
                message: `Insufficient credits. Required: ${creditCost}, Available: ${creditInfo.availableCredits}`,
                newBalance: creditInfo.availableCredits
            };
        }
        
        // Consume credits (negative amount for deduction)
        const result = await updateUserCredits(
            userId,
            -creditCost,
            actionType,
            `Consumed ${creditCost} credit(s) for ${actionType}`,
            referenceId,
            referenceTable,
            metadata
        );
        
        return {
            success: true,
            message: `Successfully consumed ${creditCost} credit(s)`,
            newBalance: result.newBalance,
            transactionId: result.transactionId
        };
        
    } catch (error) {
        console.error('Error consuming credits:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to consume credits',
            newBalance: 0
        };
    }
};

/**
 * Add credits to user account (for upgrades, refunds, etc.)
 */
export const addCredits = async (
    userId: number,
    creditAmount: number,
    actionType: string,
    description?: string,
    metadata?: any
): Promise<{
    success: boolean;
    message: string;
    newBalance: number;
    transactionId?: number;
}> => {
    try {
        const result = await updateUserCredits(
            userId,
            creditAmount,
            actionType,
            description || `Added ${creditAmount} credit(s)`,
            undefined,
            undefined,
            metadata
        );
        
        return {
            success: true,
            message: `Successfully added ${creditAmount} credit(s)`,
            newBalance: result.newBalance,
            transactionId: result.transactionId
        };
        
    } catch (error) {
        console.error('Error adding credits:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to add credits',
            newBalance: 0
        };
    }
};

/**
 * Check if user can perform an action (has sufficient credits)
 */
export const canPerformAction = async (
    userId: number,
    actionType: keyof typeof CREDIT_COSTS
): Promise<{
    canPerform: boolean;
    requiredCredits: number;
    availableCredits: number;
    message: string;
}> => {
    try {
        const creditCost = CREDIT_COSTS[actionType];
        const creditInfo = await getUserCreditInfo(userId);
        const canPerform = creditInfo.availableCredits >= creditCost;
        
        return {
            canPerform,
            requiredCredits: creditCost,
            availableCredits: creditInfo.availableCredits,
            message: canPerform 
                ? 'Sufficient credits available'
                : `Insufficient credits. Required: ${creditCost}, Available: ${creditInfo.availableCredits}`
        };
        
    } catch (error) {
        console.error('Error checking if user can perform action:', error);
        return {
            canPerform: false,
            requiredCredits: CREDIT_COSTS[actionType],
            availableCredits: 0,
            message: 'Error checking credit availability'
        };
    }
};

/**
 * Get user's credit transaction history
 */
export const getCreditHistory = async (userId: number, limit: number = 50): Promise<CreditTransaction[]> => {
    return getUserCreditHistory(userId, limit);
};

/**
 * Get all available subscription plans
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    return getActivePlans();
};

/**
 * Upgrade user to a new plan
 */
export const upgradeUserPlan = async (
    userId: number,
    newPlanId: number
): Promise<{
    success: boolean;
    message: string;
    newSubscription?: UserSubscription;
}> => {
    try {
        // This is a simplified version - in production you'd handle billing, prorating, etc.
        // For now, we'll just update the plan and add the new credits
        
        const plans = await getActivePlans();
        const newPlan = plans.find(p => p.plan_id === newPlanId);
        
        if (!newPlan) {
            return {
                success: false,
                message: 'Invalid plan selected'
            };
        }
        
        // Get current subscription
        const currentSubscription = await getUserSubscription(userId);
        if (!currentSubscription) {
            return {
                success: false,
                message: 'No active subscription found'
            };
        }
        
        // TODO: Implement plan upgrade logic
        // This would involve:
        // 1. Updating the subscription plan
        // 2. Calculating prorated credits
        // 3. Handling billing changes
        // 4. Creating transaction records
        
        return {
            success: false,
            message: 'Plan upgrades not yet implemented'
        };
        
    } catch (error) {
        console.error('Error upgrading user plan:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to upgrade plan'
        };
    }
}; 