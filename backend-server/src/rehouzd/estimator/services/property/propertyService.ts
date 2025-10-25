import { Property } from '../../models/property/propertyModel';
import PropertyDistanceCalculator from '../../utils/geo/propertyDistanceCalculator';
import ComparablePropertiesHelper from '../../utils/property/comparablePropertiesHelper';
import parclLabsClient, { V2PropertySearchParams } from '../../utils/api/parclLabsClient';
import propertyRepository from '../../repositories/propertyRepository';
import parclLabsRepository from '../../repositories/parclLabsRepository';
import parclLabsBackgroundParser from '../../services/parclLabs/parclLabsBackgroundParser';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { UserSearchContext, generateSessionId } from '../../types/userActivity';
import { AxiosResponse } from 'axios';
import crypto from 'crypto';

interface AddressInfo {
  address: string;
  city: string;
  state_abbreviation: string;
  zip_code: string;
  lat: number;
  lon: number;
}

export class PropertyService {
  /**
   * Format the address object from API or frontend
   */
  formatAddress(addressObj: any): AddressInfo {
    try {
      const addressParts = addressObj.formattedAddress.split(',');
      const street = addressParts[0]?.trim().toUpperCase() || '';
      const city = addressParts[1]?.trim().replace(/\s+/g, '') || '';
      const stateZipParts = addressParts[2]?.trim().split(' ') || [];
      const state_abbreviation = stateZipParts[0] || '';
      const zip_code = stateZipParts[1] || '';
      const lat = addressObj.lat || 0;
      const lon = addressObj.lng || 0;
      
      return {
        address: street,
        city,
        state_abbreviation,
        zip_code,
        lat,
        lon
      };
    } catch (error: any) {
      logger.error('Error formatting address', { error: error.message, addressObj });
      throw new AppError('Invalid address format', 400);
    }
  }

  /**
   * Get user search history from database
   */
  async getUserSearchHistory(userId: number): Promise<any[]> {
    try {
      logger.debug('Getting search history for user', { userId });
      const searchHistory = await propertyRepository.getUserSearchHistory(userId);
      return searchHistory;
    } catch (error: any) {
      logger.error('Failed to get user search history', { 
        error: error.message,
        userId 
      });
      throw new AppError(`Failed to get search history: ${error.message}`, 500);
    }
  }

  /**
   * Get v2 property search params based on property details and coordinates
   */
  getV2PropertySearchParams(property: any, lat: number, lon: number, radius: number = 1.0, fallbackMode: boolean = false): V2PropertySearchParams {
    const { minEventDate, maxEventDate } = this.getDateRange(12);


    
    // Determine bed/bath ranges based on fallback mode
    let minBeds, maxBeds, minBaths, maxBaths, minSqft, maxSqft;
    
    if (fallbackMode) {
      // Fallback mode: Min bed/bath -1, max bed/bath +1, sqft 50%-150%, radius 1.0
      minBeds = Math.max(1, (property.bedrooms > 0 ? property.bedrooms - 1 : 2));
      maxBeds = (property.bedrooms > 0 ? property.bedrooms + 1 : 4);
      minBaths = Math.max(1, Math.floor(property.bathrooms) - 1 || 0);
      maxBaths = Math.floor(property.bathrooms) + 1 || 2;
      minSqft = property.square_footage ? Math.floor(property.square_footage * 0.50) : 300;
      maxSqft = property.square_footage ? Math.ceil(property.square_footage * 1.50) : 1550;
      radius = 1.0; // Always use 1.0 miles in fallback mode
    } else {
      // Normal mode: sqft 70%-130%
      minBeds = property.bedrooms > 0 ? property.bedrooms : 3;
      maxBeds = property.bedrooms > 0 ? property.bedrooms : 3;
      minBaths = Math.floor(property.bathrooms) || 1;
      maxBaths = Math.floor(property.bathrooms) || 1;
      minSqft = property.square_footage ? Math.floor(property.square_footage * 0.70) : 800;
      maxSqft = property.square_footage ? Math.ceil(property.square_footage * 1.30) : 1050;
    }
    
    return {
      geo_coordinates: {
        latitude: lat,
        longitude: lon,
        radius: radius
      },
      property_filters: {
        property_types: ['SINGLE_FAMILY', 'OTHER'],
        min_beds: minBeds,
        max_beds: maxBeds,
        min_baths: minBaths,
        max_baths: maxBaths,
        min_sqft: minSqft,
        max_sqft: maxSqft,
      },
      event_filters: {
        event_names: ['SOLD', 'LISTED_RENT', 'RENTAL_PRICE_CHANGE'],
        min_event_date: minEventDate,
        max_event_date: maxEventDate
      }
    };
  }

  /**
   * Generate request hash for deduplication
   */
  private generateRequestHash(endpoint: string, params: any): string {
    const hashInput = `${endpoint}:${JSON.stringify(params)}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
  }

  /**
   * Store raw API response asynchronously
   */
  private async storeRawResponse(
    endpoint: string,
    requestParams: any,
    response: AxiosResponse,
    sessionId: string,
    userId?: number,
    targetPropertyId?: string
  ): Promise<void> {
    try {
      const requestHash = this.generateRequestHash(endpoint, requestParams);

      // Store raw response immediately (fast operation)
      const rawResponseId = await parclLabsRepository.saveRawResponse({
        request_hash: requestHash,
        api_endpoint: endpoint,
        request_params: requestParams,
        raw_response: response.data,
        response_status: response.status,
        search_session_id: sessionId,
        user_id: userId,
        target_property_id: targetPropertyId
      });

      logger.debug('Stored raw Parcl Labs response', {
        rawResponseId,
        endpoint,
        sessionId,
        requestHash: requestHash.substring(0, 16) + '...'
      });

      // Trigger background parsing (fire-and-forget)
      this.triggerAsyncParsing(rawResponseId, sessionId);

    } catch (error: any) {
      logger.error('Failed to store raw response', {
        endpoint,
        sessionId,
        error: error.message
      });
      // Don't throw - this shouldn't block the main API response
    }
  }

  /**
   * Trigger background parsing without blocking
   */
  private triggerAsyncParsing(rawResponseId: number, sessionId: string): void {
    // Fire-and-forget: let it run in background
    setImmediate(() => {
      try {
        parclLabsBackgroundParser.parseAndStore(rawResponseId, sessionId);
      } catch (error: any) {
        logger.error('Failed to trigger background parsing', {
          rawResponseId,
          sessionId,
          error: error.message
        });
      }
    });
  }

  /**
   * Get date range for property search
   */
  getDateRange(months: number = 12): { minEventDate: string; maxEventDate: string } {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setMonth(today.getMonth() - months);

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    };

    return {
      minEventDate: formatDate(pastDate),
      maxEventDate: formatDate(today)
    };
  }

  /**
   * Get property and market data
   */
  async getPropertyAndMarketData(addressInput: any, userContext?: UserSearchContext): Promise<any> {
    try {
      // Extract address from the input (which may contain additional properties like updatedPropertyDetails)
      const addressObj = addressInput.address || addressInput;
      
      // Format the address
      const { address, city, zip_code, state_abbreviation, lat, lon } = this.formatAddress(addressObj);
      logger.info('Processing property data request', { address, city, state_abbreviation });

      // Generate session ID early for raw response storage
      const sessionId = userContext?.sessionId || generateSessionId();

      // Get address data first
      const addressDataResponse = await parclLabsClient.searchAddress([{ address, city, state_abbreviation, zip_code }]);
      const addressData = addressDataResponse.data;

      // Store raw address response asynchronously (non-blocking)
      this.storeRawResponse(
        'search_address',
        { addresses: [{ address, city, state_abbreviation, zip_code }] },
        addressDataResponse,
        sessionId,
        userContext?.userId
      );

      if (!addressData.items?.length) {
        logger.warn('No property data found', { address, city, state_abbreviation });
        throw new AppError('Could not retrieve property data', 404);
      }

      // Extract property details
      const propertyDetails = addressData.items[0];
      
      // Check if updated property details are provided
      if (addressInput.updatedPropertyDetails) {
        logger.info('Using updated property details', { 
          original: {
            bedrooms: propertyDetails.bedrooms,
            bathrooms: propertyDetails.bathrooms,
            square_footage: propertyDetails.square_footage,
            year_built: propertyDetails.year_built
          },
          updated: addressInput.updatedPropertyDetails
        });
        
        // Override property details with updated values
        propertyDetails.bedrooms = addressInput.updatedPropertyDetails.bedrooms;
        propertyDetails.bathrooms = addressInput.updatedPropertyDetails.bathrooms;
        propertyDetails.square_footage = addressInput.updatedPropertyDetails.square_footage;
        propertyDetails.year_built = addressInput.updatedPropertyDetails.year_built;
      }
      
      // Check if property is a single-family home
      if (propertyDetails.property_type && (propertyDetails.property_type !== 'SINGLE_FAMILY' 
                                            && propertyDetails.property_type !== 'OTHER')) {
        logger.info('Non-single family home detected', { 
          propertyType: propertyDetails.property_type,
          address: propertyDetails.address 
        });
        
        // Return early with target property and empty comparables
        return {
          targetProperty: propertyDetails,
          comparableProperties: [],
          allProperties: [],
          radiusUsed: 0,
          monthsUsed: 0,
          usedFallbackCriteria: false
        };
      }
      
      // Save property data
      const property = new Property(
        0,
        propertyDetails.parcl_property_id || '',
        propertyDetails.address || '',
        propertyDetails.city || '',
        propertyDetails.state_abbreviation || '',
        propertyDetails.county || '',
        propertyDetails.zip_code || '',
        parseFloat(propertyDetails.bathrooms) || 0,
        Math.floor(parseFloat(propertyDetails.bedrooms) || 0),
        parseFloat(propertyDetails.square_footage) || 0,
        parseInt(propertyDetails.year_built) || 0,
        parseFloat(propertyDetails.latitude) || 0,
        parseFloat(propertyDetails.longitude) || 0,
        propertyDetails.current_entity_owner_name || ''
      );

      try {
        await propertyRepository.savePropertyData(
          property,
          null, // salePrice
          userContext?.userId,
          sessionId,
          userContext?.searchType || 'property_details',
          userContext?.searchSource || 'web_app'
        );
        
        logger.info('Property data saved with user tracking', {
          address: property.address,
          userId: userContext?.userId,
          sessionId: sessionId
        });
      } catch (error) {
        console.error('Failed to save property data:', error);
      }
      
 
      const latitude = lat || parseFloat(propertyDetails.latitude) || 0;
      const longitude = lon || parseFloat(propertyDetails.longitude) || 0;
      
      if (!latitude || !longitude) {
        throw new AppError('Could not determine property coordinates for search', 400);
      }
      
      // First attempt with normal search criteria
      let v2SearchParams = this.getV2PropertySearchParams(propertyDetails, latitude, longitude, 1.0, false);
      let usedFallbackCriteria = false;

      // console.log('v2SearchParams...', v2SearchParams);
      
      
      let propertySearchResponse = await parclLabsClient.searchPropertiesWithEvents(v2SearchParams);

      // Store raw comparable properties response asynchronously (non-blocking)
      this.storeRawResponse(
        'search_properties_with_events',
        v2SearchParams,
        propertySearchResponse,
        sessionId,
        userContext?.userId,
        propertyDetails.parcl_property_id
      );
      
      // If no data found, try fallback criteria
      if (!propertySearchResponse.data.data || propertySearchResponse.data.data.length === 0) {
        logger.warn('No comparable properties found in normal search, trying fallback criteria', { 
          address: property.address,
          lat: latitude,
          lon: longitude
        });
        
        // Try with fallback criteria: Min bed/bath -1, max bed/bath +1, sqft +-500, radius 1.0
        v2SearchParams = this.getV2PropertySearchParams(propertyDetails, latitude, longitude, 1.0, true);

        propertySearchResponse = await parclLabsClient.searchPropertiesWithEvents(v2SearchParams);

        // Store raw fallback comparable properties response asynchronously (non-blocking)
        this.storeRawResponse(
          'search_properties_with_events',
          v2SearchParams,
          propertySearchResponse,
          sessionId,
          userContext?.userId,
          propertyDetails.parcl_property_id
        );
        
        if (propertySearchResponse.data.data && propertySearchResponse.data.data.length > 0) {
          usedFallbackCriteria = true;
          logger.info('Found properties using fallback criteria', {
            count: propertySearchResponse.data.data.length,
            address: property.address
          });
        } else {
          logger.warn('No comparable properties found even with fallback criteria', { 
            address: property.address,
            lat: latitude,
            lon: longitude
          });
          
          return {
            targetProperty: propertyDetails,
            comparableProperties: [],
            allProperties: [],
            radiusUsed: v2SearchParams.geo_coordinates.radius,
            monthsUsed: 6,
            usedFallbackCriteria: false
          };
        }
      }

      const v2Properties = propertySearchResponse.data.data.map((item: any) => {
        return {
          parcl_property_id: item.parcl_property_id,
          address: item.property_metadata.address1,
          city: item.property_metadata.city,
          state_abbreviation: item.property_metadata.state,
          zip_code: item.property_metadata.zip5,
          bathrooms: item.property_metadata.bathrooms,
          bedrooms: item.property_metadata.bedrooms,
          square_footage: item.property_metadata.sq_ft,
          year_built: item.property_metadata.year_built,
          property_type: item.property_metadata.property_type,
          latitude: item.property_metadata.latitude,
          longitude: item.property_metadata.longitude
        };
      });
      
      const v2EventHistory = {
        items: propertySearchResponse.data.data.flatMap((item: any) => {
          return item.events.map((event: any) => {
            return {
              parcl_property_id: item.parcl_property_id,
              event_type: event.event_type,
              event_name: event.event_name,
              event_date: event.event_date,
              price: event.price,
              entity_owner_name: event.entity_owner_name,
              true_sale_index: event.true_sale_index,
              investor_flag: event.investor_flag,
              owner_occupied_flag: event.owner_occupied_flag
            };
          });
        })
      };


      // Tag outliers in sold properties (keep all data but mark outliers)
      const taggedEventHistory = this.tagEventHistoryOutliers(v2EventHistory);
    
      
      // Calculate neighborhood properties
      const distanceCalculator = new PropertyDistanceCalculator(
        { items: [propertyDetails] }, 
        { items: v2Properties }
      );

      
      const neighborhoodProperties = distanceCalculator.calculatePropertiesWithinRadius(1.0);
      
      // Find comparable properties using the helper with tagged event history
      const comparableHelper = new ComparablePropertiesHelper(propertyDetails);
      const comparablePropertiesResult = comparableHelper.findComparableProperties(
        neighborhoodProperties,
        taggedEventHistory
      );
      
      logger.info('Comparable properties analysis completed', {
        count: comparablePropertiesResult.properties.length,
        radiusUsed: comparablePropertiesResult.radiusUsed,
        monthsUsed: comparablePropertiesResult.monthsUsed,
        usedFallbackCriteria
      });
      
      // Return target property, comparable properties, and all properties within radius
      return {
        targetProperty: propertyDetails,
        comparableProperties: comparablePropertiesResult.properties.map(comp => {
          const isOutlier = comp.eventDetails?.isOutlier || false;
          const displayAddress = isOutlier ? `${comp.property.address} (Outlier)` : comp.property.address;
          
          // Create unique ID by combining property ID with event type
          const eventTypeSuffix = comp.eventDetails.event_type === 'SALE' ? '-sale' : '-rental';
          const uniqueId = `${comp.property.parcl_property_id}${eventTypeSuffix}`;
          
          return {
            ...comp.property,
            id: uniqueId,
            address: displayAddress,
            eventDetails: comp.eventDetails,
            price: comp.eventDetails.price,
            distance: comp.distanceInMiles,
            isOutlier: isOutlier
          };
        }),
        allProperties: neighborhoodProperties.map(prop => {
          // Find the latest SALE event for this property from tagged event history
          const latestSaleEvent = taggedEventHistory.items
            .filter((event: any) => 
              String(event.parcl_property_id) === String(prop.parcl_property_id) &&
              event.event_type === 'SALE' &&
              event.event_name === 'SOLD'
            )
            .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())[0];
          
          // Find the latest RENTAL event for this property from tagged event history
          const latestRentalEvent = taggedEventHistory.items
            .filter((event: any) => 
              String(event.parcl_property_id) === String(prop.parcl_property_id) &&
              event.event_type === 'RENTAL' &&
              (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE')
            )
            .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())[0];


          
          // Calculate distance from target property
          const distance = this.calculateDistance(
            parseFloat(propertyDetails.latitude) || 0,
            parseFloat(propertyDetails.longitude) || 0,
            prop.latitude,
            prop.longitude
          );
          
          // Add outlier tag to address if any event for this property is an outlier
          const isOutlier = latestSaleEvent?.isOutlier || latestRentalEvent?.isOutlier || false;
          const displayAddress = isOutlier ? `${prop.address} (Outlier)` : prop.address;
          
          const finalProperty = {
            ...prop,
            address: displayAddress,
            // Include both sale and rental event information
            eventDetails: latestSaleEvent || latestRentalEvent || null,
            price: latestSaleEvent?.price || latestRentalEvent?.price || null,
            lastSalePrice: latestSaleEvent?.price || null,
            lastSaleDate: latestSaleEvent?.event_date || null,
            lastRentalPrice: latestRentalEvent?.price || null,
            lastRentalDate: latestRentalEvent?.event_date || null,
            rentalStatus: latestRentalEvent?.event_name || null,
            distance: distance,
            isOutlier: isOutlier
          };



          return finalProperty;
        }), // Include all properties, even those without event details
        radiusUsed: comparablePropertiesResult.radiusUsed,
        monthsUsed: comparablePropertiesResult.monthsUsed,
        usedFallbackCriteria
      };
      
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Error in getPropertyAndMarketData', { error: error.message });
      throw new AppError(`Error fetching property data: ${error.message}`, 500);
    }
  }

  /**
   * Tag event history outliers using median-based approach
   * Tags sold and rental properties that are more than 2.5x the median price as outliers for display
   * 
   * @param eventHistory Event history containing all property events
   * @returns Event history with outliers tagged (not removed)
   */
  private tagEventHistoryOutliers(eventHistory: any): any {
    // Get sold events with valid prices
    const soldEvents = eventHistory.items.filter((event: any) => 
      (event.event_type === 'SALE' || event.event_name === 'SOLD') &&
      event.price !== null && 
      event.price !== undefined
    );

    // Get rental events with valid prices
    const rentalEvents = eventHistory.items.filter((event: any) => 
      (event.event_type === 'RENTAL' && (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE')) &&
      event.price !== null && 
      event.price !== undefined
    );

    // Calculate sold outlier threshold
    let soldUpperBound = Infinity;
    if (soldEvents.length >= 3) {
      const soldPrices = soldEvents.map((event: any) => event.price).sort((a: number, b: number) => a - b);
      const soldMedian = soldPrices[Math.floor(soldPrices.length / 2)];
      soldUpperBound = soldMedian * 2.5;
    }

    // Calculate rental outlier threshold
    let rentalUpperBound = Infinity;
    if (rentalEvents.length >= 3) {
      const rentalPrices = rentalEvents.map((event: any) => event.price).sort((a: number, b: number) => a - b);
      const rentalMedian = rentalPrices[Math.floor(rentalPrices.length / 2)];
      rentalUpperBound = rentalMedian * 2.5;
    }

    // If no events can be filtered, return all as non-outliers
    if (soldEvents.length < 3 && rentalEvents.length < 3) {
      return {
        items: eventHistory.items.map((event: any) => ({ ...event, isOutlier: false }))
      };
    }
    
    // Tag events as outliers instead of removing them
    const taggedItems = eventHistory.items.map((event: any) => {
      let isOutlier = false;

      // Check if this is a sold event above the sold upper bound
      if ((event.event_type === 'SALE' || event.event_name === 'SOLD') &&
          event.price !== null && 
          event.price !== undefined && 
          event.price > soldUpperBound) {
        isOutlier = true;
      }

      // Check if this is a rental event above the rental upper bound
      if ((event.event_type === 'RENTAL' && (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE')) &&
          event.price !== null && 
          event.price !== undefined && 
          event.price > rentalUpperBound) {
        isOutlier = true;
      }
      
      return {
        ...event,
        isOutlier: isOutlier
      };
    });
    
    const soldOutlierCount = taggedItems.filter((event: any) => 
      event.isOutlier && (event.event_type === 'SALE' || event.event_name === 'SOLD')
    ).length;
    
    const rentalOutlierCount = taggedItems.filter((event: any) => 
      event.isOutlier && (event.event_type === 'RENTAL' && (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE'))
    ).length;
    
    return {
      items: taggedItems
    };
  }

  /**
   * Calculate distance between two points using haversine formula
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusMiles = 3958.8;
    
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.degreesToRadians(lat1)) *
      Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMiles * c;
  }

  /**
   * Convert degrees to radians
   */
  degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new PropertyService(); 