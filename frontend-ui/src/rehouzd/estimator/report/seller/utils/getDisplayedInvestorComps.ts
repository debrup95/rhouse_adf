/**
 * Utility function to get displayed investor comps for seller reports
 * This function is used by both SellerReport and ShareSellerReportButton
 * to ensure consistent comp selection logic
 */

interface Buyer {
  id?: string;
  name?: string;
  purchase_history?: any[];
}

interface CompProperty {
  id: string;
  address: string;
  price: number;
  date: string;
  specs: string;
  priceValue: number;
  distance?: number;
  legacyId?: string; // For backward compatibility
}

interface DisplayedComp {
  id: string;
  address: string;
  price: number;
  date: string;
  specs: string;
  distance?: number;
}

/**
 * Helper function to calculate distance between two coordinates (in miles)
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get displayed investor comps from buyers data
 * 
 * @param buyers - Array of buyer objects with purchase history
 * @param addressData - Property address data with coordinates
 * @param buyerEstimatedPrice - The calculated buyer estimated price for comparison
 * @param selectedComps - Optional array of manually selected comp IDs
 * @returns Array of 4 displayed comps (2 lower + 2 upper, or manually selected)
 */
export const getDisplayedInvestorComps = (
  buyers: Buyer[],
  addressData: any,
  buyerEstimatedPrice: number,
  selectedComps?: string[]
): DisplayedComp[] => {
  if (!buyers || !Array.isArray(buyers) || buyers.length === 0) {
    return [];
  }

  // Get current property coordinates for distance calculation
  const currentLat = addressData?.latitude;
  const currentLng = addressData?.longitude;

  // Process buyers data to extract purchase history
  const properties: CompProperty[] = [];

  buyers.forEach((buyer: Buyer) => {
    if (buyer.purchase_history && Array.isArray(buyer.purchase_history) && buyer.purchase_history.length > 0) {
      buyer.purchase_history.forEach((purchase: any, index: number) => {
        let address = '';
        let price: number | undefined;
        let soldDate = '';
        let bedrooms = '';
        let bathrooms = '';
        let sqft = '';
        let distance: number | undefined;
        
        // Extract data from purchase history
        if (typeof purchase === 'object' && 'address' in purchase) {
          address = purchase.address || '';
          
          // Parse price
          if (typeof purchase.price === 'number') {
            price = purchase.price;
          } else if (typeof purchase.price === 'string') {
            price = parseFloat(purchase.price.replace(/[^0-9.-]+/g, '') || '0');
          }
          
          soldDate = purchase.date || '';
          
          // Extract specs from enhanced fields if available
          bedrooms = purchase.prop_attr_br_cnt?.toString() || '2';
          bathrooms = purchase.prop_attr_bth_cnt?.toString() || '1';
          sqft = purchase.prop_attr_sqft_nr?.toLocaleString() || '1,200';
          
          // Calculate distance if coordinates are available
          if (currentLat && currentLng && purchase.prop_latitude && purchase.prop_longitude) {
            distance = calculateDistance(
              currentLat, 
              currentLng, 
              purchase.prop_latitude, 
              purchase.prop_longitude
            );
          }
        }
        
        if (price && price > 0) {
          // Create unique ID for this property (string format for new reports)
          const propertyId = `${buyer.id || buyer.name || 'unknown'}-${index}`;
          
          // Also create legacy numeric ID for backward compatibility
          const legacyId = Number(`${buyer.id || 0}${index}`) || Date.now() + index;
          
          properties.push({
            id: propertyId,
            address,
            price,
            date: soldDate,
            specs: `${bedrooms} · ${bathrooms} · ${sqft}`,
            priceValue: price,
            distance,
            // Store legacy ID for backward compatibility
            legacyId: legacyId.toString()
          });
        }
      });
    }
  });

  // Filter properties by distance (≤ 2 miles) if coordinates are available
  const filteredProperties = currentLat && currentLng 
    ? properties.filter(p => p.distance !== undefined && p.distance <= 2)
    : properties; // If no coordinates, show all properties

  // Check if manual selection is provided
  let selectedProperties: CompProperty[];
  
  if (selectedComps && Array.isArray(selectedComps) && selectedComps.length > 0) {
    // Use manually selected comparables - handle both new and legacy ID formats
    selectedProperties = filteredProperties.filter(p => 
      selectedComps.includes(p.id) || 
      (p.legacyId && selectedComps.includes(p.legacyId))
    );
  } else {
    // Use automatic selection: 2 closest lower and 2 closest upper values
    const lowerProperties = filteredProperties
      .filter(p => p.priceValue < buyerEstimatedPrice)
      .sort((a, b) => b.priceValue - a.priceValue) // Sort descending to get closest to target
      .slice(0, 2); // Take 2 closest lower values
    
    const upperProperties = filteredProperties
      .filter(p => p.priceValue >= buyerEstimatedPrice)
      .sort((a, b) => a.priceValue - b.priceValue) // Sort ascending to get closest to target
      .slice(0, 2); // Take 2 closest upper values
    
    selectedProperties = [...lowerProperties, ...upperProperties];
  }

  // Return only the fields we need (without priceValue)
  return selectedProperties.map(({ id, address, price, date, specs, distance }) => ({
    id,
    address,
    price,
    date,
    specs,
    distance
  }));
};
