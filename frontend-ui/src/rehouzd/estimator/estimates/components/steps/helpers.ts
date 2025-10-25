import { AddressComponents } from '../../../address/componenents/PlaceAutocompleteInput';

export const AddressImageUrl = (address: AddressComponents): string => {
    const encodedAddress = encodeURIComponent(address.formattedAddress);
    const size = '600x300';
    const fov = 90;
    const heading = 235;
    const pitch = 10;
    return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodedAddress}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${process.env.REACT_APP_Maps_API_KEY || ''}`;
};
