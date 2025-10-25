/**
 * Utility function to calculate the offer range based on property condition and investment strategy
 */

interface RentValues {
  afterRepairValue: number;
  highRehab: number;
}

interface FlipValues {
  estimatedOffer: number;
  highRehab: number;
  holdingCosts: number;
}

interface BuyerEstimatedPriceResult {
  buyerEstimatedOffer: number;
}

/**
 * Calculates the buyer's estimated purchase price based on the provided values
 * 
 * @param strategy - The investment strategy ('rent' or 'flip')
 * @param isFixerProperty - Whether the property is a fixer-upper
 * @param isStandardProperty - Whether the property is standard condition
 * @param rentValues - Values for rental calculation
 * @param flipValues - Values for flip calculation
 * @returns An object with the buyer's estimated offer price
 */
export const calculateBuyerEstimatedPrice = (
  strategy: string,
  isFixerProperty: boolean,
  isStandardProperty: boolean,
  rentValues: RentValues,
  flipValues: FlipValues
): BuyerEstimatedPriceResult => {
  let buyerEstimatedOffer = 0;

  // Check if we have valid ARV for rental or estimatedOffer for flip
  // Return zero if the main values are zero or not provided
  if (strategy === 'rent' && (!rentValues.afterRepairValue || rentValues.afterRepairValue === 0)) {
    return { buyerEstimatedOffer: 0 };
  } else if (strategy === 'flip' && (!flipValues.estimatedOffer || flipValues.estimatedOffer === 0)) {
    return { buyerEstimatedOffer: 0 };
  }

  if (strategy === 'rent') {
    const { afterRepairValue } = rentValues;
    
    if (isFixerProperty) {
      const fixerOutdatedEstimatedOffer = (0.75 * afterRepairValue) - 
                                     ((flipValues.holdingCosts / 100) * afterRepairValue);
      buyerEstimatedOffer = fixerOutdatedEstimatedOffer - rentValues.highRehab;
    } else if (isStandardProperty) {
      // For standard properties, use the equity discount formula
      // Calculate total holding and closing cost (4% of ARV)
      const totalHoldingCost = afterRepairValue * 0.04;
      
      // Determine equity discount based on ARV
      let equityDiscount = 0;
      if (afterRepairValue < 150000) {
        equityDiscount = 0.15; // 15% discount
      } else if (afterRepairValue >= 150000 && afterRepairValue < 300000) {
        equityDiscount = 0.125; // 12.5% discount
      } else {
        equityDiscount = 0.10; // 10% discount
      }
      
      // Apply the formula: ARV*(1-Equity Discount) - rehab - total holding cost
      buyerEstimatedOffer = afterRepairValue * (1 - equityDiscount) - rentValues.highRehab - totalHoldingCost;
    } else {
      // For renovated properties, use the original formula
      buyerEstimatedOffer = afterRepairValue - rentValues.highRehab;
    }
  } else {
    // For flip strategy, use the estimatedOffer calculation
    buyerEstimatedOffer = flipValues.estimatedOffer - flipValues.highRehab;
  }
  
  // Ensure we don't return negative values
  return {
    buyerEstimatedOffer: Math.max(0, buyerEstimatedOffer)
  };
};

// Legacy function for backward compatibility
export const calculateOfferRange = (
  strategy: string,
  isFixerProperty: boolean,
  isStandardProperty: boolean,
  rentValues: RentValues,
  flipValues: FlipValues
): { low: number; high: number } => {
  const result = calculateBuyerEstimatedPrice(strategy, isFixerProperty, isStandardProperty, rentValues, flipValues);
  return {
    low: result.buyerEstimatedOffer,
    high: result.buyerEstimatedOffer
  };
};

export default calculateBuyerEstimatedPrice; 