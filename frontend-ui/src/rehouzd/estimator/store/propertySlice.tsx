import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define interfaces for the different pieces of data you expect
interface AddressData {
    parcl_property_id: number;
    address: string;
    unit?: string | null;
    city: string;
    zip_code: string;
    state_abbreviation: string;
    county: string;
    cbsa: string;
    latitude: number;
    longitude: number;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    square_footage: number;
    year_built: number;
    cbsa_parcl_id: number;
    county_parcl_id: number;
    city_parcl_id: number;
    zip_parcl_id: number;
    event_count: number;
    event_history_sale_flag: number;
    event_history_rental_flag: number;
    event_history_listing_flag: number;
    current_new_construction_flag: number;
    current_owner_occupied_flag: number;
    current_investor_owned_flag: number;
    current_entity_owner_name?: string | null;
    source_id?: string | null;
}

// Define the overall property interface
export interface Property {
    address?: {
        street1: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
        formattedAddress: string;
        lat: number;
        lng: number;
    };
    addressData?: {
        items: AddressData[];
    };
    neighborhoodProperties?: any[]; // Filtered comparable properties (for "Suggested Comps")
    allProperties?: any[]; // All properties within 1.0-mile radius (for "All Comps")
    properties?: any[]; // Alternative field name from API response
    radiusUsed?: number;
    monthsUsed?: number;
    usedFallbackCriteria?: boolean; // Flag to indicate if fallback search criteria were used
    // Add error properties for API error handling
    errorStatus?: number | string;
    errorMessage?: string;
}

// Define the slice state; using an array to allow for multiple properties later
interface PropertyState {
    properties: Property[];
    loading: boolean;
    error: string | null;
}

const initialState: PropertyState = {
    properties: [],
    loading: false,
    error: null,
};

const propertySlice = createSlice({
    name: 'property',
    initialState,
    reducers: {
        // Replace the current properties with a new list
        setProperties(state, action: PayloadAction<Property[]>) {
            state.properties = action.payload;
        },
        // Add a single property to the list
        addProperty(state, action: PayloadAction<Property>) {
            state.properties.push(action.payload);
        },
        // Update a specific property (using index as an example; you might change this to use a unique id)
        updateProperty(state, action: PayloadAction<{ index: number; property: Property }>) {
            const { index, property } = action.payload;
            if (state.properties[index]) {
                state.properties[index] = property;
            }
        },
        // Remove a property from the list by its index
        removeProperty(state, action: PayloadAction<number>) {
            state.properties.splice(action.payload, 1);
        },
        // Clear all property data (reset to initial state)
        clearPropertyData(state) {
            return initialState;
        },
        // Clear property data for a specific address
        clearPropertyForAddress(state, action: PayloadAction<string>) {
            const addressToRemove = action.payload;
            state.properties = state.properties.filter(
                property => property.address?.formattedAddress !== addressToRemove
            );
        },
        // Optionally, you could add reducers for setting loading and error states
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
    },
});

export const { 
    setProperties, 
    addProperty, 
    updateProperty, 
    removeProperty, 
    clearPropertyData,
    clearPropertyForAddress,
    setLoading, 
    setError 
} = propertySlice.actions;

export default propertySlice.reducer;
