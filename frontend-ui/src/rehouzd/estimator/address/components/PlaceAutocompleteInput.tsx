import React, { FC, useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  borderColor?: string;
  _hover?: object;
  _focus?: object;
};

export interface PlaceAutocompleteInputRef {
  focus: () => void;
}

const PlaceAutocompleteInput = forwardRef<PlaceAutocompleteInputRef, PlaceAutocompleteProps>(({
  value,
  onChange,
  onSelectAddress,
  borderColor,
  _hover,
  _focus,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const places = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingRef = useRef(false);
  const previousValueRef = useRef(value);

  // Store latest callbacks in refs to avoid recreating autocomplete widget
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelectAddress);
  
  // Update refs when callbacks change (but don't recreate widget)
  useEffect(() => {
    onChangeRef.current = onChange;
    onSelectRef.current = onSelectAddress;
  }, [onChange, onSelectAddress]);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      // Scroll the input into view with smooth behavior
      inputRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    },
  }), []);

  // Track value changes to prevent unnecessary onChange calls
  useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

  // Create autocomplete widget EXACTLY ONCE when places library loads
  useEffect(() => {
    if (!places || !inputRef.current || autocompleteRef.current) return;



    // Generate initial session token for cost optimization
    sessionTokenRef.current = new places.AutocompleteSessionToken();

    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ['address_components', 'formatted_address', 'geometry'],
      componentRestrictions: { country: 'us' },
    } as google.maps.places.AutocompleteOptions);

    // Set session token after creation
    (autocomplete as any).setOptions({
      sessionToken: sessionTokenRef.current
    });

    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      if (isSelectingRef.current) return; // Prevent duplicate calls
      
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !place.formatted_address) {
        return;
      }

      isSelectingRef.current = true;

      // Parse address components from Google Places
      let street1 = '';
      let street2 = '';
      let city = '';
      let state = '';
      let zip = '';

      if (place.address_components) {
        for (const component of place.address_components) {
          const types = component.types;
          
          if (types.includes('street_number') || types.includes('route')) {
            street1 += component.long_name + ' ';
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.short_name; // Use short name for state (e.g., "TN" instead of "Tennessee")
          } else if (types.includes('postal_code')) {
            zip = component.long_name;
          }
        }
        street1 = street1.trim();
      }

      const addr: AddressComponents = {
        street1,
        street2,
        city,
        state,
        zip,
        formattedAddress: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      // Use current refs to avoid stale closures
      onSelectRef.current(addr);
      onChangeRef.current(place.formatted_address);
      
      // Generate new session token for next search
      sessionTokenRef.current = new places.AutocompleteSessionToken();
      (autocompleteRef.current as any).setOptions({
        sessionToken: sessionTokenRef.current
      });
      

      
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    });

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (listener) {
        listener.remove();
      }
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [places]); // ONLY depend on places library - no other dependencies!

  // Handle input changes with debouncing and min character requirement
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSelectingRef.current) return; // Don't interfere during address selection
    
    const newValue = e.target.value;
    
    // Only call onChange if the value actually changed and it's not being set externally
    if (newValue !== previousValueRef.current) {
      onChangeRef.current(newValue); // Use ref to avoid stale closure
      previousValueRef.current = newValue;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only enable predictions if input length >= 3
    if (newValue.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        if (autocompleteRef.current && sessionTokenRef.current) {
          (autocompleteRef.current as any).setOptions({
            bounds: undefined, // Reset any previous bounds restrictions
            sessionToken: sessionTokenRef.current
          });
        }
      }, 300);
    } else {
      // For short input, restrict bounds to effectively disable predictions
      if (autocompleteRef.current) {
        (autocompleteRef.current as any).setOptions({
          bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(-90, -180),
            new google.maps.LatLng(-90, -180)
          )
        });
      }
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      placeholder="Enter home address (min 3 characters)"
      value={value}
      onChange={handleInputChange}
      borderColor={borderColor}
      _hover={_hover}
      _focus={_focus}
      pl="40px"
    />
  );
});

export default PlaceAutocompleteInput;