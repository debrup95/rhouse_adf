import pool from '../../config/db';

export interface SubscriptionPlan {
    plan_id: number;
    plan_name: string;
    plan_type: string;
    monthly_price: number;
    credits_per_month: number;
    is_active: boolean;
    features: any; // JSON object
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export interface UserSubscription {
    subscription_id: number;
    user_id: number;
    plan_id: number;
    status: string;
    available_credits: number;
    used_credits: number;
    billing_cycle_start: Date;
    billing_cycle_end: Date;
    auto_renew: boolean;
    created_at: Date;
    updated_at: Date;
    // Joined plan details
    plan_name?: string;
    plan_type?: string;
    credits_per_month?: number;
}

export interface CreditTransaction {
    transaction_id: number;
    user_id: number;
    transaction_type: string;
    credit_amount: number;
    action_type?: string;
    description?: string;
    reference_id?: number;
    reference_table?: string;
    balance_before: number;
    balance_after: number;
    metadata?: any;
    created_at: Date;
}

/**
 * Get all active subscription plans
 */
export const getActivePlans = async (): Promise<SubscriptionPlan[]> => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT plan_id, plan_name, plan_type, monthly_price, credits_per_month,
                   is_active, features, description, created_at, updated_at
            FROM subscription_plans 
            WHERE is_active = true 
            ORDER BY monthly_price ASC
        `;
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error fetching active plans:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get user's current active subscription
 */
export const getUserSubscription = async (userId: number): Promise<UserSubscription | null> => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT us.subscription_id, us.user_id, us.plan_id, us.status,
                   us.available_credits, us.used_credits, us.billing_cycle_start,
                   us.billing_cycle_end, us.auto_renew, us.created_at, us.updated_at,
                   sp.plan_name, sp.plan_type, sp.credits_per_month
            FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.plan_id
            WHERE us.user_id = $1 AND us.status = 'active'
            LIMIT 1
        `;
        const result = await client.query(query, [userId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Create a new subscription for a user (defaults to Free Plan)
 */
export const createUserSubscription = async (userId: number, planId?: number): Promise<UserSubscription> => {
    const client = await pool.connect();
    try {
        // If no plan specified, default to Free Plan
        const defaultPlanQuery = `
            SELECT plan_id, credits_per_month 
            FROM subscription_plans 
            WHERE plan_type = 'free' AND is_active = true 
            LIMIT 1
        `;
        const defaultPlanResult = await client.query(defaultPlanQuery);
        
        if (defaultPlanResult.rows.length === 0) {
            throw new Error('No free plan available');
        }
        
        const selectedPlanId = planId || defaultPlanResult.rows[0].plan_id;
        const creditsPerMonth = defaultPlanResult.rows[0].credits_per_month;
        
        // Set billing cycle to current month
        const billingStart = new Date();
        billingStart.setDate(1); // First day of current month
        
        const billingEnd = new Date(billingStart);
        billingEnd.setMonth(billingEnd.getMonth() + 1);
        billingEnd.setDate(0); // Last day of current month
        
        const insertQuery = `
            INSERT INTO user_subscriptions 
            (user_id, plan_id, available_credits, billing_cycle_start, billing_cycle_end)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING subscription_id, user_id, plan_id, status, available_credits,
                      used_credits, billing_cycle_start, billing_cycle_end, auto_renew,
                      created_at, updated_at
        `;
        
        const result = await client.query(insertQuery, [
            userId, 
            selectedPlanId, 
            creditsPerMonth,
            billingStart,
            billingEnd
        ]);
        
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user subscription:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Update user's credit balance (with transaction logging)
 */
export const updateUserCredits = async (
    userId: number, 
    creditChange: number, 
    actionType: string,
    description?: string,
    referenceId?: number,
    referenceTable?: string,
    metadata?: any
): Promise<{ success: boolean; newBalance: number; transactionId: number }> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Get current subscription
        const subscription = await getUserSubscription(userId);
        if (!subscription) {
            throw new Error('User has no active subscription');
        }
        
        const currentBalance = subscription.available_credits;
        const newBalance = currentBalance + creditChange;
        
        // Validate credit balance won't go negative
        if (newBalance < 0) {
            throw new Error('Insufficient credits');
        }
        
        // Update subscription credits
        const updateQuery = `
            UPDATE user_subscriptions 
            SET available_credits = $1,
                used_credits = used_credits + $2,
                updated_at = NOW()
            WHERE user_id = $3 AND status = 'active'
        `;
        await client.query(updateQuery, [newBalance, Math.abs(creditChange), userId]);
        
        // Log transaction
        const transactionQuery = `
            INSERT INTO user_credit_transactions 
            (user_id, transaction_type, credit_amount, action_type, description, 
             reference_id, reference_table, balance_before, balance_after, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING transaction_id
        `;
        
        const transactionType = creditChange > 0 ? 'credit' : 'debit';
        const transactionResult = await client.query(transactionQuery, [
            userId,
            transactionType,
            creditChange,
            actionType,
            description,
            referenceId,
            referenceTable,
            currentBalance,
            newBalance,
            metadata ? JSON.stringify(metadata) : null
        ]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            newBalance,
            transactionId: transactionResult.rows[0].transaction_id
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user credits:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Check if user has sufficient credits for an action
 */
export const hasUserCredits = async (userId: number, requiredCredits: number): Promise<boolean> => {
    const subscription = await getUserSubscription(userId);
    return subscription ? subscription.available_credits >= requiredCredits : false;
};

/**
 * Get user's credit transaction history
 */
export const getUserCreditHistory = async (userId: number, limit: number = 50): Promise<CreditTransaction[]> => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT transaction_id, user_id, transaction_type, credit_amount,
                   action_type, description, reference_id, reference_table,
                   balance_before, balance_after, metadata, created_at
            FROM user_credit_transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await client.query(query, [userId, limit]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching user credit history:', error);
        throw error;
    } finally {
        client.release();
    }
}; 