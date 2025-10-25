import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Text, VStack, List, ListItem, ListIcon, Box } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

const freeTierFeatures = [
  '7 estimates per month',
  '7 buyer matches per month',
  'Instant investor offer estimates',
  'Rental and sold comps',
  'Underwriting tool with editable inputs',
  'Basic buyer information',
];

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onContinue }) => {
  const handleClose = () => {
    onClose();
    onContinue();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size={{ base: "sm", md: "lg" }} 
      isCentered
    >
      <ModalOverlay />
      <ModalContent 
        mx={{ base: 4, md: 0 }}
        my={{ base: 4, md: "auto" }}
        maxH={{ base: "90vh", md: "auto" }}
        borderRadius="md"
        maxW={{ base: "90%", md: "lg" }}
      >
        <ModalHeader 
          fontSize={{ base: "xl", md: "2xl" }}
          textAlign="center"
          pb={{ base: 2, md: 4 }}
        >
          Welcome to Rehouzd
        </ModalHeader>
        <ModalCloseButton 
          size={{ base: "md", md: "lg" }}
          top={{ base: 4, md: 6 }}
          right={{ base: 4, md: 6 }}
        />
        <ModalBody px={{ base: 4, md: 6 }} py={{ base: 2, md: 4 }}>
          <Text 
            mb={4} 
            fontSize={{ base: "md", md: "lg" }}
            textAlign="center"
            color="gray.600"
          >
            Estimate limit reached? Get in touch to unlock more.
          </Text>
          <Box>
            <List spacing={{ base: 2, md: 3 }}>
              {freeTierFeatures.map((feature, index) => (
                <ListItem 
                  key={index}
                  fontSize={{ base: "sm", md: "md" }}
                  display="flex"
                  alignItems="center"
                >
                  <ListIcon 
                    as={CheckCircleIcon} 
                    color="brand.500" 
                    fontSize={{ base: "md", md: "lg" }}
                    mr={2}
                  />
                  {feature}
                </ListItem>
              ))}
            </List>
          </Box>
        </ModalBody>
        <ModalFooter 
          px={{ base: 4, md: 6 }} 
          py={{ base: 4, md: 6 }}
        >
          <Button 
            colorScheme="brand" 
            w="100%" 
            onClick={handleClose}
            size={{ base: "md", md: "lg" }}
            fontSize={{ base: "md", md: "lg" }}
            py={{ base: 3, md: 4 }}
            _hover={{ bg: "brand.600" }}
          >
            Get Estimate & Connect With Buyers
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WelcomeModal;