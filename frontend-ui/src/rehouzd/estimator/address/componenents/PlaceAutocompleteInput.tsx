import React, { FC, useRef, useEffect } from 'react';
import { Input } from '@chakra-ui/react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export type AddressComponents = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type PlaceAutocompleteProps = {
  value: string;
  onChange: (val: string) => void;
  onSelectAddress: (addr: AddressComponents) => void;
};

const PlaceAutocompleteInput: FC<PlaceAutocompleteProps> = ({
                                                              value,
                                                              onChange,
                                                              onSelectAddress,
                                                            }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['address_components', 'formatted_address', 'name', 'geometry'],
      componentRestrictions: { country: 'us' },
    };

    const autocomplete = new places.Autocomplete(inputRef.current, options);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (place.address_components && place.geometry && place.geometry.location) {
        // (If you parse components into street1, street2, city, etc. do that here)
        // For brevity, let's just do a minimal approach:
        onSelectAddress({
          street1: '', // parse as needed
          street2: '',
          city: '',
          state: '',
          zip: '',
          formattedAddress: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });

        // Also update the input's state
        onChange(place.formatted_address || '');
      } else if (place.formatted_address && place.geometry && place.geometry.location) {
        // Fallback approach
        onSelectAddress({
          street1: place.formatted_address,
          street2: '',
          city: '',
          state: '',
          zip: '',
          formattedAddress: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        onChange(place.formatted_address);
      } else {
        console.error('Selected place has no geometry.location or address_components');
      }
    });
  }, [places, onChange, onSelectAddress]);

  return (
      <Input
          ref={inputRef}
          placeholder="Enter a US address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
      />
  );
};

export default PlaceAutocompleteInput;
