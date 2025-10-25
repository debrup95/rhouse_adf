/**
 * Utility functions for calculating distances between geographic coordinates
 * Uses the Haversine formula for accurate distance calculation
 */

/**
 * Calculate the distance between two points using the haversine formula
 * 
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusMiles = 3958.8;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

/**
 * Convert degrees to radians
 */
const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distances for multiple properties from an origin point
 * 
 * @param originLat Origin latitude
 * @param originLon Origin longitude
 * @param properties Array of properties with latitude and longitude
 * @returns Array of properties with calculated distances
 */
export const calculateDistancesForProperties = <T extends { latitude?: number; longitude?: number }>(
  originLat: number,
  originLon: number,
  properties: T[]
): (T & { distance: number })[] => {
  return properties
    .filter(property => 
      property.latitude !== undefined && 
      property.longitude !== undefined &&
      !isNaN(property.latitude) && 
      !isNaN(property.longitude)
    )
    .map(property => ({
      ...property,
      distance: calculateDistance(
        originLat,
        originLon,
        property.latitude!,
        property.longitude!
      )
    }))
    .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)
};

/**
 * Filter properties within a specified radius from an origin point
 * 
 * @param originLat Origin latitude
 * @param originLon Origin longitude
 * @param properties Array of properties with latitude and longitude
 * @param radiusMiles Radius in miles to filter properties
 * @returns Array of properties within the specified radius
 */
export const filterPropertiesWithinRadius = <T extends { latitude?: number; longitude?: number }>(
  originLat: number,
  originLon: number,
  properties: T[],
  radiusMiles: number = 1.0
): T[] => {
  return properties.filter(property => {
    if (
      property.latitude === undefined || 
      property.longitude === undefined ||
      isNaN(property.latitude) || 
      isNaN(property.longitude)
    ) {
      return false;
    }

    const distance = calculateDistance(
      originLat,
      originLon,
      property.latitude,
      property.longitude
    );

    return distance <= radiusMiles;
  });
};
