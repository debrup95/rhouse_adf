import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  Flex,
  Container,
  InputGroup,
  InputLeftElement,
  useTheme,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import PlaceAutocompleteInput, { AddressComponents, PlaceAutocompleteInputRef } from '../../../address/components/PlaceAutocompleteInput';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setProperties } from '../../../store/propertySlice';
import { resetUnderwriteValues, setCurrentAddress } from '../../../store/underwriteSlice';


interface AddressInputStepProps {
  addressInput: string;
  selectedAddress: AddressComponents | null;
  onAddressChange: (val: string) => void;
  onAddressSelect: (addr: AddressComponents) => void;
  onNext: () => void;
  onHistoryToggle?: () => void;
  isHistoryVisible?: boolean;
  onShowManualAddress?: (originalAddress: AddressComponents) => void;
  onFindYourBuyer?: () => void;
  isAddressValidating?: boolean;
}

export interface AddressInputStepRef {
  focusInput: () => void;
}

const AddressInputStep = forwardRef<AddressInputStepRef, AddressInputStepProps>(({
  addressInput,
  selectedAddress,
  onAddressChange,
  onAddressSelect,
  onNext,
  onHistoryToggle,
  isHistoryVisible = false,
  onShowManualAddress,
  onFindYourBuyer,
  isAddressValidating = false,
}, ref) => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<PlaceAutocompleteInputRef>(null);

  const user = useAppSelector((state) => state.user);
  const linkColor = useColorModeValue('brand.500', 'brand.300');


  const handleAddressSelect = (address: AddressComponents) => {
    // Clear existing property data when a new address is selected
    dispatch(setProperties([]));
    
    // Reset underwrite values when a new address is selected
    dispatch(resetUnderwriteValues());
    
    // Store the current address in the Redux store
    dispatch(setCurrentAddress(address.formattedAddress));
    
    onAddressSelect(address);
  };

  const handleFindYourBuyer = () => {
    if (onFindYourBuyer) {
      onFindYourBuyer();
    } else {
      onNext();
    }
  };

  const handleFocusInput = () => {
    inputRef.current?.focus();
    // Also scroll the address input container into view
    const container = document.querySelector('[data-address-input-container]');
    if (container) {
      container.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  // Expose focusInput method to parent component
  useImperativeHandle(ref, () => ({
    focusInput: handleFocusInput,
  }), []);

  return (
    <Box
      w="100%"
      bg="background.primary" 
      backgroundImage="url('data:image/svg+xml;charset=utf-8,%3Csvg width=%221200%22 height=%221800%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22%23000000%22 opacity=%220.05%22%3E%3Ccircle cx=%220%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%2240%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%2280%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22120%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22160%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22200%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22240%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22280%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22320%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22360%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%2240%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22440%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22480%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22520%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22560%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22600%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22640%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22680%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22720%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22760%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22800%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22840%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22880%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22920%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%22960%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221000%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221040%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221080%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221120%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221160%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%221200%22 cy=%220%22 r=%222%22/%3E%3Ccircle cx=%220%22 cy=%2240%22 r=%222%22/%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%222%22/%3E%3Ccircle cx=%2280%22 cy=%2240%22 r=%222%22/%3E%3C/g%3E%3C/svg%3E')"
      backgroundRepeat="repeat"
      backgroundSize="40px 40px"
      py={{ base: 6, md: 4 }}
      px={{ base: 4, md: 0 }}
      position="relative"
      zIndex="1"
      mt={{ base: "0", md: "0" }}
      data-address-input-container
    >
      <Container maxW="container.md">
        <VStack spacing={{ base: 8, md: 14 }} align="center">
          <Box textAlign="center" px={{ base: 4, md: 0 }}>
            <Heading
              fontSize={{ base: "24px", md: "30px" }}
              color="brand.500"         
              fontWeight="bold"
              lineHeight="1.2"
            >
              Instant Offer Estimate &<br />
              Investor Matching Intelligence
            </Heading>
          </Box>

          {/* Address Input Container */}
          <Box
            w="100%"
            maxW="600px"
            border="1px solid #222"
            borderRadius="12px"
            p={1}
            boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
          >
            <Flex 
              align="center"
              direction={{ base: "column", md: "row" }}
              gap={{ base: 2, md: 0 }}
            >
              <Box flex="1" pl={{ base: 2, md: 4 }} width="100%">
                <InputGroup>
                  <InputLeftElement
                    pointerEvents="none"
                    children={<SearchIcon boxSize={6} color="gray.400" />}
                    height="full"
                    width="20px"
                  />
                  <PlaceAutocompleteInput
                    ref={inputRef}
                    value={addressInput}
                    onChange={onAddressChange}
                    onSelectAddress={handleAddressSelect}
                    borderColor="transparent"
                    _hover={{ borderColor: 'transparent' }}
                    _focus={{
                      borderColor: 'transparent',
                      boxShadow: 'none',
                    }}
                  />
                </InputGroup>
              </Box>

              <Button
                colorScheme="brand"
                variant="solid"
                size={{ base: "md", md: "lg" }}
                px={{ base: 6, md: 4 }}
                py={{ base: 4, md: 4 }}
                onClick={handleFindYourBuyer}
                isDisabled={!selectedAddress || isAddressValidating}
                isLoading={isAddressValidating}
                loadingText="Validating..."
                borderRadius="12px"
                fontWeight="bold"
                width={{ base: "100%", md: "auto" }}
                mt={{ base: 0, md: 0 }}
                mr={{ base: 0, md: 0 }}
                _disabled={{
                  opacity: 0.6,
                  cursor: "not-allowed",
                  bg: "gray.300",
                  color: "gray.500",
                  _hover: {
                    bg: "gray.300",
                  }
                }}
              >
                Find Your Buyer
              </Button>
            </Flex>
          </Box>

          {/* View Search History Link */}
          {user.isLoggedIn && user.user_id && onHistoryToggle && (
            <Text
              color={linkColor}
              fontSize="20px"
              fontWeight="bold"
              cursor="pointer"
              textAlign="center"
              _hover={{ textDecoration: 'underline' }}
              onClick={onHistoryToggle}
              mt="-28px"
              mb="15px"
            >
              {isHistoryVisible ? 'Hide Search History' : 'View Search History'}
            </Text>
          )}
        </VStack>
      </Container>
    </Box>
  );
});

export default AddressInputStep;
