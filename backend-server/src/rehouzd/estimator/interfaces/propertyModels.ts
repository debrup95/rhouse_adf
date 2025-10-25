import { GeoProperty } from '../utils/geo/propertyDistanceCalculator';
import { ComparableProperty, EventHistoryItem } from '../utils/property/comparablePropertiesHelper';

/**
 * Represents a property with all its comprehensive information
 * for frontend display
 */
export interface EnrichedPropertyModel {
  // Basic property information
  parcl_property_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  
  // Property attributes
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  year_built: number;
  lot_size_sqft?: number;
  property_type: string;
  
  // Location data
  latitude: number;
  longitude: number;
  distanceFromTarget: number;
  
  // Sale information
  lastSalePrice?: number;
  lastSaleDate?: string;
  daysOnMarket?: number;
  
  // Rental information
  lastRentalPrice?: number;
  lastRentalDate?: string;
  rentalStatus?: string;
  
  // Flag indicating if this is a comparable property
  isComparable: boolean;
  
  // Original data references (for internal use)
  rawPropertyData: GeoProperty;
  saleEvent?: EventHistoryItem;
  rentalEvent?: EventHistoryItem;
}

/**
 * Response model for property analysis
 */
export interface PropertyAnalysisResponse {
  // Target property information
  targetProperty: EnrichedPropertyModel;
  
  // All nearby properties
  neighborhoodProperties: EnrichedPropertyModel[];
  
  // Comparable properties (subset of neighborhood properties)
  comparableProperties: EnrichedPropertyModel[];
  
  // Analysis metadata
  analysisMetadata: {
    radiusUsed: number;
    monthsUsed: number;
    totalPropertiesFound: number;
    comparablePropertiesFound: number;
    medianPricePerSqft: number;
    averagePricePerSqft: number;
    timestamp: string;
  };
} 