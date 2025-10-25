import config from '../../../config';
import { AddressComponents } from '../address/components/PlaceAutocompleteInput';

export interface AddressValidationResponse {
  success: boolean;
  isValid: boolean;
  message: string;
}

/**
 * Validate address with Parcl Labs via backend
 */
export const validateAddress = async (address: AddressComponents): Promise<AddressValidationResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/api/property/validate-address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      isValid: false,
      message: 'Failed to validate address. Please try again.',
    };
  }
};
