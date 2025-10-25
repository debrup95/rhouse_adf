// Enhanced purchase history interface to handle backend data
interface EnhancedPurchaseHistory {
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
}

interface BuyerMetrics {
    closedDealsTotal: number;
    lastBuyDate: string | null;
    avgZipPrice: number | null;
    subjectZipPurchases: EnhancedPurchaseHistory[];
    allPurchases: EnhancedPurchaseHistory[];
}

export const calculateBuyerMetrics = (
    purchaseHistory: EnhancedPurchaseHistory[] = [], 
    subjectPropertyZipCode: string
): BuyerMetrics => {
    // Get all valid purchases
    const allPurchases = purchaseHistory.filter(purchase => {
        // Must have either address or enhanced address data
        return (purchase.address && purchase.address.trim()) || 
               (purchase.prop_address_line_txt && purchase.prop_address_line_txt.trim());
    });

    // Filter purchases by subject property zip code
    const subjectZipPurchases = allPurchases.filter(purchase => {
        let purchaseZip = '';
        
        // Prefer enhanced backend fields if available
        if (purchase.prop_zip_cd) {
            purchaseZip = purchase.prop_zip_cd;
        } else {
            // Fallback to legacy fields and extraction
            const address = purchase.address || '';
            const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
            purchaseZip = zipMatch ? zipMatch[1] : '';
        }
        
        return purchaseZip === subjectPropertyZipCode && purchaseZip !== '';
    });

    // Calculate total closed deals (all zip codes)
    const closedDealsTotal = allPurchases.length;

    // Find the most recent purchase date across ALL zip codes
    const allDates = allPurchases
        .map(purchase => purchase.prop_last_sale_dt || purchase.date)
        .filter(date => date && date.trim())
        .map(dateString => {
            // Handle timezone-safe date parsing
            const date = dateString!;
            // If date is in YYYY-MM-DD format, parse it safely to avoid timezone issues
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // For other formats, use regular Date parsing
            return new Date(date);
        })
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime());
    
    const lastBuyDate = allDates.length > 0 
        ? allDates[0].toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
        : null;

    // Calculate average price for subject property zip code only
    const subjectZipPrices = subjectZipPurchases
        .map(purchase => {
            if (purchase.prop_last_sale_amt) {
                return purchase.prop_last_sale_amt;
            } else if (typeof purchase.price === 'number') {
                return purchase.price;
            } else if (typeof purchase.price === 'string') {
                const parsed = parseFloat(purchase.price.replace(/[^0-9.-]+/g, '') || '0');
                return parsed > 0 ? parsed : 0;
            }
            return 0;
        })
        .filter(price => price > 0);
    
    const avgZipPrice = subjectZipPrices.length > 0 
        ? Math.round(subjectZipPrices.reduce((sum, price) => sum + price, 0) / subjectZipPrices.length)
        : null;

    return {
        closedDealsTotal,
        lastBuyDate,
        avgZipPrice,
        subjectZipPurchases,
        allPurchases
    };
};

// Utility function to extract zip code from address or enhanced data
export const extractZipCode = (purchase: EnhancedPurchaseHistory): string => {
    if (purchase.prop_zip_cd) {
        return purchase.prop_zip_cd;
    }
    
    const address = purchase.address || '';
    const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
    return zipMatch ? zipMatch[1] : '';
};

// Format currency for display
export const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}k`;
    } else {
        return `$${amount.toLocaleString()}`;
    }
};

export type { EnhancedPurchaseHistory, BuyerMetrics }; 