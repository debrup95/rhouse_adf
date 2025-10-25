/**
 * Utility functions for filtering comparable properties based on underwrite values
 */

interface Property {
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
  [key: string]: any;
}

interface Comparable {
  type: string;
  address: string;
  price: string;
  details: string;
  date?: string;
}

/**
 * Filter and select the best comparable properties for rental listings (for reports only)
 * Shows the lowest rental comp + the next higher priced comp
 * @param properties Array of all properties from the table
 * @param targetRentValue The rent value from the underwrite sliders (not used in report mode)
 * @param maxCount Maximum number of comparables to return (default: 2)
 * @param forReport Whether this is for report generation (uses different logic)
 * @returns Array of selected rental comparables
 */
export function filterRentalComparables(
  properties: Property[],
  targetRentValue: number,
  maxCount: number = 2,
  forReport: boolean = false
): Comparable[] {

  // Report-specific logic: Show closest rental comp + next higher/lower priced comp
  if (forReport) {    
    // Filter for rental properties only
    const rentalProperties = properties.filter(prop => {
      // Exclude outliers - check both address string and isOutlier property
      const isNotOutlier = !prop.address?.includes('Outlier') && !prop.address?.includes('outlier') && !prop.isOutlier;
      
      // Check if this is a rental property based on event details
      const isRentalEvent = prop.eventDetails && 
        prop.eventDetails.event_type === 'RENTAL' && 
        (prop.eventDetails.event_name === 'LISTED_RENT' || prop.eventDetails.event_name === 'PRICE_CHANGE');
      
      // Also check direct properties (fallback)
      const isRentalProperty = prop.event_type === 'RENTAL' || 
        prop.event_name === 'LISTED_RENT' || 
        prop.event_name === 'PRICE_CHANGE' ||
        prop.status === 'LISTED_RENT';
      
      // Must have rent value (check both rent and price fields)
      const hasRentValue = (prop.rent && prop.rent > 0) || (prop.price && prop.price > 0);
      
      return isNotOutlier && (isRentalEvent || isRentalProperty) && hasRentValue;
    });

    // If we have 2 or fewer, return all
    if (rentalProperties.length <= maxCount) {
      return rentalProperties.map(prop => ({
        type: 'RENTAL',
        address: prop.address || 'Address N/A',
        price: `${formatCurrency(prop.rent || prop.price || 0)}/mo`,
        details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
        date: formatDate(prop.soldDate || prop.date)
      }));
    }

    const selectedProperties: Property[] = [];

    // Step 1: Find the comp closest to target rent value
    const closestToTarget = rentalProperties.reduce((closest, current) => {
      const currentValue = current.rent || current.price || 0;
      const closestValue = closest.rent || closest.price || 0;
      
      const currentDiff = Math.abs(currentValue - targetRentValue);
      const closestDiff = Math.abs(closestValue - targetRentValue);
      
      if (currentDiff < closestDiff) {
        return current;
      }
      // If same difference, use distance as tie-breaker
      if (currentDiff === closestDiff) {
        return (current.distance || 0) < (closest.distance || 0) ? current : closest;
      }
      return closest;
    });
    
    selectedProperties.push(closestToTarget);
    

    // Step 2: Find next higher priced comp, or if none, next lower
    const remainingProperties = rentalProperties.filter(prop => prop.id !== closestToTarget.id);
    const closestValue = closestToTarget.rent || closestToTarget.price || 0;
    
    // Try to find next higher priced comp
    const higherComps = remainingProperties.filter(prop => {
      const propValue = prop.rent || prop.price || 0;
      return propValue > closestValue;
    });
    
    if (higherComps.length > 0) {
      // Find the lowest among higher comps (next higher)
      const nextHigher = higherComps.reduce((lowest, current) => {
        const currentValue = current.rent || current.price || 0;
        const lowestValue = lowest.rent || lowest.price || 0;
        
        if (currentValue < lowestValue) {
          return current;
        }
        // If same value, use distance as tie-breaker
        if (currentValue === lowestValue) {
          return (current.distance || 0) < (lowest.distance || 0) ? current : lowest;
        }
        return lowest;
      });
      
      selectedProperties.push(nextHigher);
      
    } else {
      // No higher comps, find next lower
      const lowerComps = remainingProperties.filter(prop => {
        const propValue = prop.rent || prop.price || 0;
        return propValue < closestValue;
      });
      
      if (lowerComps.length > 0) {
        // Find the highest among lower comps (next lower)
        const nextLower = lowerComps.reduce((highest, current) => {
          const currentValue = current.rent || current.price || 0;
          const highestValue = highest.rent || highest.price || 0;
          
          if (currentValue > highestValue) {
            return current;
          }
          // If same value, use distance as tie-breaker
          if (currentValue === highestValue) {
            return (current.distance || 0) < (highest.distance || 0) ? current : highest;
          }
          return highest;
        });
        
        selectedProperties.push(nextLower);
        
      }
    }

    return selectedProperties.map(prop => ({
      type: 'RENTAL',
      address: prop.address || 'Address N/A',
      price: `${formatCurrency(prop.rent || prop.price || 0)}/mo`,
      details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
      date: formatDate(prop.soldDate || prop.date)
    }));
  }

  // Filter for rental properties only
  const rentalProperties = properties.filter(prop => {
    // Exclude outliers - check both address string and isOutlier property
    const isNotOutlier = !prop.address?.includes('Outlier') && !prop.address?.includes('outlier') && !prop.isOutlier;
    
    // Check if this is a rental property based on event details
    const isRentalEvent = prop.eventDetails && 
      prop.eventDetails.event_type === 'RENTAL' && 
      (prop.eventDetails.event_name === 'LISTED_RENT' || prop.eventDetails.event_name === 'PRICE_CHANGE');
    
    // Also check direct properties (fallback)
    const isRentalProperty = prop.event_type === 'RENTAL' || 
      prop.event_name === 'LISTED_RENT' || 
      prop.event_name === 'PRICE_CHANGE' ||
      prop.status === 'LISTED_RENT';
    
    // Must have rent value (check both rent and price fields)
    const hasRentValue = (prop.rent && prop.rent > 0) || (prop.price && prop.price > 0);
    
    return isNotOutlier && (isRentalEvent || isRentalProperty) && hasRentValue;
  });


  // If we have 2 or fewer, return all
  if (rentalProperties.length <= maxCount) {
    return rentalProperties.map(prop => ({
      type: 'RENTAL',
      address: prop.address || 'Address N/A',
      price: `${formatCurrency(prop.rent || prop.price || 0)}/mo`,
      details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
      date: formatDate(prop.soldDate || prop.date)
    }));
  }

  const selectedProperties: Property[] = [];

  // First selection: Find properties with price matching target rent value
  const exactMatches = rentalProperties.filter(prop => 
    (prop.rent === targetRentValue) || (prop.price === targetRentValue)
  );
  
  
  if (exactMatches.length > 0) {
    // If multiple matches, use tie-breaking logic: distance -> square footage -> ID
    const bestMatch = exactMatches.reduce((min, current) => {
      // First tie-breaker: minimum distance
      if ((current.distance || 0) !== (min.distance || 0)) {
        return (current.distance || 0) < (min.distance || 0) ? current : min;
      }
      // Second tie-breaker: larger square footage
      if ((current.squareFootage || 0) !== (min.squareFootage || 0)) {
        return (current.squareFootage || 0) > (min.squareFootage || 0) ? current : min;
      }
      // Final tie-breaker: use ID for consistency
      return (current.id || '') < (min.id || '') ? current : min;
    });
    selectedProperties.push(bestMatch);

  }

  // Second selection: Find closest greater value, or if none, next minimum
  const remainingProperties = rentalProperties.filter(prop => 
    !selectedProperties.some(selected => selected.id === prop.id)
  );
  


  if (remainingProperties.length > 0) {
    // Try to find closest greater value (smallest value that's greater than target)
    const greaterValues = remainingProperties.filter(prop => {
      const propValue = prop.rent || prop.price || 0;
      return propValue > targetRentValue;
    });
    

    
    if (greaterValues.length > 0) {
      // Find the closest greater value with tie-breaking logic
      const closestGreater = greaterValues.reduce((min, current) => {
        // Get the actual rent/price value for comparison
        const currentValue = current.rent || current.price || 0;
        const minValue = min.rent || min.price || 0;
        
        // First tie-breaker: smallest rent/price
        if (currentValue !== minValue) {
          return currentValue < minValue ? current : min;
        }
        // Second tie-breaker: minimum distance
        if ((current.distance || 0) !== (min.distance || 0)) {
          return (current.distance || 0) < (min.distance || 0) ? current : min;
        }
        // Final tie-breaker: use ID for consistency
        return (current.id || '') < (min.id || '') ? current : min;
      });
      selectedProperties.push(closestGreater);

    } else {
      // If no greater values, find the closest values that are less than or equal to target
      const lessThanOrEqualValues = remainingProperties.filter(prop => {
        const propValue = prop.rent || prop.price || 0;
        return propValue <= targetRentValue;
      });
      
      if (lessThanOrEqualValues.length > 0) {
        // Sort by value (descending) to get closest to target first
        const sortedByValue = lessThanOrEqualValues.sort((a, b) => {
          const aValue = a.rent || a.price || 0;
          const bValue = b.rent || b.price || 0;
          
          // Primary sort: highest value first (closest to target)
          if (aValue !== bValue) {
            return bValue - aValue;
          }
          // Secondary sort: minimum distance
          return (a.distance || 0) - (b.distance || 0);
        });
        
        // Select the first one (closest to target)
        selectedProperties.push(sortedByValue[0]);
        
        // If we need a second property and there are more available
        if (selectedProperties.length < maxCount && sortedByValue.length > 1) {
          selectedProperties.push(sortedByValue[1]);

        }
      } else {
        // Fallback: if no values <= target, just take the minimum
        const sortedByPrice = remainingProperties.sort((a, b) => 
          (a.rent || a.price || 0) - (b.rent || b.price || 0)
        );
        selectedProperties.push(sortedByPrice[0]);
        
        // If we need a second property and there are more available
        if (selectedProperties.length < maxCount && sortedByPrice.length > 1) {
          selectedProperties.push(sortedByPrice[1]);
        }
      }
    }
  }

  // Convert to Comparable format
  return selectedProperties.map(prop => ({
    type: 'RENTAL',
    address: prop.address || 'Address N/A',
    price: `${formatCurrency(prop.rent || prop.price || 0)}/mo`,
    details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
    date: formatDate(prop.soldDate || prop.date)
  }));
}

/**
 * Filter and select the best comparable properties for sold listings (ARV)
 * @param properties Array of all properties from the table
 * @param targetARVValue The ARV value from the flip underwrite sliders
 * @param maxCount Maximum number of comparables to return (default: 2)
 * @returns Array of selected sold comparables
 */
export function filterSoldComparables(
  properties: Property[],
  targetARVValue: number,
  maxCount: number = 2,
  forReport: boolean = false
): Comparable[] {
  // Filter for sold properties only
  const soldProperties = properties.filter(prop => {
    // Exclude outliers - check both address string and isOutlier property
    const isNotOutlier = !prop.address?.includes('Outlier') && !prop.address?.includes('outlier') && !prop.isOutlier;
    
    // Check if this is a sold property based on event details
    const isSoldEvent = prop.eventDetails && 
      prop.eventDetails.event_type === 'SALE' && 
      prop.eventDetails.event_name === 'SOLD';
    
    // Also check direct properties (fallback)
    const isSoldProperty = prop.event_type === 'SALE' || 
      prop.event_name === 'SOLD' ||
      prop.status === 'SOLD';
    
    // Must have price value
    const hasPriceValue = prop.price && prop.price > 0;
    
    return isNotOutlier && (isSoldEvent || isSoldProperty) && hasPriceValue;
  });

  // Report-specific logic: Show closest sold comp + next higher/lower priced comp
  if (forReport) {
    // If we have 2 or fewer, return all
    if (soldProperties.length <= maxCount) {
      return soldProperties.map(prop => ({
        type: 'SOLD',
        address: prop.address || 'Address N/A',
        price: formatCurrency(prop.price || 0),
        details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
        date: formatDate(prop.soldDate || prop.date)
      }));
    }

    const selectedProperties: Property[] = [];

    // Step 1: Find the comp closest to target ARV value
    const closestToTarget = soldProperties.reduce((closest, current) => {
      const currentValue = current.price || 0;
      const closestValue = closest.price || 0;
      
      const currentDiff = Math.abs(currentValue - targetARVValue);
      const closestDiff = Math.abs(closestValue - targetARVValue);
      
      if (currentDiff < closestDiff) {
        return current;
      }
      // If same difference, use distance as tie-breaker
      if (currentDiff === closestDiff) {
        return (current.distance || 0) < (closest.distance || 0) ? current : closest;
      }
      return closest;
    });
    
    selectedProperties.push(closestToTarget);

    // Step 2: Find next higher priced comp, or if none, next lower
    const remainingProperties = soldProperties.filter(prop => prop.id !== closestToTarget.id);
    const closestValue = closestToTarget.price || 0;
    
    // Try to find next higher priced comp
    const higherComps = remainingProperties.filter(prop => {
      const propValue = prop.price || 0;
      return propValue > closestValue;
    });
    
    if (higherComps.length > 0) {
      // Find the lowest among higher comps (next higher)
      const nextHigher = higherComps.reduce((lowest, current) => {
        const currentValue = current.price || 0;
        const lowestValue = lowest.price || 0;
        
        if (currentValue < lowestValue) {
          return current;
        }
        // If same value, use distance as tie-breaker
        if (currentValue === lowestValue) {
          return (current.distance || 0) < (lowest.distance || 0) ? current : lowest;
        }
        return lowest;
      });
      
      selectedProperties.push(nextHigher);
    } else {
      // No higher comps, find next lower
      const lowerComps = remainingProperties.filter(prop => {
        const propValue = prop.price || 0;
        return propValue < closestValue;
      });
      
      if (lowerComps.length > 0) {
        // Find the highest among lower comps (next lower)
        const nextLower = lowerComps.reduce((highest, current) => {
          const currentValue = current.price || 0;
          const highestValue = highest.price || 0;
          
          if (currentValue > highestValue) {
            return current;
          }
          // If same value, use distance as tie-breaker
          if (currentValue === highestValue) {
            return (current.distance || 0) < (highest.distance || 0) ? current : highest;
          }
          return highest;
        });
        
        selectedProperties.push(nextLower);

      }
    } 

    return selectedProperties.map(prop => ({
      type: 'SOLD',
      address: prop.address || 'Address N/A',
      price: formatCurrency(prop.price || 0),
      details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
      date: formatDate(prop.soldDate || prop.date)
    }));
  }

  // Regular UI logic continues below
  // If we have 2 or fewer, return all
  if (soldProperties.length <= maxCount) {
    return soldProperties.map(prop => ({
      type: 'SOLD',
      address: prop.address || 'Address N/A',
      price: formatCurrency(prop.price || 0),
      details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
      date: formatDate(prop.soldDate || prop.date)
    }));
  }

  const selectedProperties: Property[] = [];

  // First selection: Find properties with price matching target ARV value
  const exactMatches = soldProperties.filter(prop => prop.price === targetARVValue);
  

  
  if (exactMatches.length > 0) {
    // If multiple matches, use tie-breaking logic: distance -> square footage -> ID
    const bestMatch = exactMatches.reduce((min, current) => {
      // First tie-breaker: minimum distance
      if ((current.distance || 0) !== (min.distance || 0)) {
        return (current.distance || 0) < (min.distance || 0) ? current : min;
      }
      // Second tie-breaker: larger square footage
      if ((current.squareFootage || 0) !== (min.squareFootage || 0)) {
        return (current.squareFootage || 0) > (min.squareFootage || 0) ? current : min;
      }
      // Final tie-breaker: use ID for consistency
      return (current.id || '') < (min.id || '') ? current : min;
    });
    selectedProperties.push(bestMatch);

  }

  // Second selection: Find closest greater value, or if none, next minimum
  const remainingProperties = soldProperties.filter(prop => 
    !selectedProperties.some(selected => selected.id === prop.id)
  );

  if (remainingProperties.length > 0) {
    // Try to find closest greater value
    const greaterValues = remainingProperties.filter(prop => prop.price! > targetARVValue);
    

    
    if (greaterValues.length > 0) {
      // Find the closest greater value with tie-breaking logic
      const closestGreater = greaterValues.reduce((min, current) => {
        // First tie-breaker: smallest price
        if ((current.price || 0) !== (min.price || 0)) {
          return (current.price || 0) < (min.price || 0) ? current : min;
        }
        // Second tie-breaker: minimum distance
        if ((current.distance || 0) !== (min.distance || 0)) {
          return (current.distance || 0) < (min.distance || 0) ? current : min;
        }
        // Final tie-breaker: use ID for consistency
        return (current.id || '') < (min.id || '') ? current : min;
      });
      selectedProperties.push(closestGreater);

    } else {
      // If no greater values, find the closest value that's less than or equal to target
      const lessThanOrEqualValues = remainingProperties.filter(prop => {
        const propValue = prop.price || 0;
        return propValue <= targetARVValue;
      });
      
      if (lessThanOrEqualValues.length > 0) {
        // Sort by value (descending) to get closest to target first
        const sortedByValue = lessThanOrEqualValues.sort((a, b) => {
          const aValue = a.price || 0;
          const bValue = b.price || 0;
          
          // Primary sort: highest value first (closest to target)
          if (aValue !== bValue) {
            return bValue - aValue;
          }
          // Secondary sort: minimum distance
          return (a.distance || 0) - (b.distance || 0);
        });
        
        // Select the first one (closest to target)
        selectedProperties.push(sortedByValue[0]);
        
        // If we need a second property and there are more available
        if (selectedProperties.length < maxCount && sortedByValue.length > 1) {
          selectedProperties.push(sortedByValue[1]);
        }
      } else {
        // Fallback: if no values <= target, just take the minimum
        const sortedByPrice = remainingProperties.sort((a, b) => (a.price || 0) - (b.price || 0));
        selectedProperties.push(sortedByPrice[0]);
        
        // If we need a second property and there are more available
        if (selectedProperties.length < maxCount && sortedByPrice.length > 1) {
          selectedProperties.push(sortedByPrice[1]);
        }
      }
    }
  }

  // Convert to Comparable format
  return selectedProperties.map(prop => ({
    type: 'SOLD',
    address: prop.address || 'Address N/A',
    price: formatCurrency(prop.price || 0),
    details: `${(prop.distance || 0).toFixed(1)} mi away | ${prop.bedrooms || 0}/${prop.bathrooms || 0} | ${prop.squareFootage || 0} sqft`,
    date: formatDate(prop.soldDate || prop.date)
  }));
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
}

/**
 * Format date for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  } catch (error) {
    return '';
  }
}
