import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Modal,
  Icon,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  Divider,
  Box,
  useDisclosure,
  useToast,
  useClipboard,
  useColorModeValue,
  Spinner,
  Select,
} from '@chakra-ui/react';
import {
  FaShare,
  FaCopy,
  FaEye,
  FaLink,
  FaClock,
  FaCheck,
} from 'react-icons/fa';
import { useAppSelector } from '../../store/hooks';
import config from '../../../../config';

interface ShareEstimateButtonProps {
  savedEstimateId?: number;
  propertyAddress?: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: string;
  // New props for auto-save functionality
  estimateData?: {
    selectedAddress?: any;
    addressState?: any;
    property?: any;
    rentUnderwriteValues?: any;
    flipUnderwriteValues?: any;
    activeInvestmentStrategy?: 'rent' | 'flip';
    offerRangeLow?: number;
    offerRangeHigh?: number;
  };
}

interface SharedLink {
  shareToken: string;
  shareUrl: string;
  expiresAt: string;
  viewCount?: number;
  interactionCount?: number;
}

const ShareEstimateButton: React.FC<ShareEstimateButtonProps> = ({
  savedEstimateId,
  propertyAddress = 'Property Estimate',
  variant = 'button',
  size = 'md',
  colorScheme = 'blue',
  estimateData,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Get user info from Redux store
  const user = useAppSelector((state: any) => state.user);
  
  // State management
  const [isCreating, setIsCreating] = useState(false);
  const [sharedLink, setSharedLink] = useState<SharedLink | null>(null);
  const [expirationHours, setExpirationHours] = useState('48');
  const [isCopied, setIsCopied] = useState(false);
  
  // Clipboard functionality
  const { onCopy } = useClipboard(sharedLink?.shareUrl || '');
  
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBgColor = useColorModeValue('gray.50', 'gray.700');
  const usageBoxBgColor = useColorModeValue('blue.50', 'blue.900');

  const handleCreateShareLink = async () => {
    if (!user.isLoggedIn || !user.user_id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to create a shareable link.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsCreating(true);
      let estimateIdToShare = savedEstimateId;

      // If no savedEstimateId, auto-save the estimate first
      if (!estimateIdToShare && estimateData) {
        const userId = parseInt(user.user_id);
        const address = estimateData.selectedAddress?.formattedAddress || propertyAddress;

        // Prepare estimate data for saving (same format as EstimatedOfferStep)
        // Prepare property data including all comparable properties for shared estimates
        const property = estimateData.property || {};
        const optimizedProperty = property
          ? {
              addressData: property.addressData,
              radiusUsed: property.radiusUsed,
              usedFallbackCriteria: property.usedFallbackCriteria,
              neighborhoodProperties: property.neighborhoodProperties || [],
              allProperties: property.allProperties || [],
              neighborhoodPropertiesCount: property.neighborhoodProperties?.length || 0,
              allPropertiesCount: property.allProperties?.length || 0,
            }
          : null;

        const saveData = {
          user_id: userId,
          property_address: address,
          estimate_data: {
            property: optimizedProperty,
            address: estimateData.selectedAddress,
            addressState: estimateData.addressState,
            timestamp: new Date().toISOString(),
            offer_range_low: estimateData.offerRangeLow || 0,
            offer_range_high: estimateData.offerRangeHigh || 0,
            rent_underwrite_values: estimateData.rentUnderwriteValues,
            flip_underwrite_values: estimateData.flipUnderwriteValues,
            active_investment_strategy: estimateData.activeInvestmentStrategy || 'rent',
            notes: '',
            // Also store comparable properties at root level for data sanitization service fallback
            neighborhoodProperties: property?.neighborhoodProperties || [],
            allProperties: property?.allProperties || [],
          },
        };

        console.log('Save data being sent:', {
          saveData,
          selectedAddressType: typeof estimateData.selectedAddress,
          selectedAddressValue: estimateData.selectedAddress
        });

        // Save the estimate first
        const saveResponse = await fetch(`${config.apiUrl}/api/saved-estimates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to save estimate (${saveResponse.status})`);
        }

        const savedData = await saveResponse.json();
        if (!savedData.success || !savedData.estimate?.id) {
          throw new Error('Failed to save estimate - no ID returned');
        }

        estimateIdToShare = savedData.estimate.id;
        
        console.log('Auto-saved estimate for sharing:', {
          estimateId: estimateIdToShare,
          savedData: savedData
        });
          
          toast({
            title: 'Estimate Saved!',
            description: 'Your estimate has been saved and is being prepared for sharing.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }

        if (!estimateIdToShare) {
          throw new Error('No estimate data available to share');
        }

        const shareRequestBody = {
          savedEstimateId: parseInt(estimateIdToShare.toString()),
          userId: parseInt(user.user_id),
          expiresInHours: parseInt(expirationHours),
        };

        console.log('Creating shared link with request:', {
          url: `${config.apiUrl}/api/shared-estimates/create`,
          body: shareRequestBody,
          userInfo: {
            userId: user.user_id,
            userIdType: typeof user.user_id,
            isLoggedIn: user.isLoggedIn
          }
        });

        // Create the shared link
        const response = await fetch(`${config.apiUrl}/api/shared-estimates/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shareRequestBody),
        });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Share link creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestBody: shareRequestBody
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create shared link');
      }

      setSharedLink({
        shareToken: data.data.shareToken,
        shareUrl: data.data.shareUrl,
        expiresAt: data.data.expiresAt,
      });

      toast({
        title: 'Link Created!',
        description: 'Your shareable estimate link has been created successfully.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error creating shared link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shareable link. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    onCopy();
    setIsCopied(true);
    // Reset the "Copied" state after 10 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 10000);
  };

  const handleOpenInNewTab = () => {
    if (sharedLink?.shareUrl) {
      window.open(sharedLink.shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatExpirationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleModalClose = () => {
    onClose();
    // Reset state when modal closes
    setTimeout(() => {
      setSharedLink(null);
      setIsCopied(false);
    }, 200);
  };

  // Render the trigger button
  const TriggerButton = variant === 'icon' ? (
    <Tooltip label="Share estimate" placement="top">
      <IconButton
        aria-label="Share estimate"
        icon={<Icon as={FaShare as React.ElementType} />}
        colorScheme={colorScheme}
        variant="outline"
        size={size}
        onClick={onOpen}
        isDisabled={!user.isLoggedIn}
      />
    </Tooltip>
  ) : (
    <Button
      leftIcon={<Icon as={FaShare as React.ElementType} />}
      colorScheme={colorScheme}
      variant="outline"
      size={size}
      onClick={onOpen}
      isDisabled={!user.isLoggedIn}
    >
      Share Estimate
    </Button>
  );

  return (
    <>
      {TriggerButton}

      <Modal isOpen={isOpen} onClose={handleModalClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader>Share Property Estimate</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              
              {/* Property Info */}
              <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Text fontWeight="semibold" mb={1}>Property</Text>
                <Text fontSize="sm" color="gray.600">
                  {propertyAddress}
                </Text>
              </Box>

              {!sharedLink ? (
                <>
                  {/* Expiration Settings */}
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="semibold">Link Settings</Text>
                    
                    <HStack>
                      <Text fontSize="sm" minW="100px">Expires in:</Text>
                      <Select
                        value={expirationHours}
                        onChange={(e) => setExpirationHours(e.target.value)}
                        size="sm"
                        maxW="150px"
                      >
                        <option value="24">24 hours</option>
                        <option value="48">48 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">1 week</option>
                      </Select>
                    </HStack>
                  </VStack>

                  {/* Information Alert */}
                  {/* <Alert status="info" variant="left-accent">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                      The shared link will show the property analysis and allow viewers to 
                      adjust calculations, but won't expose sensitive business formulas or 
                      internal data.
                    </AlertDescription>
                  </Alert> */}

                  {/* Create Button */}
                  <Button
                    colorScheme="green"
                    onClick={handleCreateShareLink}
                    isLoading={isCreating}
                    loadingText="Creating Link..."
                    leftIcon={<Icon as={FaLink as React.ElementType} />}
                    size="lg"
                  >
                    Create Shareable Link
                  </Button>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <Alert status="success" variant="subtle">
                    <AlertIcon />
                    <AlertDescription>
                      Your shareable link has been created successfully!
                    </AlertDescription>
                  </Alert>

                  {/* Link Display and Actions */}
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Share Link</Text>
                      <InputGroup>
                        <Input
                          value={sharedLink.shareUrl}
                          isReadOnly
                          pr="100px"
                          fontSize="sm"
                          bg={inputBgColor}
                        />
                        <InputRightElement width="90px">
                          <Button
                            size="xs"
                            leftIcon={isCopied ? <Icon as={FaCheck as React.ElementType} /> : <Icon as={FaCopy as React.ElementType} />}
                            colorScheme={isCopied ? 'green' : 'blue'}
                            variant="solid"
                            onClick={handleCopyLink}
                          >
                            {isCopied ? 'Copied' : 'Copy'}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </Box>

                    {/* Link Info */}
                    <HStack justify="space-between" fontSize="sm" color="gray.600">
                      <HStack>
                        <Icon as={FaClock as React.ElementType} />
                        <Text>Expires: {formatExpirationDate(sharedLink.expiresAt)}</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaEye as React.ElementType} />
                        <Text>Views: {sharedLink.viewCount || 0}</Text>
                      </HStack>
                    </HStack>

                    <Divider />

                    {/* Action Buttons */}
                    <HStack spacing={3}>
                      <Button
                        flex="1"
                        leftIcon={<Icon as={FaEye as React.ElementType} />}
                        variant="outline"
                        onClick={handleOpenInNewTab}
                      >
                        Preview Link
                      </Button>
                    </HStack>

                    {/* Usage Info */}
                    <Box p={3} bg={usageBoxBgColor} borderRadius="md">
                      <Text fontSize="sm" color="blue.700">
                        <strong>How to use:</strong> Share this link with clients, investors, or partners. 
                        They can view the property analysis and interact with the calculations without 
                        needing an account.
                      </Text>
                    </Box>
                  </VStack>
                </>
              )}

            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ShareEstimateButton;