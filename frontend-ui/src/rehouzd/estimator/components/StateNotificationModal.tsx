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
  Text,
  Input,
  VStack,
  FormControl,
  FormLabel,
  useToast,
  Alert,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import config from '../../../config';
import { useSelector } from 'react-redux';

interface StateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledState?: string;
  userEmail?: string;
  isAuthenticated: boolean;
}

const StateNotificationModal: React.FC<StateNotificationModalProps> = ({
  isOpen,
  onClose,
  prefilledState = '',
  userEmail = '',
  isAuthenticated,
}) => {
  // Get user data from Redux store
  const user = useSelector((state: any) => state.user);
  const [states, setStates] = useState(prefilledState);
  const [email, setEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStates(prefilledState);
      setEmail(userEmail);
      setError('');
    }
  }, [isOpen, prefilledState, userEmail]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!states.trim()) {
      setError('Please enter at least one state');
      return;
    }

    // Basic state format validation (client-side)
    const stateList = states
      .split(',')
      .map(state => state.trim())
      .filter(state => state.length > 0);

    if (stateList.length === 0) {
      setError('Please enter at least one valid state');
      return;
    }

    // Check for obviously invalid states (client-side basic check)
    const invalidStates = stateList.filter(state => {
      const normalized = state.toUpperCase();
      return normalized.length < 2 || normalized.length > 20; // Basic length check
    });

    if (invalidStates.length > 0) {
      setError(`Please check the format of: ${invalidStates.join(', ')}. Use state names or two-letter codes.`);
      return;
    }

    if (!isAuthenticated && (!email.trim() || !validateEmail(email))) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the already validated state list from above
      const requestData = {
        userId: isAuthenticated && user?.user_id ? parseInt(user.user_id, 10) : null, // Send actual user ID as number
        email: isAuthenticated ? userEmail : email,
        states: stateList,
        source: 'address_banner'
      };

      // Make API call to backend using proper config.apiUrl
      const response = await fetch(`${config.apiUrl}/api/state-interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Get response text first to debug
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid JSON response');
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit request');
      }

      // Success
      toast({
        title: "Success!",
        description: result.message || "Thanks! We'll email you when we launch in your selected states.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Get notified when your state goes live</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text color="gray.600">
              We already have your email. Tell us the state or states you're interested in, 
              and we'll ping you when they go live.
            </Text>

            <FormControl isRequired>
              <FormLabel>Preferred state(s)</FormLabel>
              <Input
                value={states}
                onChange={(e) => setStates(e.target.value)}
                placeholder="e.g., TX, Georgia, Arizona, PA"
                autoFocus
              />
              <Text fontSize="sm" color="gray.500" mt={1}>
                Use state names (e.g., "Texas") or two-letter codes (e.g., "TX"). Separate multiple states with commas.
              </Text>
            </FormControl>

            {!isAuthenticated && (
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </FormControl>
            )}

            {isAuthenticated && userEmail && (
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  value={userEmail}
                  isReadOnly
                  bg="gray.50"
                  cursor="not-allowed"
                />
              </FormControl>
            )}

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>{error}</Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Submitting..."
          >
            Notify me
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StateNotificationModal;
