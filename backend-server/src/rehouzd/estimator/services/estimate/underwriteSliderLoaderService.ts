import { Request, Response } from 'express';
import marketService from '../property/marketService';
import propertyConditionService from '../property/propertyConditionService';
import logger from '../../utils/logger';

/**
 * Interface for rent underwrite slider values
 */
interface RentUnderwriteValues {
  rent: number;
  expense: number;
  capRate: number;
  highRehab: number;
  defaultHighRehab: number;
  customHighRehab: number;
  isUsingCustomHighRehab: boolean;
}

/**
 * Interface for flip underwrite slider values
 */
interface FlipUnderwriteValues {
  sellingCosts: number;
  holdingCosts: number;
  margin: number;
  highRehab: number;
  afterRepairValue: number;
  defaultHighRehab: number;
  customHighRehab: number;
  isUsingCustomHighRehab: boolean;
}

/**
 * Interface for all underwrite slider values
 */
interface UnderwriteSliderValues {
  rent: RentUnderwriteValues;
  flip: FlipUnderwriteValues;
}

/**
 * Interface for a rental property
 */
interface RentalProperty {
  property_id?: string | number;
  price?: number;
  distance?: number;
  status?: string;
  event_type?: string;
  event_name?: string;
  isOutlier?: boolean;
}

/**
 * Interface for address data
 */
interface AddressData {
  city?: string;
  state?: string;
  state_abbreviation?: string;
  county?: string;
  zip?: string;
  zip_code?: string;
  condition?: string;
  square_footage?: number;
  [key: string]: any;
}

/**
 * Mock database data for underwrite slider values
 * This JSON mimics what would normally be fetched from a database
 * All values are set to 0 to ensure no default calculations occur
 */
const defaultUnderwriteValues: UnderwriteSliderValues = {
  rent: {
    rent: 0,
    expense: 0,
    capRate: 0,
    highRehab: 0,
    defaultHighRehab: 0,
    customHighRehab: 0,
    isUsingCustomHighRehab: true
  },
  flip: {
    sellingCosts: 0,
    holdingCosts: 0,
    margin: 0,
    highRehab: 0,
    afterRepairValue: 0,
    defaultHighRehab: 0,
    customHighRehab: 0,
    isUsingCustomHighRehab: true
  }
};

/**
 * Helper function to add no-cache headers to responses
 */
const addNoCacheHeaders = (res: Response): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

/**
 * Service for loading underwrite slider values
 */
class UnderwriteSliderLoaderService {
  /**
   * Get default underwrite slider values
   * @returns The default underwrite slider values
   */
  getDefaultUnderwriteValues(): UnderwriteSliderValues {
    console.log('inside getDefaultUnderwriteValues');
    return { ...defaultUnderwriteValues };
  }
  
  /**
   * Get market data for location
   * 
   * @param addressData The address data containing state, county, and zip code
   * @returns Market data with cap rate and operating expense
   */
  async getMarketData(addressData: AddressData | null): Promise<{
    cap_rate: number;
    operating_expense: number;
    reference_market: string;
  }> {
    if (!addressData) {
      logger.info('No address data provided, using zero market data');
      return {
        cap_rate: 0,
        operating_expense: 0,
        reference_market: 'Default'
      };
    }
    
    // Extract state, county, and zip code from address data
    const state = addressData.state_abbreviation || addressData.state || '';
    const county = addressData.county || '';
    const zipCode = addressData.zip_code || addressData.zip || '';
    
    if (!state || !county) {
      logger.warn('Missing state or county in address data', { state, county, zipCode });
      return {
        cap_rate: 0,
        operating_expense: 0,
        reference_market: 'Default'
      };
    }
    
    // Get market data from market service (now with zip code for granular cap rates)
    try {
      logger.info('Getting market data for location', { state, county, zipCode });
      const marketData = await marketService.getMarketUnderwriteInputs(state, county, zipCode);
      
      logger.info('Market data retrieved', {
        cap_rate: marketData.cap_rate,
        operating_expense: marketData.operating_expense,
        reference_market: marketData.reference_market
      });
      
      return marketData;
    } catch (error) {
      logger.error('Error getting market data', { error });
      return {
        cap_rate: 0,
        operating_expense: 0,
        reference_market: 'Default'
      };
    }
  }

  /**
   * Calculate rental values based on top rental properties
   * 
   * @param propertyId The ID of the main property
   * @param neighborhoodProperties Array of rental properties
   * @param addressData Address data for market information
   * @returns Rental values based on top rental properties and market data
   */
  async calculateRentalValues(
    propertyId: string, 
    neighborhoodProperties: RentalProperty[] = [],
    addressData: AddressData | null = null
  ): Promise<RentUnderwriteValues> {
    console.log(`Calculating rental values for property ${propertyId} using ${neighborhoodProperties.length} neighborhood properties`);
    // console.log('All neighborhood properties received:', neighborhoodProperties.map(p => ({
    //   price: p.price,
    //   status: p.status,
    //   event_type: p.event_type,
    //   event_name: p.event_name,
    //   isOutlier: p.isOutlier
    // })));
    
    // Filter to get only rental properties (excluding outliers for calculations)
    const rentalProperties = neighborhoodProperties.filter(prop => 
      (prop.status === 'LISTED_RENT' || 
       prop.event_type === 'RENTAL' || 
       prop.event_name === 'LISTED_RENT') &&
      !prop.isOutlier  // Exclude outliers from calculations
    );
    
    console.log(`Found ${rentalProperties.length} rental properties (excluding outliers)`);
    // console.log('Rental properties before sorting:', rentalProperties.map(p => ({
    //   price: p.price,
    //   status: p.status,
    //   event_type: p.event_type,
    //   event_name: p.event_name,
    //   isOutlier: p.isOutlier
    // })));
    
    // Default rental values in case we don't have enough data
    const defaultRentValues = this.getDefaultUnderwriteValues().rent;
    
    // If no rental properties, return default values
    if (rentalProperties.length === 0) {
      console.log('No rental properties found, using default values');
      return defaultRentValues;
    }
    
    // Sort rental properties by price (descending)
    const sortedRentals = [...rentalProperties].sort((a, b) => 
      (b.price || 0) - (a.price || 0)
    );
    
    // console.log(`Found ${sortedRentals.length} sorted rental properties for calculations`);
    
    // Debug: Log all rental prices to see the sorted array
    // console.log('Sorted rental prices (descending):', sortedRentals.map((r, i) => `[${i}]: $${r.price}`));
    
    let selectedRent = defaultRentValues.rent;
    if (sortedRentals.length > 0) {

      // Use 20th percentile approach (more conservative and scales with data size)
      const percentileIndex = Math.floor(sortedRentals.length * 0.20);
      // Ensure we don't go below index 0 and cap at the last index
      const safeIndex = Math.min(Math.max(percentileIndex, 0), sortedRentals.length - 1);
      // console.log(`Safe index calculation: Math.min(Math.max(${percentileIndex}, 0), ${sortedRentals.length - 1}) = ${safeIndex}`);
      
      selectedRent = sortedRentals[safeIndex].price || defaultRentValues.rent;
      // console.log(`Using 20th percentile rental price (index ${safeIndex} of ${sortedRentals.length}): $${selectedRent}`);
    } else {
      console.log(`No rental properties found, using default rent: $${selectedRent}`);
    }
    
    // Get market data for cap rate and operating expense
    const marketData = await this.getMarketData(addressData);
    console.log('Using market data:', marketData);
    
        
    // Calculate rehab costs based on property condition and square footage
    let rehabCosts = {
      highRehab: defaultRentValues.highRehab,
      condition: 'Default'
    };

    if (addressData?.condition && addressData?.square_footage) {
      try {
        rehabCosts = await propertyConditionService.calculateRehabCosts(
          addressData.condition,
          addressData.square_footage
        );
        console.log(`Calculated rehab costs based on condition '${rehabCosts.condition}' and ${addressData.square_footage} sqft:`, rehabCosts);
      } catch (error) {
        logger.error('Error calculating rehab costs, using defaults', { error });
      }
    } else {
      logger.info('Missing property condition or square footage, using default rehab costs', {
        condition: addressData?.condition,
        squareFootage: addressData?.square_footage
      });
    }
    
    // Use the calculated rent, expense, cap rate, and rehab costs
    return {
      rent: selectedRent,
      expense: marketData.operating_expense,
      capRate: marketData.cap_rate,
      highRehab: rehabCosts.highRehab,
      defaultHighRehab: rehabCosts.highRehab, // Store calculated value as default
      customHighRehab: 0, // Initialize with 0, will be set when user uses detailed calculator
      isUsingCustomHighRehab: true
      };
  }

  private async getCalculationReferenceData() {
    try {
      logger.info('Getting calculation reference values');
      const referenceData = await marketService.getMarketFlipCalculationInputs();
      return referenceData;
    } catch (error) {
      logger.error('Error getting market calculation reference data', { error });
      // Return zeros as defaults to prevent premature calculations
      return {
        interest_rate: 0,
        total_closing_holding_costs: 0,
        margin_percentage: 0,
        commission_rate: 0
      };
    }
  }



  /**
   * Calculate flip values based on property condition and market data
   * 
   * @param propertyId The ID of the main property
   * @param neighborhoodProperties Array of properties
   * @param addressData Address data containing property condition and square footage
   * @returns Flip underwrite values with selling costs, holding costs, margin, and rehab costs
   */
  async calculateFlipValues(
    propertyId: string,
    neighborhoodProperties: RentalProperty[] = [],
    addressData: AddressData | null = null
  ): Promise<FlipUnderwriteValues> {
    console.log(`Calculating sold values for property ${propertyId}`);

    // Default flip values in case we don't have enough data
    const defaultFlipValues = this.getDefaultUnderwriteValues().flip;
    
    // Filter to get only sold properties (excluding outliers for calculations)
    const soldProperties = neighborhoodProperties.filter(prop => 
      (prop.event_type === 'SALE' || 
       prop.event_name === 'SOLD' ||
       prop.status === 'SOLD') &&
      !prop.isOutlier  // Exclude outliers from calculations
    );
    
    console.log(`Found ${soldProperties.length} sold properties (excluding outliers)`);
    
    // If no sold properties, return default values
    if (soldProperties.length === 0) {
      console.log('No sold properties found, using default values');
      return defaultFlipValues;
    }
    
    // Sort sold properties by price (descending) - outliers already filtered in propertyService
    const sortedSoldProperties = [...soldProperties].sort((a, b) => 
      (b.price || 0) - (a.price || 0)
    );
    

    let selectedSold = 0; // Changed from 250000 to 0 to avoid default calculations
    if (sortedSoldProperties.length > 0) {
      // Use 20th percentile approach (same as rental properties)
      const percentileIndex = Math.floor(sortedSoldProperties.length * 0.20);
      console.log(`Sold percentile calculation: Math.floor(${sortedSoldProperties.length} * 0.20) = ${percentileIndex}`);
      
      // Ensure we don't go below index 0 and cap at the last index
      const safeIndex = Math.min(Math.max(percentileIndex, 0), sortedSoldProperties.length - 1);
      console.log(`Sold safe index calculation: Math.min(Math.max(${percentileIndex}, 0), ${sortedSoldProperties.length - 1}) = ${safeIndex}`);
      
      selectedSold = sortedSoldProperties[safeIndex].price || 0;
      console.log(`Selected sold property at index ${safeIndex}: $${sortedSoldProperties[safeIndex].price}`);
      console.log(`Using 20th percentile sold price (index ${safeIndex} of ${sortedSoldProperties.length}): $${selectedSold}`);
    } else {
      console.log(`No sold properties found, using default sold: $${selectedSold}`);
    }
    console.log(`Calculating flip values for property ${propertyId}`);
    
    
    // Get market calculation reference data for interest rate, holding costs, and margin
    const calculationReferenceData = await this.getCalculationReferenceData();
    // console.log('Using calculation reference data:', calculationReferenceData);
    
    // Calculate rehab costs based on property condition and square footage
    let rehabCosts = {
      highRehab: defaultFlipValues.highRehab,
      condition: 'Default'
    };
    
    
    if (addressData?.condition && addressData?.square_footage) {
      try {
        rehabCosts = await propertyConditionService.calculateRehabCosts(
          addressData.condition,
          addressData.square_footage
        );
        console.log(`Calculated rehab costs based on condition '${rehabCosts.condition}' and ${addressData.square_footage} sqft:`, rehabCosts);
      } catch (error) {
        logger.error('Error calculating rehab costs, using defaults', { error });
      }
    } else {
      logger.info('Missing property condition or square footage, using default rehab costs', {
        condition: addressData?.condition,
        squareFootage: addressData?.square_footage
      });
    }
   
    
    // Use the calculated values or defaults
    return {
      sellingCosts: calculationReferenceData.commission_rate || defaultFlipValues.sellingCosts,
      holdingCosts: calculationReferenceData.total_closing_holding_costs || defaultFlipValues.holdingCosts,
      margin: calculationReferenceData.margin_percentage || defaultFlipValues.margin,
      highRehab: rehabCosts.highRehab,
      afterRepairValue: selectedSold,
      defaultHighRehab: rehabCosts.highRehab, // Store calculated value as default
      customHighRehab: 0, // Initialize with 0, will be set when user uses detailed calculator
      isUsingCustomHighRehab: true
    };
  }

  /**
   * Get underwrite slider values for a specific property
   * In the future, this will query the database based on property ID
   * For now, it returns mock data with slight variations based on property ID
   * 
   * @param propertyId The ID of the property
   * @param neighborhoodProperties Optional array of neighborhood properties
   * @param addressData Optional address data for market calculations
   * @returns The underwrite slider values for the specified property
   */
  async getUnderwriteValuesForProperty(
    propertyId: string, 
    neighborhoodProperties: RentalProperty[] = [],
    addressData: AddressData | null = null
  ): Promise<UnderwriteSliderValues> {
    // Mimic a database delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Calculate rental values based on top rental properties and market data
    const rentalValues = await this.calculateRentalValues(propertyId, neighborhoodProperties, addressData);
    const flipValues = await this.calculateFlipValues(propertyId, neighborhoodProperties, addressData);
    
    // In a real implementation, we would query the database here
    // For now, return mock data with slight variations based on property ID
    
    // Use the last digit of the property ID to create variations
    const lastDigit = parseInt(propertyId.slice(-1)) || 0;
    const multiplier = 1 + (lastDigit / 20); // Create a multiplier between 1.0 and 1.45
    
    // Use rental values for rent, expense and cap rate, but calculate the rest
    return {
      rent: {
        ...rentalValues,
        defaultHighRehab: rentalValues.highRehab, // Store original backend value
        customHighRehab: 0, // Initialize with 0, will be set when user uses detailed calculator
        isUsingCustomHighRehab: true // Default to using backend value
      },
      flip: {
        ...flipValues,
        defaultHighRehab: flipValues.highRehab, // Store original backend value
        customHighRehab: 0, // Initialize with 0, will be set when user uses detailed calculator
        isUsingCustomHighRehab: true // Default to using backend value
      }
    };
  }

  /**
   * Save underwrite slider values for a specific property
   * In the future, this will save to the database
   * For now, it just logs the values
   * 
   * @param propertyId The ID of the property
   * @param values The underwrite slider values to save
   * @returns A success message
   */
  async saveUnderwriteValuesForProperty(
    propertyId: string, 
    values: UnderwriteSliderValues
  ): Promise<{ success: boolean; message: string }> {
    // Mimic a database delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real implementation, we would save to the database here
    // console.log(`Saving underwrite values for property ${propertyId}:`, JSON.stringify(values, null, 2));
    
    // Return success
    return {
      success: true,
      message: `Underwrite values for property ${propertyId} saved successfully`
    };
  }

  /**
   * Express route handler to get underwrite slider values
   */
  getUnderwriteValues = async (req: Request, res: Response): Promise<void> => {
    try {
      // Add no-cache headers
      addNoCacheHeaders(res);
      
      const propertyId = req.params.propertyId || req.query.propertyId as string;
      console.log(`Getting underwrite values for property: ${propertyId || 'default'}`);
      
      // Get neighborhood properties from request
      const neighborhoodProperties = 
        req.body?.neighborhoodProperties || 
        req.query?.neighborhoodProperties || 
        [];
        
      // Get address data from request
      const addressData = req.body?.addressData || req.query?.addressData || null;
      
      if (!propertyId) {
        // If no property ID is provided, return default values
        const defaultValues = this.getDefaultUnderwriteValues();
        console.log('Returning default values:', defaultValues);
        
        res.json({
          success: true,
          data: defaultValues
        });
        return;
      }
      
      // Get values for the specified property
      const values = await this.getUnderwriteValuesForProperty(propertyId, neighborhoodProperties, addressData);
      // console.log(`Returning values for property ${propertyId}:`, values);
      
      res.json({
        success: true,
        data: values
      });
    } catch (error) {
      console.error('Error fetching underwrite values:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load underwrite values',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Express route handler to save underwrite slider values
   */
  saveUnderwriteValues = async (req: Request, res: Response): Promise<void> => {
    try {
      // Add no-cache headers
      addNoCacheHeaders(res);
      
      const { propertyId, values } = req.body;
      // console.log(`Request to save underwrite values for property ${propertyId}:`, values);
      
      if (!propertyId) {
        res.status(400).json({
          success: false,
          message: 'Property ID is required'
        });
        return;
      }
      
      if (!values) {
        res.status(400).json({
          success: false,
          message: 'Underwrite values are required'
        });
        return;
      }
      
      // Save values for the specified property
      const result = await this.saveUnderwriteValuesForProperty(propertyId, values);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error saving underwrite values:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save underwrite values',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default new UnderwriteSliderLoaderService(); 