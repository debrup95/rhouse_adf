import logger from '../logger';

export interface GeoProperty {
  latitude: number;
  longitude: number;
  [key: string]: any;
}

export interface PropertyCollection {
  items: GeoProperty[];
}

/**
 * Utility class for calculating properties within a specified distance
 * from an origin point using the haversine formula.
 */
class PropertyDistanceCalculator {
  private originData: PropertyCollection;
  private targetProperties: PropertyCollection;

  /**
   * Initialize the calculator with origin and target property data
   * 
   * @param originData Data containing the origin property with lat/long
   * @param targetProperties Collection of properties to filter by distance
   */
  constructor(originData: PropertyCollection, targetProperties: PropertyCollection) {
    this.originData = originData;
    this.targetProperties = targetProperties;
  }

  /**
   * Filter properties that are within the specified radius from the origin property
   * 
   * @param radiusMiles Radius in miles to filter properties (default: 1.0)
   * @returns Array of properties within the specified radius
   */
  calculatePropertiesWithinRadius(radiusMiles: number = 1.0): GeoProperty[] {
    if (!this.originData.items || this.originData.items.length === 0 || !this.targetProperties.items) {
      logger.warn('Missing data for property distance calculation');
      return [];
    }

    const { latitude: originLat, longitude: originLon } = this.originData.items[0];
    
    logger.debug('Calculating properties within radius', {
      originLat,
      originLon,
      radiusMiles,
      propertiesCount: this.targetProperties.items.length
    });

    const propertiesWithinRadius = this.targetProperties.items.filter(property => {
      // Skip the origin property itself if it appears in the list
      if (property.latitude === originLat && property.longitude === originLon) {
        return false;
      }

      const distance = this.calculateDistance(
        originLat,
        originLon,
        property.latitude,
        property.longitude
      );
      
      return distance <= radiusMiles;
    });

    logger.debug('Properties within radius calculated', {
      totalProperties: this.targetProperties.items.length,
      propertiesWithinRadius: propertiesWithinRadius.length,
      radiusMiles
    });

    return propertiesWithinRadius;
  }

  /**
   * Calculate the distance between two points using the haversine formula
   * 
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in miles
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
}

export default PropertyDistanceCalculator; 