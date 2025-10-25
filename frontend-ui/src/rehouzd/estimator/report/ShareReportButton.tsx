import React, { useState } from 'react';
import {
  Button,
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
  Divider,
  Box,
  useDisclosure,
  useToast,
  useClipboard,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import {
  FaShare,
  FaCopy,
  FaEye,
  FaLink,
  FaClock,
  FaCheck,
  FaFilePdf,
} from 'react-icons/fa';
import { useAppSelector } from '../store/hooks';
import config from '../../../config';
import { getDisplayedNeighborhoodComps } from './investor/utils/getDisplayedNeighborhoodComps';

interface ShareReportButtonProps {
  reportStrategy: 'rent' | 'flip';
  presetValues?: Record<string, number>;
  propertyAddress?: string;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: string;
  selectedComps?: string[]; // Manually selected comp IDs
  // Auto-save data for creating the estimate if needed
  estimateData?: {
    selectedAddress?: any;
    addressState?: any;
    property?: any;
    rentUnderwriteValues?: any;
    flipUnderwriteValues?: any;
    buyers?: any[];
    offerRangeLow?: number;
    offerRangeHigh?: number;
  };
}

interface SharedReportLink {
  shareToken: string;
  shareUrl: string;
  expiresAt: string;
  viewCount?: number;
}

const ShareReportButton: React.FC<ShareReportButtonProps> = ({
  reportStrategy,
  presetValues = {},
  propertyAddress = 'Property Report',
  size = 'md',
  colorScheme = 'blue',
  selectedComps,
  estimateData,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Get user info from Redux store
  const user = useAppSelector((state: any) => state.user);
  
  // State management
  const [isCreating, setIsCreating] = useState(false);
  const [sharedLink, setSharedLink] = useState<SharedReportLink | null>(null);
  const [expirationHours, setExpirationHours] = useState('48');
  const [isCopied, setIsCopied] = useState(false);
  
  // Clipboard functionality
  const { onCopy } = useClipboard(sharedLink?.shareUrl || '');
  
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBgColor = useColorModeValue('gray.50', 'gray.700');
  const usageBoxBgColor = useColorModeValue('green.50', 'green.900');

  const handleCreateShareLink = async () => {
    if (!user.isLoggedIn || !user.user_id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to create a shareable PDF report link.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // First, we need to save the estimate if we don't have a saved one
      let estimateIdToShare: number | undefined;
      
      if (estimateData) {
        const userId = parseInt(user.user_id);
        const address = estimateData.selectedAddress?.formattedAddress || propertyAddress;

        // Prepare estimate data for saving - OPTIMIZED for investor reports
        const property = estimateData.property || {};
        
        // Get neighborhood comps using the same logic as InvestorReport
        const flipData = estimateData.flipUnderwriteValues || {};
        const rentalData = estimateData.rentUnderwriteValues || {};
        const arvValue = flipData?.afterRepairValue || 0;
        const rentValue = rentalData?.rent || 0;
        
        // Get displayed neighborhood comps (2 sold + 2 rental)
        const { arvComps, rentalComps } = getDisplayedNeighborhoodComps(
          estimateData.property?.allProperties || [],
          arvValue,
          rentValue,
          selectedComps // Pass manual selection if available
        );
        
        // Combine both types of comps for storage
        const displayedComps = [...arvComps, ...rentalComps];
        
        const optimizedProperty = property
          ? {
              addressData: property.addressData,
              radiusUsed: property.radiusUsed,
              usedFallbackCriteria: property.usedFallbackCriteria,
              // Store only displayed comps instead of all comps
              displayedArvComps: arvComps,
              displayedRentalComps: rentalComps,
              displayedCompsCount: displayedComps.length,
              neighborhoodProperties: [], // Remove large arrays
              allProperties: [], // Remove large arrays
              neighborhoodPropertiesCount: 0,
              allPropertiesCount: 0,
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
            buyers: estimateData.buyers || [],
            active_investment_strategy: reportStrategy,
            notes: `PDF Report - ${reportStrategy} strategy`,
            // Store displayed comps separately (2 sold + 2 rental)
            displayedArvComps: arvComps,
            displayedRentalComps: rentalComps,
            // Store selectedComps so shared view knows which comps were manually selected
            selectedComps: selectedComps || [],
          },
        };

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
      }

      if (!estimateIdToShare) {
        throw new Error('No estimate data available to share');
      }

      // Create the shared PDF report link
      const shareRequestBody = {
        savedEstimateId: estimateIdToShare,
        userId: parseInt(user.user_id),
        expiresInHours: parseInt(expirationHours),
        reportStrategy,
        presetValues,
      };

      const response = await fetch(`${config.apiUrl}/api/shared-estimates/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareRequestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create shared report link');
      }

      setSharedLink({
        shareToken: data.data.shareToken,
        shareUrl: data.data.shareUrl,
        expiresAt: data.data.expiresAt,
      });
    } catch (error: any) {
      console.error('Error creating shared report link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shareable report link. Please try again.',
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

  return (
    <>
      <Button
        leftIcon={<Icon as={FaShare as React.ElementType} />}
        colorScheme={colorScheme}
        size={size}
        onClick={onOpen}
        isDisabled={!user.isLoggedIn}
        marginTop={4}
      >
        Share Report
      </Button>

      <Modal isOpen={isOpen} onClose={handleModalClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader>
            <HStack>
              <Icon as={FaFilePdf as React.ElementType} color="red.500" />
              <Text>Share PDF Report</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              
              {/* Report Info */}
              <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Text fontWeight="semibold" mb={1}>Property Report</Text>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {propertyAddress}
                </Text>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">Strategy:</Text>
                  <Text fontSize="sm" color="brand.500" fontWeight="bold" textTransform="uppercase">
                    {reportStrategy === 'rent' ? 'BRRRR/Rental' : 'Fix & Flip'}
                  </Text>
                </HStack>
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
                  <Alert status="info" variant="left-accent">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                      This will create a shareable link to view your PDF report. Recipients can view 
                      and print the report without needing an account.
                    </AlertDescription>
                  </Alert>

                  {/* Create Button */}
                  <Button
                    colorScheme="green"
                    onClick={handleCreateShareLink}
                    isLoading={isCreating}
                    loadingText="Creating Link..."
                    leftIcon={<Icon as={FaLink as React.ElementType} />}
                    size="lg"
                  >
                    Create Shareable PDF Link
                  </Button>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <Alert status="success" variant="subtle">
                    <AlertIcon />
                    <AlertDescription>
                      Your shareable PDF report link has been created successfully!
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
                        Preview Report
                      </Button>
                    </HStack>

                    {/* Usage Info */}
                    <Box p={3} bg={usageBoxBgColor} borderRadius="md">
                      <Text fontSize="sm" color="green.700">
                        <strong>How to use:</strong> Share this link with clients, investors, or partners. 
                        They can view the professional PDF report and print it without needing an account.
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

export default ShareReportButton;
