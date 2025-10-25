import { Buyer } from '../models/buyer/buyerModel';

/**
 * Frontend Buyer format
 */
export interface FrontendBuyer {
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
    // Legacy fields for backward compatibility
    address: string;
    date: string;
    price: string;
    
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
  // Additional fields for ranked data
  score?: number;
  matchDetails?: {
    geographicScore: number;
    recencyScore: number;
    priceScore: number;
    characteristicsScore: number;
    activityScore: number;
  };
}

/**
 * Transform buyer data from backend to frontend format
 * @param backendBuyer Backend buyer data
 * @param knownCategory Optional known category to avoid recalculation
 * @returns Transformed frontend buyer data
 */
export function transformBuyerData(
  backendBuyer: Buyer,
  knownCategory?: 'active' | 'recent'
): FrontendBuyer {
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
  const priceRange = formatPriceRange(minPrice, maxPrice);
  
  // Determine likelihood based on purchase history or activity level
  const purchaseCount = backendBuyer.num_prop_purchased_lst_12_mths_nr || 0;
  let likelihood: 'Likely' | 'Possible' | 'Unlikely' = 'Possible';
  
  if (purchaseCount >= 5) {
    likelihood = 'Likely';
  } else if (purchaseCount <= 1) {
    likelihood = 'Unlikely';
  }
  
  // Format purchase history for frontend if available
  const purchaseHistory = backendBuyer.purchase_history?.map(purchase => {
    // Try to format date - handle potential errors
    let formattedDate = "N/A";
    try {
      if (purchase.prop_last_sale_dt) {
        const date = new Date(purchase.prop_last_sale_dt);
        formattedDate = date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    
    // Create formatted address with all components
    let addressParts = [];
    if (purchase.prop_address_line_txt) addressParts.push(purchase.prop_address_line_txt);
    if (purchase.prop_city_nm) addressParts.push(purchase.prop_city_nm);
    if (purchase.prop_state_nm) addressParts.push(purchase.prop_state_nm);
    if (purchase.prop_zip_cd) addressParts.push(purchase.prop_zip_cd);
    
    const formattedAddress = addressParts.join(", ");
    
    return {
      // Legacy fields for backward compatibility
      address: formattedAddress || "Address not available",
      date: formattedDate,
      price: formatCurrency(purchase.prop_last_sale_amt),
      
      // Enhanced fields from backend - preserve all property attributes
      prop_last_sale_dt: purchase.prop_last_sale_dt,
      prop_last_sale_amt: purchase.prop_last_sale_amt,
      prop_address_line_txt: purchase.prop_address_line_txt,
      prop_city_nm: purchase.prop_city_nm,
      prop_state_nm: purchase.prop_state_nm,
      prop_zip_cd: purchase.prop_zip_cd,
      prop_county_nm: purchase.prop_county_nm,
      prop_attr_br_cnt: purchase.prop_attr_br_cnt,
      prop_attr_bth_cnt: purchase.prop_attr_bth_cnt,
      prop_attr_sqft_nr: purchase.prop_attr_sqft_nr,
      prop_yr_blt_nr: purchase.prop_yr_blt_nr,
      prop_latitude: purchase.prop_latitude,
      prop_longitude: purchase.prop_longitude,
    };
  }) || [];
  
  // Log the purchaseHistory to debug
  // console.log('Transformed purchase history:', purchaseHistory);
  
  // Format the mailing address
  const formattedAddress = formatMailingAddress(profile.full_mailing_addr);

  return {
    id: backendBuyer.id?.toString() || '',
    name: backendBuyer.investor_company_nm_txt || 'Unknown Buyer',
    address: formattedAddress,
    type: buyerTypes,
    priceRange,
    likelihood,
    recentPurchases: purchaseCount,
    category: knownCategory,
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    purchase_history: purchaseHistory
  };
}

/**
 * Format price range as a string
 * @param min Minimum price
 * @param max Maximum price
 * @returns Formatted price range string
 */
function formatPriceRange(min: number, max: number): string {
  if (min === 0 && max === 0) {
    return 'Any';
  }
  
  if (min > 0 && max === 0) {
    return `${formatCurrency(min)}+`;
  }
  
  if (min === 0 && max > 0) {
    return `Up to ${formatCurrency(max)}`;
  }
  
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

/**
 * Format currency value
 * @param value Value to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format mailing address
 * @param address Address to format
 * @returns Formatted mailing address
 */
function formatMailingAddress(address?: string): string {
  if (!address) return 'No address available';

  if (typeof address !== "string" || !address.trim()) {
    return address;
  }

  const tokens = address.trim().split(/\s+/);

  if (tokens.length < 3) {
    return address; 
  }

  const state = tokens.pop(); 
  const zip   = tokens.length >= 1 ? tokens.pop() : ""; 
  const city  = tokens.length >= 1 ? tokens.pop() : "";

  if (!city || !zip || !state) {
    return address;
  }

  const street = tokens.join(" "); 

  const parts = [];
  if (street) parts.push(street);
  parts.push(city);
  parts.push(`${state} ${zip}`.trim());

  return parts.join(", ");
}