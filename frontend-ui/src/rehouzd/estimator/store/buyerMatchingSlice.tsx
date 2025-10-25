import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface BuyerMatchingRequest {
  request_id?: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  status?: string;
  property_address?: string;
  created_at?: string;
  updated_at?: string;
}

interface BuyerMatchingState {
  requests: BuyerMatchingRequest[];
  currentRequest: BuyerMatchingRequest | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Initial state
const initialState: BuyerMatchingState = {
  requests: [],
  currentRequest: null,
  loading: false,
  error: null,
  success: false,
};

// Slice
const buyerMatchingSlice = createSlice({
  name: 'buyerMatching',
  initialState,
  reducers: {
    resetBuyerMatchingState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
    setCurrentRequest: (state, action: PayloadAction<BuyerMatchingRequest | null>) => {
      state.currentRequest = action.payload;
    },
    setRequests: (state, action: PayloadAction<BuyerMatchingRequest[]>) => {
      state.requests = action.payload;
    },
    addRequest: (state, action: PayloadAction<BuyerMatchingRequest>) => {
      if (action.payload.request_id) {
        const exists = state.requests.some(request => 
          request.request_id === action.payload.request_id
        );
        
        if (!exists) {
          state.requests.push(action.payload);
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSuccess: (state, action: PayloadAction<boolean>) => {
      state.success = action.payload;
    }
  }
});

export const { 
  resetBuyerMatchingState, 
  setCurrentRequest, 
  setRequests, 
  addRequest, 
  setLoading, 
  setError, 
  setSuccess 
} = buyerMatchingSlice.actions;

export default buyerMatchingSlice.reducer; 