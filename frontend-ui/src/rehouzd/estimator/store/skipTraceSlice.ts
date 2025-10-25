import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

// Skip Trace Credit Bundle interface
export interface CreditBundle {
  credits: number;
  price: number;
  perLookup: number;
  popular?: boolean;
}

// Matched Owner interface
export interface MatchedOwner {
  // For provider-agnostic support
  name?: string;
  owner?: {
    person_name?: {
      first_name?: string;
      last_name?: string;
    };
  };
  confidence: number;
  matchType: string;
  propertyAddress: string;
}

// Skip Trace Result interface
export interface SkipTraceResult {
  lookupId: string;
  buyerId: string;
  buyerName: string;
  lookupDate: string;
  creditUsed: 'free' | 'paid';
  userId?: string; // Add user ID to associate results with specific users
  phones: Array<{
    number: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  emails: Array<{
    email: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  addresses: Array<{
    address: string;
    type: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  compliance: {
    dncStatus: string;
    litigatorStatus: string;
  };
  apiResponseStatus: 'success' | 'failed' | 'no_data' | 'error';
  matchedOwners?: MatchedOwner[];
}

// Skip Trace State interface
export interface SkipTraceState {
  credits: {
    free: number;
    paid: number;
    total: number;
  };
  creditHistory: Array<{
    id: string;
    type: 'earned' | 'purchased' | 'used';
    amount: number;
    description: string;
    date: string;
  }>;
  skipTraceResults: SkipTraceResult[];
  loading: boolean;
  error: string | null;
  
  // Credit bundles available for purchase
  availableBundles: CreditBundle[];
  
  // Current purchase flow state
  purchaseFlow: {
    isActive: boolean;
    selectedBundle: CreditBundle | null;
    paymentStatus: 'idle' | 'processing' | 'completed' | 'failed';
    paymentError: string | null;
  };
}

// Credit bundles with Lead Sherpa pricing
const DEFAULT_CREDIT_BUNDLES: CreditBundle[] = [
  { credits: 10, price: 1.50, perLookup: 0.15 },
  { credits: 25, price: 3.75, perLookup: 0.15, popular: true },
  { credits: 50, price: 7.50, perLookup: 0.15 },
  { credits: 100, price: 15.00, perLookup: 0.15 },
];

const initialState: SkipTraceState = {
  credits: {
    free: 3, // Everyone starts with 3 free credits
    paid: 0,
    total: 3,
  },
  creditHistory: [
    {
      id: 'initial-free-credits',
      type: 'earned',
      amount: 3,
      description: 'Welcome bonus - Free skip trace credits',
      date: new Date().toISOString(),
    },
  ],
  skipTraceResults: [],
  loading: false,
  error: null,
  availableBundles: DEFAULT_CREDIT_BUNDLES,
  purchaseFlow: {
    isActive: false,
    selectedBundle: null,
    paymentStatus: 'idle',
    paymentError: null,
  },
};

const skipTraceSlice = createSlice({
  name: 'skipTrace',
  initialState,
  reducers: {
    // Credit management
    setCredits: (state, action: PayloadAction<{ free: number; paid: number }>) => {
      state.credits.free = action.payload.free;
      state.credits.paid = action.payload.paid;
      state.credits.total = action.payload.free + action.payload.paid;
    },
    
    useCredit: (state, action: PayloadAction<{ lookupId: string; buyerName: string }>) => {
      if (state.credits.total > 0) {
        if (state.credits.free > 0) {
          state.credits.free -= 1;
          state.creditHistory.push({
            id: `use-${action.payload.lookupId}`,
            type: 'used',
            amount: -1,
            description: `Skip traced ${action.payload.buyerName} (Free credit)`,
            date: new Date().toISOString(),
          });
        } else {
          state.credits.paid -= 1;
          state.creditHistory.push({
            id: `use-${action.payload.lookupId}`,
            type: 'used',
            amount: -1,
            description: `Skip traced ${action.payload.buyerName} (Paid credit)`,
            date: new Date().toISOString(),
          });
        }
        state.credits.total = state.credits.free + state.credits.paid;
      }
    },
    
    addCredits: (state, action: PayloadAction<{ amount: number; type: 'free' | 'paid'; description: string }>) => {
      const { amount, type, description } = action.payload;
      
      if (type === 'free') {
        state.credits.free += amount;
      } else {
        state.credits.paid += amount;
      }
      
      state.credits.total = state.credits.free + state.credits.paid;
      
      state.creditHistory.push({
        id: `add-${Date.now()}`,
        type: type === 'free' ? 'earned' : 'purchased',
        amount,
        description,
        date: new Date().toISOString(),
      });
    },
    
    // Skip trace results
    addSkipTraceResult: (state, action: PayloadAction<SkipTraceResult>) => {
      state.skipTraceResults.unshift(action.payload);
    },
    
    clearSkipTraceResults: (state) => {
      state.skipTraceResults = [];
    },
    
    // Clear skip trace results for user switching/logout
    clearUserSkipTraceResults: (state, action: PayloadAction<string | undefined>) => {
      const userId = action.payload;
      if (userId) {
        // Remove results for all other users, keep only current user's results
        state.skipTraceResults = state.skipTraceResults.filter(result => result.userId === userId);
      } else {
        // Clear all results if no user ID provided (logout)
        state.skipTraceResults = [];
      }
    },
    
    // Purchase flow
    startPurchaseFlow: (state, action: PayloadAction<CreditBundle>) => {
      state.purchaseFlow.isActive = true;
      state.purchaseFlow.selectedBundle = action.payload;
      state.purchaseFlow.paymentStatus = 'idle';
      state.purchaseFlow.paymentError = null;
    },
    
    setPaymentStatus: (state, action: PayloadAction<'idle' | 'processing' | 'completed' | 'failed'>) => {
      state.purchaseFlow.paymentStatus = action.payload;
    },
    
    setPaymentError: (state, action: PayloadAction<string | null>) => {
      state.purchaseFlow.paymentError = action.payload;
    },
    
    completePurchaseFlow: (state) => {
      if (state.purchaseFlow.selectedBundle) {
        // Add purchased credits
        state.credits.paid += state.purchaseFlow.selectedBundle.credits;
        state.credits.total = state.credits.free + state.credits.paid;
        
        // Add to history
        state.creditHistory.push({
          id: `purchase-${Date.now()}`,
          type: 'purchased',
          amount: state.purchaseFlow.selectedBundle.credits,
          description: `Purchased ${state.purchaseFlow.selectedBundle.credits} credits for $${state.purchaseFlow.selectedBundle.price.toFixed(2)}`,
          date: new Date().toISOString(),
        });
      }
      
      // Reset purchase flow
      state.purchaseFlow.isActive = false;
      state.purchaseFlow.selectedBundle = null;
      state.purchaseFlow.paymentStatus = 'idle';
      state.purchaseFlow.paymentError = null;
    },
    
    cancelPurchaseFlow: (state) => {
      state.purchaseFlow.isActive = false;
      state.purchaseFlow.selectedBundle = null;
      state.purchaseFlow.paymentStatus = 'idle';
      state.purchaseFlow.paymentError = null;
    },
    
    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Update available bundles (for dynamic pricing)
    updateAvailableBundles: (state, action: PayloadAction<CreditBundle[]>) => {
      state.availableBundles = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: any) => {
      // Clear skip trace results when state rehydrates to prevent cross-user data leakage
      if (action.payload && action.payload.skipTrace) {
        const rehydratedState = action.payload.skipTrace;
        // Keep everything except skipTraceResults
        state.credits = rehydratedState.credits || state.credits;
        state.creditHistory = rehydratedState.creditHistory || state.creditHistory;
        state.availableBundles = rehydratedState.availableBundles || state.availableBundles;
        state.purchaseFlow = rehydratedState.purchaseFlow || state.purchaseFlow;
        state.loading = rehydratedState.loading || state.loading;
        state.error = rehydratedState.error || state.error;
        // Always clear skipTraceResults on rehydrate to prevent cross-user access
        state.skipTraceResults = [];
      }
    });
  },
});

export const {
  setCredits,
  useCredit,
  addCredits,
  addSkipTraceResult,
  clearSkipTraceResults,
  clearUserSkipTraceResults, // Export the new action
  startPurchaseFlow,
  setPaymentStatus,
  setPaymentError,
  completePurchaseFlow,
  cancelPurchaseFlow,
  setLoading,
  setError,
  clearError,
  updateAvailableBundles,
} = skipTraceSlice.actions;

export default skipTraceSlice.reducer;

// Selectors
export const selectSkipTraceCredits = (state: { skipTrace: SkipTraceState }) => state.skipTrace.credits;
export const selectSkipTraceResults = (state: { skipTrace: SkipTraceState }) => state.skipTrace.skipTraceResults;
export const selectCreditHistory = (state: { skipTrace: SkipTraceState }) => state.skipTrace.creditHistory;
export const selectAvailableBundles = (state: { skipTrace: SkipTraceState }) => state.skipTrace.availableBundles;
export const selectPurchaseFlow = (state: { skipTrace: SkipTraceState }) => state.skipTrace.purchaseFlow;
export const selectSkipTraceLoading = (state: { skipTrace: SkipTraceState }) => state.skipTrace.loading;
export const selectSkipTraceError = (state: { skipTrace: SkipTraceState }) => state.skipTrace.error;

// Helper selectors
export const selectHasCredits = (state: { skipTrace: SkipTraceState }) => state.skipTrace.credits.total > 0;
export const selectCanSkipTrace = (state: { skipTrace: SkipTraceState }) => 
  state.skipTrace.credits.total > 0 && !state.skipTrace.loading; 