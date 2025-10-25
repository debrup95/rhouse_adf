/**
 * Utility function to expand properties into separate rows for each event type
 * This ensures consistent data structure between UI display and filtering logic
 */

export interface RelatedProperty {
  id?: string | number;
  address?: string;
  price?: number;
  rent?: number;
  distance?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  status?: string;
  event_type?: string;
  event_name?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  lastRentalPrice?: number;
  lastRentalDate?: string;
  rentalStatus?: string;
  soldDate?: string;
  date?: string;
  [key: string]: any;
}

/**
 * Expand properties into separate rows for sale and rental events
 * @param properties Array of properties to expand
 * @param activeCompsTab Tab index (0 = Suggested Comps, 1 = All Comps)
 * @returns Array of expanded properties
 */
export function expandPropertiesIntoSeparateRows(
  properties: RelatedProperty[], 
  activeCompsTab: number = 1
): RelatedProperty[] {
  // For Suggested Comps (activeCompsTab === 0), the backend already provides expanded data
  // so we don't need to expand it again. Just return a copy of the properties.
  if (activeCompsTab === 0) {
    return [...properties];
  }
  
  // For All Comps (activeCompsTab === 1), we need to expand the properties
  const expandedProperties: RelatedProperty[] = [];
  
  properties.forEach((property, index) => {
    // Create a row for sale event if it exists
    if (property.lastSalePrice && property.lastSaleDate) {
      expandedProperties.push({
        ...property,
        id: `${property.id || index}-sale` as any,
        // Override fields to show only sale data
        status: "SOLD",
        event_type: "SALE",
        event_name: "SOLD",
        soldDate: property.lastSaleDate,
        date: property.lastSaleDate,
        price: property.lastSalePrice,
        // Clear rental fields for this row
        lastRentalPrice: undefined,
        lastRentalDate: undefined,
        rentalStatus: undefined,
      });
    }
    
    // Create a row for rental event if it exists
    if (property.lastRentalPrice && property.lastRentalDate) {
      expandedProperties.push({
        ...property,
        id: `${property.id || index}-rental` as any,
        // Override fields to show only rental data
        status: property.rentalStatus === "PRICE_CHANGE" ? "RENTAL" : (property.rentalStatus || "RENTAL"),
        event_type: "RENTAL",
        event_name: "LISTED_RENT",
        soldDate: property.lastRentalDate,
        date: property.lastRentalDate,
        price: property.lastRentalPrice,
        rent: property.lastRentalPrice,
        // Clear sale fields for this row
        lastSalePrice: undefined,
        lastSaleDate: undefined,
      });
    }
    
    // Create a fallback row for properties with no event data
    if (!property.lastSalePrice && !property.lastSaleDate && !property.lastRentalPrice && !property.lastRentalDate && (property.price || property.status)) {
      expandedProperties.push({
        ...property,
        id: `${property.id || index}-legacy` as any,
      });
    }
  });
  
  return expandedProperties;
}
