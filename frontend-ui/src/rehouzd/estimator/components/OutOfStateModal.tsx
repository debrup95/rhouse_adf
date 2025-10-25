import React from 'react';
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
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

interface OutOfStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetNotified: () => void;
  stateName?: string;
}

const OutOfStateModal: React.FC<OutOfStateModalProps> = ({
  isOpen,
  onClose,
  onGetNotified,
  stateName,
}) => {
  const iconColor = useColorModeValue('brand.500', 'brand.300');

  const handleGetNotified = () => {
    onClose();
    onGetNotified();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <VStack spacing={3} align="center">
            <Icon as={InfoIcon} boxSize={8} color={iconColor} />
            <Text textAlign="center">
              We're not live in {stateName || 'this state'} yet
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="center" textAlign="center">
            <Text color="gray.600">
              We're currently serving Tennessee and expanding to more states soon.
            </Text>
            <Text color="gray.600">
              Get notified when we launch in {stateName || 'your state'} so you can be 
              among the first to get instant offers and connect with investors.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleGetNotified}
          >
            Get notified when we expand
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OutOfStateModal;
