import React, { FC, useEffect, useRef } from 'react';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { Box } from '@chakra-ui/react';
import { useAppSelector } from "../../store/hooks";

type AddressMapProps = {
    latitude: number;
    longitude: number;
    address: string;
};

const AddressMap: FC<AddressMapProps> = ({ latitude, longitude, address }) => {
    const defaultCenter = { lat: latitude, lng: longitude };
    const map = useMap();
    const circleRef = useRef<google.maps.Circle | null>(null);

    // Retrieve neighbors from Redux store
    const propertyState = useAppSelector((state) => state.property);
    const neighbors = propertyState.properties[0]?.neighborhoodProperties || [];


    console.log("propertyState props are..." + JSON.stringify(propertyState));

    console.log("neighbors props are..." + JSON.stringify(neighbors));

    useEffect(() => {
        if (map && latitude && longitude && (window as any).google?.maps) {
            const circle = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.5,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.2,
                map: map,
                center: defaultCenter,
                // radius: 804.67, // 0.5 mile in meters
                radius: 1207.01, // 0.75 mile in meters
            });
            circleRef.current = circle;

            return () => {
                if (circleRef.current) {
                    circleRef.current.setMap(null);
                    circleRef.current = null;
                }
            };
        }
    }, [map, latitude, longitude, defaultCenter]);

    return (
        <Box width="100%" height="400px" borderRadius="md" overflow="hidden">
            {latitude !== null && longitude !== null && (
                <Map
                    defaultZoom={14}
                    defaultCenter={defaultCenter}
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Marker for the main address with a red icon */}
                    <Marker
                        position={defaultCenter}
                        title={address}
                        icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    />

                    {/* Markers for each neighboring property with blue icons */}
                    {neighbors.map((neighbor: any, index: number) => (
                        <Marker
                            key={index}
                            position={{ lat: neighbor.latitude, lng: neighbor.longitude }}
                            title={neighbor.address}
                            icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                        />
                    ))}
                </Map>
            )}
        </Box>
    );
};

export default AddressMap;
