import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AddressState {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    formattedAddress: string;
    lat: number;
    lng: number;
    condition?: string;
    updatedPropertyDetails?: {
        bedrooms: number;
        bathrooms: number;
        square_footage: number;
        year_built: number;
    };
}

const initialState: AddressState = {
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    formattedAddress: '',
    lat: 0,
    lng: 0,
    condition: '',
};

const addressSlice = createSlice({
    name: 'address',
    initialState,
    reducers: {
        setAddressData: (state, action: PayloadAction<Partial<AddressState>>) => {
            return { ...state, ...action.payload };
        },
        clearAddressData: () => initialState,
    },
});

export const { setAddressData, clearAddressData } = addressSlice.actions;
export default addressSlice.reducer;
