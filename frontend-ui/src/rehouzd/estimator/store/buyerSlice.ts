import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Buyer {
  id: string;
  name: string;
  address: string;
  type: string[];
  priceRange: string;
  likelihood: 'Likely' | 'Possible' | 'Unlikely';
  recentPurchases: number;
  category?: 'active' | 'recent';
  phone?: string;
  email?: string;
  purchase_history?: Array<{
    address: string;
    date: string;
    price: string;
    prop_latitude?: number;
    prop_longitude?: number;
  }>;
  score?: number;
  matchDetails?: {
    geographicScore: number;
    recencyScore: number;
    priceScore: number;
    characteristicsScore: number;
    activityScore: number;
  };
}

export interface BackendBuyer {
  id: number;
  investor_company_nm_txt: string;
  investor_profile: {
    min_prop_attr_br_cnt?: number;
    min_prop_attr_bth_cnt?: number;
    min_sqft?: number;
    min_year?: number;
    list_zips?: string[];
    min_props_amnt?: number;
    mx_props_amnt?: number;
    address?: string;
    phone?: string;
    email?: string;
    is_flipper?: boolean;
    is_landlord?: boolean;
    is_developer?: boolean;
    is_wholesaler?: boolean;
  };
  num_prop_purchased_lst_12_mths_nr: number;
  active_flg: boolean;
  purchase_history?: Array<{
    purchase_date: string;
    property_zip_code: string;
    property_city: string;
    purchase_price: number;
    prop_latitude?: number;
    prop_longitude?: number;
  }>;
}

interface BuyerState {
  buyers: Buyer[];
  selectedBuyer: Buyer | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: BuyerState = {
  buyers: [],
  selectedBuyer: null,
  loading: false,
  error: null
};

// Transform backend buyer data to frontend format
export function transformBuyerData(backendBuyer: BackendBuyer): Buyer {
  const profile = backendBuyer.investor_profile || {};
  
  // Determine buyer types
  const buyerTypes: string[] = [];
  if (profile.is_flipper) buyerTypes.push('Flipper');
  if (profile.is_landlord) buyerTypes.push('Landlord');
  if (profile.is_developer) buyerTypes.push('Developer');
  if (profile.is_wholesaler) buyerTypes.push('Wholesaler');
  
  // Default to a general investor type if none specified
  if (buyerTypes.length === 0) buyerTypes.push('Investor');
  
  // Format price range
  const minPrice = profile.min_props_amnt || 0;
  const maxPrice = profile.mx_props_amnt || 0;
  let priceRange = 'Any';
  
  if (minPrice > 0 && maxPrice === 0) {
    priceRange = `$${minPrice.toLocaleString()}+`;
  } else if (minPrice === 0 && maxPrice > 0) {
    priceRange = `Up to $${maxPrice.toLocaleString()}`;
  } else if (minPrice > 0 && maxPrice > 0) {
    priceRange = `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`;
  }
  
  // Determine likelihood based on purchase history or activity level
  const purchaseCount = backendBuyer.num_prop_purchased_lst_12_mths_nr || 0;
  let likelihood: 'Likely' | 'Possible' | 'Unlikely' = 'Possible';
  
  if (purchaseCount >= 15) {
    likelihood = 'Likely';
  } else if (purchaseCount <= 5) {
    likelihood = 'Unlikely';
  }
  
  // Format purchase history for frontend if available
  const purchaseHistory = backendBuyer.purchase_history?.map(purchase => ({
    address: `${purchase.property_city}, ${purchase.property_zip_code}`,
    date: new Date(purchase.purchase_date).toLocaleDateString(),
    price: `$${purchase.purchase_price.toLocaleString()}`,
    prop_latitude: purchase.prop_latitude,
    prop_longitude: purchase.prop_longitude
  })) || [];
  
  return {
    id: backendBuyer.id.toString(),
    name: backendBuyer.investor_company_nm_txt,
    address: profile.address || 'No address provided',
    type: buyerTypes,
    priceRange,
    likelihood,
    recentPurchases: purchaseCount,
    phone: profile.phone,
    email: profile.email,
    purchase_history: purchaseHistory
  };
}

// Create the slice
const buyerSlice = createSlice({
  name: 'buyer',
  initialState,
  reducers: {
    setBuyers: (state, action: PayloadAction<Buyer[]>) => {
      state.buyers = action.payload;
    },
    setSelectedBuyer: (state, action: PayloadAction<Buyer | null>) => {
      state.selectedBuyer = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { setBuyers, setSelectedBuyer, setLoading, setError } = buyerSlice.actions;

export default buyerSlice.reducer; 