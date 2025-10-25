/**
 * Utility function to get displayed neighborhood comps for investor reports
 * This function handles both manual selection and automatic selection
 * for sold and rental properties (2 of each type)
 */

import { filterRentalComparables, filterSoldComparables } from '../../../utils/comparablesFilter';
import { expandPropertiesIntoSeparateRows, RelatedProperty } from '../../../utils/propertyExpansion';

interface NeighborhoodComp {
  type: 'Sold' | 'Rental';
  address: string;
  price: string;
  details: string;
  date: string;
}

/**
 * Get displayed neighborhood comps for investor reports
 * 
 * @param allProperties - All properties from the property data
 * @param arvValue - After Repair Value for sold comps filtering
 * @param rentValue - Rental value for rental comps filtering
 * @param selectedComps - Optional array of manually selected comp IDs
 * @returns Object with arvComps and rentalComps arrays
 */
export const getDisplayedNeighborhoodComps = (
  allProperties: RelatedProperty[],
  arvValue: number,
  rentValue: number,
  selectedComps?: string[]
): { arvComps: NeighborhoodComp[]; rentalComps: NeighborhoodComp[] } => {
  if (!allProperties || allProperties.length === 0) {
    return { arvComps: [], rentalComps: [] };
  }

  // Use the same expansion logic as the UI to get consistent data
  const expandedProperties = expandPropertiesIntoSeparateRows(allProperties, 1);

  // Helper function to convert property to comparable format
  const convertToComparable = (property: RelatedProperty): NeighborhoodComp => ({
    type: property.status === 'SOLD' || property.status === 'Sold' ? 'Sold' : 'Rental',
    address: property.address || '',
    price: property.price ? formatCurrency(property.price) : '',
    details: `${property.bedrooms || 0} bed • ${property.bathrooms || 0} bath • ${property.squareFootage || 0} sqft`,
    date: property.lastSaleDate || property.date || ''
  });

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  let arvComps: NeighborhoodComp[], rentalComps: NeighborhoodComp[];

  if (selectedComps && selectedComps.length > 0) {
    // Use manually selected comparables - NO CALCULATION NEEDED
    // Fix: Match base IDs with suffixed property IDs (e.g., "64961015" matches "64961015-sale" or "64961015-rental")
    const selectedProperties = expandedProperties.filter((p: RelatedProperty) => 
      p.id && selectedComps.some(selectedId => p.id!.toString().startsWith(selectedId + '-'))
    );
    
    // For manual selection, we allow outliers but could add a warning in the UI
    // The user might intentionally want to include outliers in their manual selection
    const selectedSold = selectedProperties.filter((p: RelatedProperty) => p.status === 'SOLD' || p.status === 'Sold');
    const selectedRental = selectedProperties.filter((p: RelatedProperty) => 
      p.status === 'LISTED_RENT' || p.status === 'RENTAL' || p.status === 'PRICE_CHANGE'
    );
    
    // Take up to 2 of each type
    arvComps = selectedSold.slice(0, 2).map(convertToComparable);
    rentalComps = selectedRental.slice(0, 2).map(convertToComparable);
  } else {
    // Use automatic selection - convert the returned Comparable[] to NeighborhoodComp[]
    const soldComps = filterSoldComparables(expandedProperties, arvValue, 2, true); // true = forReport
    const rentalCompsFromFilter = filterRentalComparables(expandedProperties, rentValue, 2, true); // true = forReport
    
    // Convert Comparable[] to NeighborhoodComp[]
    arvComps = soldComps.map(comp => ({
      type: 'Sold' as const,
      address: comp.address,
      price: comp.price,
      details: comp.details,
      date: comp.date || ''
    }));
    
    rentalComps = rentalCompsFromFilter.map(comp => ({
      type: 'Rental' as const,
      address: comp.address,
      price: comp.price,
      details: comp.details,
      date: comp.date || ''
    }));
  }

  return { arvComps, rentalComps };
};
