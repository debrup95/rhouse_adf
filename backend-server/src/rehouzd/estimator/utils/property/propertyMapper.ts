import { GeoProperty } from '../geo/propertyDistanceCalculator';
import { ComparableProperty, ComparablePropertiesResult, EventHistoryItem } from './comparablePropertiesHelper';
import { EnrichedPropertyModel, PropertyAnalysisResponse } from '../../interfaces/propertyModels';
import logger from '../logger';

/**
 * Utility class to map property data to enriched models
 */
class PropertyMapper {
  /**
   * Create an enriched property model from a geo property
   */
  createEnrichedProperty(
    property: GeoProperty,
    originProperty: GeoProperty,
    isComparable: boolean = false,
    saleEvent?: EventHistoryItem,
    rentalEvent?: EventHistoryItem
  ): EnrichedPropertyModel {
    const distance = this.calculateDistance(
      originProperty.latitude, 
      originProperty.longitude,
      property.latitude, 
      property.longitude
    );

    return {
      parcl_property_id: String(property.parcl_property_id || ''),
      address: property.address || '',
      city: property.city || '',
      state: property.state_abbreviation || '',
      zip_code: property.zip_code || '',
      county: property.county || '',
      
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      square_footage: property.square_footage || 0,
      year_built: property.year_built || 0,
      lot_size_sqft: property.lot_size_sqft,
      property_type: property.property_type || 'UNKNOWN',
      
      latitude: property.latitude,
      longitude: property.longitude,
      distanceFromTarget: distance,
      
      lastSalePrice: saleEvent?.price,
      lastSaleDate: saleEvent?.event_date,
      daysOnMarket: saleEvent?.days_on_market,
      
      lastRentalPrice: rentalEvent?.price,
      lastRentalDate: rentalEvent?.event_date,
      rentalStatus: rentalEvent?.event_name,
      
      isComparable,
      
      rawPropertyData: property,
      saleEvent,
      rentalEvent
    };
  }
  
  /**
   * Create the full property analysis response
   */
  createPropertyAnalysisResponse(
    targetProperty: GeoProperty,
    neighborhoodProperties: GeoProperty[],
    comparablePropertiesResult: ComparablePropertiesResult,
    eventHistory: EventHistoryItem[]
  ): PropertyAnalysisResponse {
    logger.debug('Creating property analysis response', {
      neighborhoodCount: neighborhoodProperties.length,
      comparablesCount: comparablePropertiesResult.properties.length,
      eventsCount: eventHistory.length
    });
    
    // Create maps for both sale and rental events for quick lookups
    const propertySaleEventMap = new Map<string, EventHistoryItem>();
    const propertyRentalEventMap = new Map<string, EventHistoryItem>();
    
    eventHistory.forEach(event => {
      const propertyId = String(event.parcl_property_id);
      
      // Store latest SOLD events
      if (event.event_type === 'SALE' && event.event_name === 'SOLD') {
        const existingEvent = propertySaleEventMap.get(propertyId);
        if (!existingEvent || new Date(event.event_date) > new Date(existingEvent.event_date)) {
          propertySaleEventMap.set(propertyId, event);
        }
      }
      
      // Store latest RENTAL events
      if (event.event_type === 'RENTAL' && (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE')) {
        const existingEvent = propertyRentalEventMap.get(propertyId);
        if (!existingEvent || new Date(event.event_date) > new Date(existingEvent.event_date)) {
          propertyRentalEventMap.set(propertyId, event);
        }
      }
    });
    
    // Create a set of comparable property IDs for quick lookups
    const comparablePropertyIds = new Set(
      comparablePropertiesResult.properties.map(comp => 
        String(comp.property.parcl_property_id)
      )
    );
    
    // Create enriched models for all neighborhood properties
    const enrichedNeighborhoodProperties = neighborhoodProperties.map(property => {
      const propertyId = String(property.parcl_property_id || '');
      const isComparable = comparablePropertyIds.has(propertyId);
      const saleEvent = propertySaleEventMap.get(propertyId);
      const rentalEvent = propertyRentalEventMap.get(propertyId);
      
      return this.createEnrichedProperty(
        property,
        targetProperty,
        isComparable,
        saleEvent,
        rentalEvent
      );
    });
    
    // Create enriched models for comparable properties only
    const enrichedComparableProperties = enrichedNeighborhoodProperties
      .filter(property => property.isComparable)
      .sort((a, b) => a.distanceFromTarget - b.distanceFromTarget);
    
    // Create the target property model
    const targetPropertyId = String(targetProperty.parcl_property_id || '');
    const enrichedTargetProperty = this.createEnrichedProperty(
      targetProperty, 
      targetProperty,
      false,
      propertySaleEventMap.get(targetPropertyId),
      propertyRentalEventMap.get(targetPropertyId)
    );
    
    // Calculate statistics
    const pricePerSqftValues = enrichedComparableProperties
      .filter(p => p.lastSalePrice && p.square_footage)
      .map(p => (p.lastSalePrice as number) / p.square_footage)
      .sort((a, b) => a - b);
    
    const averagePricePerSqft = pricePerSqftValues.length > 0
      ? pricePerSqftValues.reduce((sum, value) => sum + value, 0) / pricePerSqftValues.length
      : 0;
    
    const medianPricePerSqft = pricePerSqftValues.length > 0
      ? this.calculateMedian(pricePerSqftValues)
      : 0;
    
    return {
      targetProperty: enrichedTargetProperty,
      neighborhoodProperties: enrichedNeighborhoodProperties,
      comparableProperties: enrichedComparableProperties,
      analysisMetadata: {
        radiusUsed: comparablePropertiesResult.radiusUsed,
        monthsUsed: comparablePropertiesResult.monthsUsed,
        totalPropertiesFound: enrichedNeighborhoodProperties.length,
        comparablePropertiesFound: enrichedComparableProperties.length,
        medianPricePerSqft,
        averagePricePerSqft,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Calculate the distance between two points using haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Calculate the median of an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sortedValues.length / 2);
    
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }
}

export default new PropertyMapper(); 