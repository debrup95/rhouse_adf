import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  VStack,
  HStack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Textarea,
  Flex,
  Heading,
  Badge,
  Divider,
  Image,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { FaBed, FaBath, FaRulerCombined, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import RentUnderwriteSliders from './RentUnderwriteSliders';
import FlipUnderwriteSliders from './FlipUnderwriteSliders';
import BuyerEstimatedPrice from './BuyerEstimatedPrice';
import { useAppDispatch } from '../../store/hooks';
import { updateRentValues, updateFlipValues } from '../../store/underwriteSlice';
import { useStreetViewUrl } from '../../utils/streetViewCache';

interface SavedEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: any;
  onUpdate: (updatedEstimate: any) => Promise<void>;
}

const SavedEstimateModal: React.FC<SavedEstimateModalProps> = ({
  isOpen,
  onClose,
  estimate,
  onUpdate,
}) => {
  const dispatch = useAppDispatch();
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<string>('rent');
  
  // Local state for modal-only changes (these won't persist)
  const [localRentValues, setLocalRentValues] = useState({
    rent: 0,
    expense: 0,
    capRate: 0,
    highRehab: 0,
  });
  const [localFlipValues, setLocalFlipValues] = useState({
    sellingCosts: 0,
    holdingCosts: 0,
    margin: 0,
    highRehab: 0,
    afterRepairValue: 0,
  });

  // Store the original values to reset to on close
  const [originalRentValues, setOriginalRentValues] = useState({
    rent: 0,
    expense: 0,
    capRate: 0,
    highRehab: 0,
  });
  const [originalFlipValues, setOriginalFlipValues] = useState({
    sellingCosts: 0,
    holdingCosts: 0,
    margin: 0,
    highRehab: 0,
    afterRepairValue: 0,
  });

  // Extract property details from estimate
  const propertyAddress = estimate?.property_address || '';
  const estimateData = estimate?.estimate_data || {};
  const property = estimateData?.property || {};
  const addressData = property?.addressData?.items?.[0] || {};

  // Initialize modal with saved values when estimate changes
  useEffect(() => {
    if (estimate) {
      const savedRentValues = {
        rent: estimateData?.rent_underwrite_values?.rent || 0,
        expense: estimateData?.rent_underwrite_values?.expense || 0,
        capRate: estimateData?.rent_underwrite_values?.capRate || 0,
        highRehab: estimateData?.rent_underwrite_values?.highRehab || 0,
      };
      
      const savedFlipValues = {
        sellingCosts: estimateData?.flip_underwrite_values?.sellingCosts || 0,
        holdingCosts: estimateData?.flip_underwrite_values?.holdingCosts || 0,
        margin: estimateData?.flip_underwrite_values?.margin || 0,
        highRehab: estimateData?.flip_underwrite_values?.highRehab || 0,
        afterRepairValue: estimateData?.flip_underwrite_values?.afterRepairValue || 0,
      };
      
      const savedNotes = estimateData?.notes || '';
      const savedTab = estimateData?.active_investment_strategy || 'rent';
      
      // Set both local and original values
      setLocalRentValues(savedRentValues);
      setLocalFlipValues(savedFlipValues);
      setOriginalRentValues(savedRentValues);
      setOriginalFlipValues(savedFlipValues);
      setNotes(savedNotes);
      setActiveTab(savedTab);
    }
  }, [estimate]);

  // Get Google API key
  const googleApiKey = (window as any).env?.REACT_APP_Maps_API_KEY || process.env.REACT_APP_Maps_API_KEY || '';
  
  // Use cached Street View URL to reduce API calls
  const streetViewUrl = useStreetViewUrl(
    propertyAddress || null,
    googleApiKey,
    { size: '400x200', fov: 80, pitch: -5 }
  );

  // Handle slider changes for local state only
  const handleRentSliderChange = (key: string, value: number) => {
    setLocalRentValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFlipSliderChange = (key: string, value: number) => {
    setLocalFlipValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Update Redux store whenever local values change
  useEffect(() => {
    if (isOpen) {
      updateReduxWithLocalValues();
    }
  }, [localRentValues, localFlipValues, isOpen]);

  // Enhanced close function that resets to original values
  const handleClose = () => {
    // Reset local values to original values
    setLocalRentValues(originalRentValues);
    setLocalFlipValues(originalFlipValues);
    onClose();
  };

  // Property details for display
  const propertyDetails = {
    beds: addressData.bedrooms || 'N/A',
    baths: addressData.bathrooms || 'N/A',
    sqft: addressData.square_footage || 'N/A',
    year: addressData.year_built || 'N/A',
  };

  // Calculate afterRepairValue for rent strategy
  const calculateAfterRepairValue = (rent: number, expense: number, capRate: number) => {
    if (capRate === 0) return 0; // Avoid division by zero
    const annualRent = rent * 12;
    const operatingExpense = (annualRent * (expense / 100));
    const netOperatingIncome = annualRent - operatingExpense;
    return netOperatingIncome / (capRate / 100);
  };

  // Calculate estimated offer for flip strategy  
  const calculateEstimatedOffer = (afterRepairValue: number, sellingCosts: number, holdingCosts: number, margin: number) => {
    if (!afterRepairValue || afterRepairValue === 0) return 0;
    
    // Convert percentages to actual amounts
    const sellingCostsAmount = (afterRepairValue * sellingCosts) / 100;
    const holdingCostsAmount = (afterRepairValue * holdingCosts) / 100;
    const marginAmount = (afterRepairValue * margin) / 100;
    
    // Calculate total costs
    return afterRepairValue - sellingCostsAmount - holdingCostsAmount - marginAmount;
  };

  // Update Redux store with local values for real-time price calculation
  const updateReduxWithLocalValues = useCallback(() => {
    // Update rent values in Redux
    const calculatedARV = calculateAfterRepairValue(localRentValues.rent, localRentValues.expense, localRentValues.capRate);
    dispatch(updateRentValues({
      ...localRentValues,
      afterRepairValue: calculatedARV,
      defaultHighRehab: localRentValues.highRehab, // Use current high rehab as default
      customHighRehab: 0, // Initialize with 0
      isUsingCustomHighRehab: false
    }));

    // Update flip values in Redux - use local afterRepairValue
    const calculatedEstimatedOffer = calculateEstimatedOffer(localFlipValues.afterRepairValue, localFlipValues.sellingCosts, localFlipValues.holdingCosts, localFlipValues.margin);
    dispatch(updateFlipValues({
      ...localFlipValues,
      estimatedOffer: calculatedEstimatedOffer,
      defaultHighRehab: localFlipValues.highRehab, // Use current high rehab as default
      customHighRehab: 0, // Initialize with 0
      isUsingCustomHighRehab: false
    }));
  }, [localRentValues, localFlipValues, dispatch]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          <Flex justifyContent="flex-start" alignItems="center">
            <Text>Property Estimate Details</Text>
            <Badge colorScheme="green" fontSize="md" p={1} ml={3}>
              {new Date(estimate?.created_at).toLocaleDateString()}
            </Badge>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Property Header Card */}
            <Flex direction={{ base: "column", md: "row" }} gap={4}>
              {/* Street View Image */}
              <Box borderRadius="md" overflow="hidden" boxShadow="md" width={{ base: "100%", md: "40%" }}>
                <Image
                  src={streetViewUrl}
                  alt={`Street View of ${propertyAddress}`}
                  width="100%"
                  height="200px"
                  objectFit="cover"
                  borderRadius="md"
                />
              </Box>

              {/* Property Details */}
              <Box width={{ base: "100%", md: "60%" }}>
                <Heading as="h3" size="md" color="brand.500" mb={5} fontWeight="bold">
                  <HStack>
                    <Icon as={FaMapMarkerAlt as React.ElementType} />
                    <Text>{propertyAddress}</Text>
                  </HStack>
                </Heading>

                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={3}>
                  <Box bg="gray.50" p={9} borderRadius="lg" textAlign="center">
                    <HStack justifyContent="center">
                      <Icon as={FaBed as React.ElementType} color="brand.500" />
                      <Text fontSize="xl" fontWeight="bold" color="brand.500">{propertyDetails.beds}</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">BEDS</Text>
                  </Box>
                  <Box bg="gray.50" p={8} borderRadius="lg" textAlign="center">
                    <HStack justifyContent="center">
                      <Icon as={FaBath as React.ElementType} color="brand.500" />
                      <Text fontSize="xl" fontWeight="bold" color="brand.500">{propertyDetails.baths}</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">BATHS</Text>
                  </Box>
                  <Box bg="gray.50" p={9} borderRadius="lg" textAlign="center">
                    <HStack justifyContent="center">
                      <Icon as={FaRulerCombined as React.ElementType} color="brand.500" />
                      <Text fontSize="xl" fontWeight="bold" color="brand.500">{propertyDetails.sqft}</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">SQFT</Text>
                  </Box>
                  <Box bg="gray.50" p={9} borderRadius="lg" textAlign="center">
                    <HStack justifyContent="center">
                      <Icon as={FaCalendarAlt as React.ElementType} color="brand.500" />
                      <Text fontSize="xl" fontWeight="bold" color="brand.500">{propertyDetails.year}</Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">YEAR</Text>
                  </Box>
                </SimpleGrid>
              </Box>
            </Flex>

            {/* Offer Range Box */}
                            <BuyerEstimatedPrice 
              strategy={activeTab}
            />

            <Divider />

            {/* Investment Strategy Tabs */}
            <Heading color={"text.primary"} as="h3" size="md" mb={-5}>Underwrite</Heading>
            <Tabs 
              variant="enclosed" 
              align='end'
              colorScheme="green" 
              index={activeTab === 'rent' ? 0 : 1}
            >
                <TabList>
                        <Tab 
                            borderTopRadius="md"
                            borderBottom={0}
                            fontWeight="semibold"
                        >
                            Rental
                        </Tab>
                        <Tab 
                            borderTopRadius="md"
                            borderBottom={0}
                            fontWeight="semibold"
                        >
                            Flip
                        </Tab>
                  </TabList>
              <TabPanels>
                <TabPanel>
                  <RentUnderwriteSliders 
                    initialValues={localRentValues}
                    onSliderChange={handleRentSliderChange}
                    disableReduxUpdates={true}
                  />
                </TabPanel>
                <TabPanel>
                  <FlipUnderwriteSliders 
                    initialValues={localFlipValues}
                    onSliderChange={handleFlipSliderChange}
                    disableReduxUpdates={true}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Notes Section
            <Box>
              <Heading as="h4" size="sm" mb={2} color="text.primary">
                Notes
              </Heading>
              <Textarea
                value={notes}
                placeholder="Add notes about this property estimate..."
                rows={3}
                resize="vertical"
                isReadOnly
              />
            </Box> */}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SavedEstimateModal; 