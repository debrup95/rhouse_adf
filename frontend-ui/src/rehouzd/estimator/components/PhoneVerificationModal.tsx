import React, { useState } from 'react';
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
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { FaPhone, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import phoneVerificationService from '../services/phoneVerificationService';
import { useAppSelector } from '../store/hooks';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  buyerName: string;
  verificationStatus: 'verified' | 'invalid';
  onVerificationComplete: (result: any) => void;
}

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  buyerName,
  verificationStatus,
  onVerificationComplete,
}) => {
  const user = useAppSelector((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const brandColor = useColorModeValue('brand.500', 'brand.300');

  const handleConfirm = async () => {
    if (!user?.user_id) {
      setError('User authentication required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await phoneVerificationService.verifyPhone({
        user_id: parseInt(user.user_id.toString(), 10),
        phoneNumber,
        buyerName,
        verificationStatus,
      });

      if (response.success) {
        // Phone verification successful
        onVerificationComplete(response.verification);
        onClose();
      } else {
        setError(response.message || 'Failed to verify phone number');
      }
    } catch (error: any) {
      // Error verifying phone
      setError(error.message || 'Failed to verify phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phoneVerificationService.formatPhoneNumber(phone);
  };

  const getActionText = () => {
    return verificationStatus === 'verified' ? 'verify' : 'mark as invalid';
  };

  const getActionColor = () => {
    return verificationStatus === 'verified' ? 'green' : 'red';
  };

  const getActionIcon = () => {
    return verificationStatus === 'verified' ? FaCheckCircle : FaTimesCircle;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      isCentered
      closeOnOverlayClick={!isSubmitting}
      closeOnEsc={!isSubmitting}
    >
      <ModalOverlay />
      <ModalContent bg={bgColor} mx={4}>
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={getActionIcon() as React.ElementType} color={getActionColor() + '.500'} />
            <Text>
              {verificationStatus === 'verified' ? 'Verify Phone Number' : 'Mark Phone as Invalid'}
            </Text>
          </HStack>
        </ModalHeader>
        
        {!isSubmitting && <ModalCloseButton />}

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Phone and Buyer Info */}
            <VStack spacing={2} align="center" p={4} bg="gray.50" borderRadius="md">
              <HStack spacing={2}>
                <Icon as={FaPhone as React.ElementType} color={brandColor} />
                <Text fontWeight="semibold" fontSize="lg">
                  {formatPhoneNumber(phoneNumber)}
                </Text>
              </HStack>
              <Text color="gray.600" fontSize="sm">
                for {buyerName}
              </Text>
            </VStack>

            {/* Confirmation Message */}
            <Text textAlign="center" fontSize="md">
              Are you sure you want to <strong>{getActionText()}</strong> this phone number?
            </Text>

            {verificationStatus === 'verified' && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Your verification will help other users save time by knowing this number works.
                </Text>
              </Alert>
            )}

            {verificationStatus === 'invalid' && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  This will decrease the verification count and help others avoid calling invalid numbers.
                </Text>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%">
            <Button 
              variant="outline" 
              onClick={onClose}
              isDisabled={isSubmitting}
              flex="1"
            >
              Cancel
            </Button>
            <Button
              colorScheme={getActionColor()}
              onClick={handleConfirm}
              isLoading={isSubmitting}
              loadingText={`${verificationStatus === 'verified' ? 'Verifying' : 'Marking Invalid'}...`}
              spinner={<Spinner size="sm" />}
              flex="1"
            >
              {verificationStatus === 'verified' ? 'Verify' : 'Mark Invalid'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PhoneVerificationModal; 