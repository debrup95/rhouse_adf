import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Note: The fetchBuyers async thunk was previously defined here but has been removed.
 * Components now fetch buyers directly from the API using fetch() instead of Redux.
 * This reduces dependencies and simplifies error handling.
 */

// Backend Buyer interface
export interface BackendBuyer {
  id: number;
  investor_company_nm_txt: string;
  investor_profile: any;
  num_prop_purchased_lst_12_mths_nr: number;
  active_flg: boolean;
  purchase_history?: Array<{
    prop_last_sale_dt?: string;
    prop_last_sale_amt?: number;
    prop_address_line_txt?: string;
    prop_city_nm?: string;
    prop_state_nm?: string;
    prop_zip_cd?: string;
    prop_county_nm?: string;
    prop_attr_br_cnt?: number;
    prop_attr_bth_cnt?: number;
    prop_attr_sqft_nr?: number;
    prop_yr_blt_nr?: number;
    prop_latitude?: number;
    prop_longitude?: number;
  }>;
}

// Frontend Buyer interface (maintained for UI components)
export interface Buyer {
    id?: string;
    name: string;
    address: string;
    phone?: string;
    type: string[];
    priceRange: string;
    likelihood: string;
    recentPurchases: number;
    category?: 'active' | 'recent';
    purchase_history?: Array<{
        // Legacy fields for backward compatibility
        address?: string;
        date?: string;
        price?: string | number;
        
        // Enhanced fields from backend (Phase 1)
        prop_last_sale_dt?: string;
        prop_last_sale_amt?: number;
        prop_address_line_txt?: string;
        prop_city_nm?: string;
        prop_state_nm?: string;
        prop_zip_cd?: string;
        prop_county_nm?: string;
        prop_attr_br_cnt?: number;
        prop_attr_bth_cnt?: number;
        prop_attr_sqft_nr?: number;
        prop_yr_blt_nr?: number;
        prop_latitude?: number;
        prop_longitude?: number;
    }>;
}

interface BuyerState {
    buyers: Buyer[];
    loading: boolean;
    error: string | null;
}

const initialState: BuyerState = {
    buyers: [],
    loading: false,
    error: null
};

const buyerSlice = createSlice({
    name: 'buyers',
    initialState,
    reducers: {
        setBuyers(state, action: PayloadAction<Buyer[]>) {
            state.buyers = action.payload;
        },
        clearBuyers(state) {
            state.buyers = [];
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        }
    }
});

// Helper function to transform backend buyers to frontend format
export const transformBuyerData = (backendBuyer: BackendBuyer): Buyer => {
    // Extract data from investor_profile if available
    const profile = backendBuyer.investor_profile || {};
    
    // Default type if not available
    const buyerTypes = profile.property_types || ['Investor'];
    
    // Create price range from min/max values if available
    const minPrice = profile.min_price || 0;
    const maxPrice = profile.max_price || 0;
    const priceRange = maxPrice ? `$${minPrice/1000}k - $${maxPrice/1000}k` : 'Variable';
    
    // Extract purchase history - check both locations for backward compatibility
    const purchaseHistory = backendBuyer.purchase_history || profile.purchase_history || [];
    

    
    return {
        id: backendBuyer.id.toString(),
        name: backendBuyer.investor_company_nm_txt,
        address: profile.location || 'United States',
        phone: profile.contact_phone || undefined,
        type: buyerTypes,
        priceRange: priceRange,
        likelihood: backendBuyer.num_prop_purchased_lst_12_mths_nr > 5 ? 'Likely' : 'Possible',
        recentPurchases: backendBuyer.num_prop_purchased_lst_12_mths_nr,
        category: (backendBuyer as any).category || undefined, // Handle category from backend
        purchase_history: purchaseHistory.length > 0 ? purchaseHistory : undefined
    };
};

export const { setBuyers, clearBuyers, setLoading, setError } = buyerSlice.actions;
export default buyerSlice.reducer; 