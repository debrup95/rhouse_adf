import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Text, HStack, Badge, Icon } from '@chakra-ui/react';
import { FaHome, FaSearchLocation } from 'react-icons/fa';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useAppSelector } from '../../store/hooks';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

// Define property data interface
export interface PropertyData {
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  distance?: number | string;
  status?: string;
  latitude?: number;
  longitude?: number;
}

// Props for the AddressMap component
export interface AddressMapProps {
  latitude: number;
  longitude: number;
  address: string;
  zoom?: number;
  height?: string;
  showProperties?: boolean;
  forceEmptyProperties?: boolean;
  properties?: PropertyData[];
  radiusMiles?: number;
  showRadius?: boolean;
  highlightedPropertyId?: string | number | null;
  selectedPropertyIds?: Array<string | number>;
  onInfoWindowClose?: () => void;
}

// Convert miles to meters for the circle radius
const milesToMeters = (miles: number): number => {
  return miles * 1609.34;
};

// Calculate zoom level based on radius
const calculateZoomLevel = (radius: number): number => {
  if (radius <= 0.5) return 14;
  if (radius <= 1) return 13;
  if (radius <= 2) return 12;
  if (radius <= 5) return 11;
  return 11;
};

const AddressMap: React.FC<AddressMapProps> = ({
  latitude,
  longitude,
  address,
  height = '100%',
  showProperties = true,
  forceEmptyProperties = false,
  properties = [],
  radiusMiles = 0.5,
  showRadius = true,
  highlightedPropertyId = null,
  selectedPropertyIds = [],
  onInfoWindowClose,
}: AddressMapProps) => {
  // Define constant theme colors
  const bgColor = 'background.primary';
  const textColor = 'text.secondary';
  
  // Map ref to prevent multiple renders
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  
  // Property selection state
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  
  // Load required Maps libraries
  const geometry = useMapsLibrary('geometry');
  const core = useMapsLibrary('core');
  
  // Get property data from Redux store
  const propertyState = useAppSelector((state: any) => state.property);
  
  // Map center position (memoized)
  const center = React.useMemo(() => ({
    lat: latitude,
    lng: longitude,
  }), [latitude, longitude]);

  // Memoized map options
  const mapOptions = React.useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoom: calculateZoomLevel(radiusMiles),
    center
  }), [radiusMiles, center]);

  // Handle marker click to show property info
  const handleMarkerClick = useCallback((prop: PropertyData) => {
    setSelectedProperty(prop);
  }, []);

  // Close info window and reset highlight
  const handleInfoWindowClose = useCallback(() => {
    setSelectedProperty(null);
    
    if (onInfoWindowClose) {
      onInfoWindowClose();
    }
  }, [onInfoWindowClose]);
  
  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    map.setCenter(center);
    map.setZoom(calculateZoomLevel(radiusMiles));
    
    if (showRadius && !circleRef.current && core) {
      circleRef.current = new google.maps.Circle({
        map: map,
        center: center,
        radius: milesToMeters(radiusMiles),
        fillColor: '#3182CE',
        fillOpacity: 0.1,
        strokeColor: '#3182CE',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });
    }
  }, [center, radiusMiles, showRadius, core]);

  // Update circle
  useEffect(() => {
    if (mapRef.current && core) {
      mapRef.current.setZoom(calculateZoomLevel(radiusMiles));
      mapRef.current.setCenter(center);
      
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      
      if (showRadius) {
        circleRef.current = new google.maps.Circle({
          map: mapRef.current,
          center: center,
          radius: milesToMeters(radiusMiles),
          fillColor: '#3182CE',
          fillOpacity: 0.1,
          strokeColor: '#3182CE',
          strokeOpacity: 0.8,
          strokeWeight: 2,
        });
      }
    }
  }, [radiusMiles, center, showRadius, core]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, []);
  
  // Process property data
  const property = propertyState.properties && propertyState.properties.length > 0 ? propertyState.properties[0] : null;
  
  // Get neighborhood properties if they exist
  let neighborhoodProperties: PropertyData[] = [];
  if (!forceEmptyProperties && showProperties) {
    if (properties && properties.length > 0) {
      neighborhoodProperties = properties;
    } else if (property?.neighborhoodProperties && Array.isArray(property.neighborhoodProperties)) {
      neighborhoodProperties = property.neighborhoodProperties;
    } else if (property && (property as any).properties && Array.isArray((property as any).properties)) {
      neighborhoodProperties = (property as any).properties;
    }
  }

  // Filter properties based on checkbox selections
  const displayProperties = React.useMemo(() => {
    if (selectedPropertyIds.length === 0) {
      return neighborhoodProperties;
    }
    
    return neighborhoodProperties.filter(prop => 
      prop.id && selectedPropertyIds.includes(prop.id)
    );
  }, [neighborhoodProperties, selectedPropertyIds]);

  // Update highlighted property with animation timeout
  useEffect(() => {
    if (highlightedPropertyId) {
      const highlightedProp = neighborhoodProperties.find(prop => prop.id === highlightedPropertyId);
      if (highlightedProp) {
        setSelectedProperty(highlightedProp);
        
        if (mapRef.current && highlightedProp.latitude && highlightedProp.longitude) {
          mapRef.current.panTo({
            lat: highlightedProp.latitude,
            lng: highlightedProp.longitude
          });
        }
      }
    }
  }, [highlightedPropertyId, neighborhoodProperties]);
  
  // Manage marker animation
  const [animatedMarker, setAnimatedMarker] = useState<string | number | null>(null);
  
  // Start animation when highlighted property changes
  useEffect(() => {
    if (highlightedPropertyId) {
      setAnimatedMarker(highlightedPropertyId);
      
      const timer = setTimeout(() => {
        setAnimatedMarker(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setAnimatedMarker(null);
    }
  }, [highlightedPropertyId]);

  // Wait for required Maps libraries to load
  if (!core || !geometry) {
    return (
      <Box height={height} width="100%" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading Map...</Text>
      </Box>
    );
  }

  // Create marker icon anchor point
  const markerAnchor = new google.maps.Point(12, 23);

  return (
    <Box position="relative" height={height} width="100%">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Main address marker */}
        <Marker
          position={center}
          icon={{
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
            fillColor: '#C83B31',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#FFFFFF',
            scale: 2,
            anchor: markerAnchor,
          }}
          title={address}
        />

        {/* Neighborhood property markers */}
        {showProperties && displayProperties.length > 0 && displayProperties.map((prop, index) => {
          if (!prop.latitude || !prop.longitude) return null;
          
          const isHighlighted = prop.id && prop.id === highlightedPropertyId;
          let fillColor = 'green';
          if (isHighlighted) {
            fillColor = 'teal';
          } else if (prop.status === 'SOLD') {
            fillColor = '#d37f7f';
          } else if (prop.status === 'LISTED_RENT' || prop.status === 'RENTAL') {
            fillColor = '#7ba0b5';
          }
          return (
            <Marker
              key={prop.id || `prop-${index}`}
              position={{
                lat: prop.latitude,
                lng: prop.longitude,
              }}
              onClick={() => handleMarkerClick(prop)}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                fillColor,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#FFFFFF',
                scale: isHighlighted ? 2.0 : 1.5,
                anchor: markerAnchor,
              }}
            />
          );
        })}

        {/* Info window for selected property */}
        {selectedProperty && selectedProperty.latitude && selectedProperty.longitude && (
          <InfoWindow
            position={{
              lat: selectedProperty.latitude,
              lng: selectedProperty.longitude,
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <Box p={2} maxW="200px" bg="white">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `${selectedProperty.address || ""} ${
                    selectedProperty.city || ""
                  } ${selectedProperty.state || ""} ${
                    selectedProperty.zipCode || ""
                  } Zillow Redfin Realtor`
                ).replace(/%20/g, "+")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#3182ce",
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: "bold",
                  marginBottom: "4px"
                }}
              >
                {selectedProperty.address || 'Property'}
                <ExternalLinkIcon ml="1" />
              </a>
              {selectedProperty.city && selectedProperty.state && (
                <Text fontSize="sm" mb={1} color="gray.600">{selectedProperty.city}, {selectedProperty.state}</Text>
              )}
              <HStack mb={1}>
                <Text fontSize="sm" color="gray.700">{selectedProperty.bedrooms || 0} bd, {selectedProperty.bathrooms || 0} ba</Text>
                <Text fontSize="sm" color="gray.700">{selectedProperty.squareFootage || 0} sqft</Text>
              </HStack>
              <Text fontWeight="bold" color="teal.500">${selectedProperty.price?.toLocaleString() || '0'}</Text>
            </Box>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Search radius overlay */}
      {showRadius && (
        <Box
          position="absolute"
          bottom="10px"
          left="10px"
          bg={bgColor}
          p={2}
          borderRadius="md"
          boxShadow="sm"
          opacity={0.9}
        >
          <HStack>
            <Icon as={FaSearchLocation as React.ElementType} color="brand.500" />
            <Text fontSize="sm" fontWeight="medium" color={textColor}>
              {radiusMiles.toFixed(1)} mi{radiusMiles !== 1 ? 's' : ''} Radius
            </Text>
            <Badge colorScheme={
              selectedPropertyIds.length > 0 
                ? "green" 
                : "blue"
            } ml={1}>
              {displayProperties.length} / {neighborhoodProperties.length} Properties
            </Badge>
          </HStack>
        </Box>
      )}

      {/* Filter information overlay when filtering is active */}
      {selectedPropertyIds.length > 0 && (
        <Box
          position="absolute"
          top="10px"
          right="10px"
          bg="green.50"
          p={2}
          borderRadius="md"
          boxShadow="sm"
          border="1px solid"
          borderColor="green.200"
        >
          <Text fontSize="sm" fontWeight="medium" color="green.700">
            Showing {selectedPropertyIds.length} selected properties
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default AddressMap;
