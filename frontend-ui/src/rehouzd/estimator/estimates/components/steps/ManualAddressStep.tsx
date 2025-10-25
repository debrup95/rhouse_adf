import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  Container,
  FormControl,
  FormLabel,
  Input,
  Select,
  Alert,
  AlertIcon,
  Text,
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { AddressComponents } from '../../../address/components/PlaceAutocompleteInput';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setAddressData } from '../../../store/addressSlice';
import OutOfStateModal from '../../../components/OutOfStateModal';
import StateNotificationModal from '../../../components/StateNotificationModal';

interface ManualAddressStepProps {
  originalAddress: AddressComponents | null;
  onAddressSubmit: (address: AddressComponents) => void;
  onBack: () => void;
}

const ManualAddressStep: React.FC<ManualAddressStepProps> = ({
  originalAddress,
  onAddressSubmit,
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: any) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOutOfStateModalOpen, setIsOutOfStateModalOpen] = useState(false);
  const [outOfStateName, setOutOfStateName] = useState('');
  const [isStateNotificationModalOpen, setIsStateNotificationModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    street: originalAddress?.street1 || '',
    unit: '',
    city: originalAddress?.city || '',
    state: originalAddress?.state || '',
    zip: originalAddress?.zip || '',
  });

  // Update form data when originalAddress changes
  useEffect(() => {
    if (originalAddress) {
      setFormData({
        street: originalAddress.street1 || '',
        unit: originalAddress.street2 || '',
        city: originalAddress.city || '',
        state: originalAddress.state || '',
        zip: originalAddress.zip || '',
      });
    }
  }, [originalAddress]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // State validation helper
  const isValidState = (state: string | boolean): boolean => {
    // Allow all states
    return Boolean(state) && String(state).trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!formData.street || !formData.city || !formData.state || !formData.zip) {
      return;
    }

    // Check if the state is Tennessee
    if (!isValidState(formData.state)) {
      setOutOfStateName(formData.state);
      setIsOutOfStateModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create formatted address
      const formattedAddress = `${formData.street}${formData.unit ? ` ${formData.unit}` : ''}, ${formData.city}, ${formData.state} ${formData.zip}`;
      
      // Create address components object
      const addressComponents: AddressComponents = {
        street1: formData.street,
        street2: formData.unit,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        formattedAddress,
        lat: originalAddress?.lat || 0,
        lng: originalAddress?.lng || 0,
      };

      // Store in Redux
      dispatch(setAddressData({
        street1: addressComponents.street1,
        street2: addressComponents.street2,
        city: addressComponents.city,
        state: addressComponents.state,
        zip: addressComponents.zip,
        formattedAddress: addressComponents.formattedAddress,
        lat: addressComponents.lat,
        lng: addressComponents.lng,
      }));

      // Call the submit handler
      onAddressSubmit(addressComponents);
    } catch (error) {
      // Handle error silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.street && formData.city && formData.state && formData.zip;

  // Handle out-of-state modal actions
  const handleOutOfStateNotifyClick = () => {
    setIsOutOfStateModalOpen(false);
    setIsStateNotificationModalOpen(true);
  };

  return (
    <>
      {/* Out of State Modal */}
      <OutOfStateModal
        isOpen={isOutOfStateModalOpen}
        onClose={() => setIsOutOfStateModalOpen(false)}
        onGetNotified={handleOutOfStateNotifyClick}
        stateName={outOfStateName}
      />

      {/* State Notification Modal */}
      <StateNotificationModal
        isOpen={isStateNotificationModalOpen}
        onClose={() => setIsStateNotificationModalOpen(false)}
        prefilledState={outOfStateName}
        userEmail={user.email || ''}
        isAuthenticated={user.isLoggedIn}
      />

      <Container maxW="container.md" py={8}>
        <VStack spacing={6} align="stretch">
        {/* Alert Message */}
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">
              We couldn't locate this home via Google Autocomplete
            </Text>
            <Text fontSize="sm" mt={1}>
              Enter the address manually or try a different one. Rehouzd currently supports single-family homes. If this keeps happening, contact us and we'll help.
            </Text>
          </Box>
        </Alert>

        {/* Address Form */}
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Street</FormLabel>
            <Input
              value={formData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              placeholder="Enter street address"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Unit (optional)</FormLabel>
            <Input
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              placeholder="#203 / Apt"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>City</FormLabel>
            <Input
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Enter city"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>State</FormLabel>
            <Select
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              placeholder="Select state"
            >
              <option value="AL">AL</option>
              <option value="AK">AK</option>
              <option value="AZ">AZ</option>
              <option value="AR">AR</option>
              <option value="CA">CA</option>
              <option value="CO">CO</option>
              <option value="CT">CT</option>
              <option value="DE">DE</option>
              <option value="FL">FL</option>
              <option value="GA">GA</option>
              <option value="HI">HI</option>
              <option value="ID">ID</option>
              <option value="IL">IL</option>
              <option value="IN">IN</option>
              <option value="IA">IA</option>
              <option value="KS">KS</option>
              <option value="KY">KY</option>
              <option value="LA">LA</option>
              <option value="ME">ME</option>
              <option value="MD">MD</option>
              <option value="MA">MA</option>
              <option value="MI">MI</option>
              <option value="MN">MN</option>
              <option value="MS">MS</option>
              <option value="MO">MO</option>
              <option value="MT">MT</option>
              <option value="NE">NE</option>
              <option value="NV">NV</option>
              <option value="NH">NH</option>
              <option value="NJ">NJ</option>
              <option value="NM">NM</option>
              <option value="NY">NY</option>
              <option value="NC">NC</option>
              <option value="ND">ND</option>
              <option value="OH">OH</option>
              <option value="OK">OK</option>
              <option value="OR">OR</option>
              <option value="PA">PA</option>
              <option value="RI">RI</option>
              <option value="SC">SC</option>
              <option value="SD">SD</option>
              <option value="TN">TN</option>
              <option value="TX">TX</option>
              <option value="UT">UT</option>
              <option value="VT">VT</option>
              <option value="VA">VA</option>
              <option value="WA">WA</option>
              <option value="WV">WV</option>
              <option value="WI">WI</option>
              <option value="WY">WY</option>
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>ZIP</FormLabel>
            <Input
              value={formData.zip}
              onChange={(e) => handleInputChange('zip', e.target.value)}
              placeholder="Enter ZIP code"
            />
          </FormControl>
        </VStack>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            leftIcon={<CheckIcon />}
            colorScheme="green"
            onClick={handleSubmit}
            isDisabled={!isFormValid || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Validating"
          >
            Validate Address
          </Button>
          
          <Button
            leftIcon={<CloseIcon />}
            variant="outline"
            onClick={onBack}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>
        </HStack>
      </VStack>
    </Container>
    </>
  );
};

export default ManualAddressStep;
