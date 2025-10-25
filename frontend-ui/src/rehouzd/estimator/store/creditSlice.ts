import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SubscriptionInfo {
    subscriptionId: number;
    planId: number;
    status: string;
    billingCycleStart: string;
    billingCycleEnd: string;
    autoRenew: boolean;
}

export interface CreditTransaction {
    transaction_id: number;
    user_id: number;
    transaction_type: string;
    credit_amount: number;
    action_type?: string;
    description?: string;
    balance_before: number;
    balance_after: number;
    created_at: string;
}

export interface CreditState {
    availableCredits: number;
    usedCredits: number;
    planName: string;
    planType: string;
    subscription: SubscriptionInfo | null;
    transactions: CreditTransaction[];
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

const initialState: CreditState = {
    availableCredits: 0,
    usedCredits: 0,
    planName: 'Unknown Plan',
    planType: 'free',
    subscription: null,
    transactions: [],
    loading: false,
    error: null,
    lastUpdated: null
};

const creditSlice = createSlice({
    name: 'credit',
    initialState,
    reducers: {
        setCreditInfo: (state, action: PayloadAction<{
            availableCredits: number;
            usedCredits: number;
            planName: string;
            planType: string;
            subscription: SubscriptionInfo;
        }>) => {
            state.availableCredits = action.payload.availableCredits;
            state.usedCredits = action.payload.usedCredits;
            state.planName = action.payload.planName;
            state.planType = action.payload.planType;
            state.subscription = action.payload.subscription;
            state.lastUpdated = new Date().toISOString();
            state.loading = false;
            state.error = null;
        },
        updateCredits: (state, action: PayloadAction<{
            availableCredits: number;
            usedCredits: number;
        }>) => {
            state.availableCredits = action.payload.availableCredits;
            state.usedCredits = action.payload.usedCredits;
            state.lastUpdated = new Date().toISOString();
        },
        setCreditTransactions: (state, action: PayloadAction<CreditTransaction[]>) => {
            state.transactions = action.payload;
        },
        addCreditTransaction: (state, action: PayloadAction<CreditTransaction>) => {
            state.transactions.unshift(action.payload);
            // Keep only the last 50 transactions for performance
            if (state.transactions.length > 50) {
                state.transactions = state.transactions.slice(0, 50);
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
            if (action.payload) {
                state.error = null;
            }
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading = false;
        },
        clearCreditData: (state) => {
            return initialState;
        },
        // Action to handle successful credit consumption
        consumeCredits: (state, action: PayloadAction<{
            creditAmount: number;
            newBalance: number;
        }>) => {
            state.availableCredits = action.payload.newBalance;
            state.usedCredits += action.payload.creditAmount;
            state.lastUpdated = new Date().toISOString();
        }
    }
});

export const {
    setCreditInfo,
    updateCredits,
    setCreditTransactions,
    addCreditTransaction,
    setLoading,
    setError,
    clearCreditData,
    consumeCredits
} = creditSlice.actions;

export default creditSlice.reducer; 