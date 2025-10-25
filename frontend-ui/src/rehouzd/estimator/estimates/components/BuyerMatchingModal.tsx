import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Text,
  Flex,
  Box,
  Icon,
  InputGroup,
  FormErrorMessage,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import { FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { isValidName, isValidPhoneNumber, formatPhoneNumber } from '../../utils/validationUtils';
import config from '../../../../config';

interface BuyerMatchingModalProps { 
  isOpen: boolean;
  onClose: () => void;
  addressData?: string;
  onSuccess?: () => void;
}

const BuyerMatchingModal: React.FC<BuyerMatchingModalProps> = ({
  isOpen,
  onClose,
  addressData,
  onSuccess
}) => {
  const navigate = useNavigate();
  
  // Get user data from Redux
  const { user_id, fname, lname, mobile } = useAppSelector(state => state.user);
  
  // Form state
  const [firstName, setFirstName] = useState(fname || '');
  const [lastName, setLastName] = useState(lname || '');
  const [phoneNumber, setPhoneNumber] = useState(mobile || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Field-specific errors
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  
  // Validate individual fields
  const validateFirstName = () => {
    if (!firstName.trim()) {
      setFirstNameError('First name is required');
      return false;
    }
    if (!isValidName(firstName)) {
      setFirstNameError('Please enter a valid first name');
      return false;
    }
    setFirstNameError('');
    return true;
  };
  
  const validateLastName = () => {
    if (!lastName.trim()) {
      setLastNameError('Last name is required');
      return false;
    }
    if (!isValidName(lastName)) {
      setLastNameError('Please enter a valid last name');
      return false;
    }
    setLastNameError('');
    return true;
  };
  
  const validatePhoneNumber = () => {
    if (!phoneNumber.trim()) {
      setPhoneNumberError('Phone number is required');
      return false;
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneNumberError('Please enter a valid phone number');
      return false;
    }
    setPhoneNumberError('');
    return true;
  };
  
  const handleBlur = (field: string) => {
    setTouchedFields({ ...touchedFields, [field]: true });
    if (field === 'firstName') validateFirstName();
    if (field === 'lastName') validateLastName();
    if (field === 'phoneNumber') validatePhoneNumber();
  };
  
  // Check if form is valid
  const checkFormValidity = () => {
    const isFirstNameValid = validateFirstName();
    const isLastNameValid = validateLastName();
    const isPhoneNumberValid = validatePhoneNumber();
    return isFirstNameValid && isLastNameValid && isPhoneNumberValid;
  };
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFirstName(fname || '');
      setLastName(lname || '');
      setPhoneNumber(mobile || '');
      setIsSuccess(false);
      setTouchedFields({});
      setFirstNameError('');
      setLastNameError('');
      setPhoneNumberError('');
    }
  }, [isOpen, fname, lname, mobile]);
  
  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only update if input is empty or contains only digits, spaces, dashes, parentheses, or plus sign
    if (input === '' || /^[0-9\s\-\(\)\+]*$/.test(input)) {
      setPhoneNumber(input);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!checkFormValidity()) {
      // Mark all fields as touched to show validation errors
      setTouchedFields({
        firstName: true,
        lastName: true,
        phoneNumber: true
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${config.apiUrl}/api/requests/offer-matching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user_id ? parseInt(user_id) : undefined,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          property_address: addressData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit offer matching request');
      }
      
      const result = await response.json();
      
      if (result.success) {
      setIsSuccess(true);
      
      // Redirect after success display
      setTimeout(() => {
        onClose();
        navigate('/estimate');
      }, 2000);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(result.message || 'Failed to process offer matching request');
      }
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit your request. Please try again later.');
      setTimeout(() => {
        setErrorMessage(null);
      }, 7000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent borderRadius="md">
        {!isSuccess ? (
          <>
            <ModalHeader borderBottom="1px solid" borderColor="gray.200">
              <Text color="text.primary" fontSize="xl" fontWeight="bold">
                Exclusive Buyer-Matching Service
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody py={6}>
              <Text mb={6}>We'll source the offers for you</Text>
              
              {/* Error Message */}
              {errorMessage && (
                <Alert status="error" borderRadius="md" mb={4}>
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle mr={2}>Error!</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Box>
                  <CloseButton
                    alignSelf="flex-start"
                    position="relative"
                    right={-1}
                    top={-1}
                    onClick={() => setErrorMessage(null)}
                  />
                </Alert>
              )}
              
              <Stack spacing={4}>
                <Flex gap={4}>
                  <FormControl isRequired isInvalid={touchedFields.firstName && !!firstNameError}>
                    <Input
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => handleBlur('firstName')}
                    />
                    {touchedFields.firstName && firstNameError && (
                      <FormErrorMessage>{firstNameError}</FormErrorMessage>
                    )}
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={touchedFields.lastName && !!lastNameError}>
                    <Input
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => handleBlur('lastName')}
                    />
                    {touchedFields.lastName && lastNameError && (
                      <FormErrorMessage>{lastNameError}</FormErrorMessage>
                    )}
                  </FormControl>
                </Flex>
                
                <FormControl isRequired isInvalid={touchedFields.phoneNumber && !!phoneNumberError}>
                  <InputGroup>
                    <Input
                      placeholder="Phone Number"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={() => handleBlur('phoneNumber')}
                    />
                  </InputGroup>
                  {touchedFields.phoneNumber && phoneNumberError && (
                    <FormErrorMessage>{phoneNumberError}</FormErrorMessage>
                  )}
                </FormControl>
              </Stack>
            </ModalBody>
            
            <ModalFooter flexDirection="column" gap={2}>
              <Button
                width="100%"
                colorScheme="green"
                bg="green.800"
                size="lg"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                _hover={{
                  bg: "brand.500",
                  transform: "translateY(-2px)",
                  boxShadow: "lg"
                }}
              >
                Submit For Approval
              </Button>
              
              <Text fontSize="sm" mt={2}>
                We'll reach out to you for application review
              </Text>
            </ModalFooter>
          </>
        ) : (
          <ModalBody py={8}>
            <Flex direction="column" align="center" justify="center">
              <Box
                borderRadius="full"
                bg="green.500"
                w="80px"
                h="80px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={4}
              >
                <Icon as={FaCheck as React.ElementType} color="white" boxSize={10} />
              </Box>
              
              <Text fontSize="xl" fontWeight="bold" mb={2}>
                Request Submitted!
              </Text>
              
              <Text textAlign="center" mb={4}>
                Thank you for your interest. We'll review your application and
                contact you soon.
              </Text>
            </Flex>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default BuyerMatchingModal; 