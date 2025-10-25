import React, { useState, useCallback } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FaDollarSign } from 'react-icons/fa';
import CommonModal from '../../components/CommonModal';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateRentDefaultHighRehab, updateFlipDefaultHighRehab } from '../../store/underwriteSlice';

// Utility function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

interface SqFtRehabCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyData?: {
    squareFootage?: number;
    marketName?: string;
  };
  onCalculationComplete?: (calculation: {
    totalCost: number;
    pricePerSqFt: number;
    highRehab: number;
  }) => void;
}

const SqFtRehabCalculatorModal: React.FC<SqFtRehabCalculatorModalProps> = ({
  isOpen,
  onClose,
  propertyData = {},
  onCalculationComplete
}) => {
  const dispatch = useAppDispatch();
  
  // Get property data from Redux if not provided
  const propertyState = useAppSelector((state: any) => state.property);
  const property = propertyState.properties[0] || null;
  const addressData = property?.addressData?.items?.[0] || null;
  
  // Get current active strategy from Redux
  const underwriteState = useAppSelector((state: any) => state.underwrite);
  const activeStrategy = underwriteState.activeStrategy || 'rent';

  // Extract property details
  const squareFootage = propertyData.squareFootage || addressData?.square_footage || 0;
  const marketName = propertyData.marketName || (addressData ? `${addressData.city}, ${addressData.state_abbreviation || 'TN'}` : 'Memphis, TN');

  // Calculate initial price per sq ft from current rehab value
  const currentRehabValue = activeStrategy === 'rent' 
    ? underwriteState.rent.highRehab 
    : underwriteState.flip.highRehab;
  
  const initialPricePerSqFt = squareFootage > 0 
    ? Math.round(currentRehabValue / squareFootage)
    : 0;

  // State for price per square foot - pre-fill with calculated value
  const [pricePerSqFt, setPricePerSqFt] = useState<number>(initialPricePerSqFt);

  // Update price per sq ft when modal opens or rehab value changes
  React.useEffect(() => {
    if (isOpen) {
      const currentValue = activeStrategy === 'rent' 
        ? underwriteState.rent.highRehab 
        : underwriteState.flip.highRehab;
      
      const calculatedPrice = squareFootage > 0 
        ? Math.round(currentValue / squareFootage)
        : 0;
      
      setPricePerSqFt(calculatedPrice);
    }
  }, [isOpen, activeStrategy, underwriteState.rent.highRehab, underwriteState.flip.highRehab, squareFootage]);

  // Calculate total rehab cost
  const totalRehabCost = pricePerSqFt * squareFootage;

  // Handle apply calculation
  const handleApplyCalculation = useCallback(() => {
    const highRehab = Math.round(totalRehabCost);

    // Update the default high rehab values in Redux for both strategies
    dispatch(updateRentDefaultHighRehab(highRehab));
    dispatch(updateFlipDefaultHighRehab(highRehab));

    onCalculationComplete?.({
      totalCost: totalRehabCost,
      pricePerSqFt,
      highRehab
    });
    
    onClose();
  }, [totalRehabCost, pricePerSqFt, dispatch, onCalculationComplete, onClose]);

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      closeOnOverlayClick={false}
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="brand.500" mb={1}>
            {marketName} Rehab Calculator
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Calculate rehab costs per square foot for {squareFootage.toLocaleString()} sq ft property
          </Text>
        </Box>

        {/* Price per Sq Ft Input */}
        <Box 
          bg="background.secondary" 
          p={6} 
          borderRadius="lg"
          border="1px solid"
          borderColor="border.primary"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={3} justify="center">
              <Icon as={FaDollarSign as React.ElementType} boxSize={6} color="brand.500" />
              <Text fontWeight="bold" fontSize="lg" color="text.primary">
                Price Per Square Foot
              </Text>
            </HStack>

            <HStack spacing={2} justify="center">
              <Text fontWeight="bold" flexShrink={0} fontSize="lg">$</Text>
              <NumberInput 
                value={pricePerSqFt}
                step={1}
                min={0}
                max={500}
                onChange={(valueString, valueNumber) => {
                  setPricePerSqFt(isNaN(valueNumber) ? 0 : valueNumber);
                }}
                size="lg"
                width="200px"
                borderRadius="md"
              >
                <NumberInputField 
                  fontWeight="bold" 
                  fontSize="lg" 
                  textAlign="center"
                  placeholder="0"
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontWeight="bold" flexShrink={0} fontSize="lg">/sq ft</Text>
            </HStack>

            <Text fontSize="sm" color="text.secondary" textAlign="center">
              Enter the estimated rehab cost per square foot
            </Text>
          </VStack>
        </Box>

        <Divider />

        {/* Calculation Summary */}
        <Box bg="background.secondary" p={4} borderRadius="lg">
          <VStack spacing={3}>
            <HStack justify="space-between" w="full">
              <Text fontSize="md" color="text.secondary">Property Size:</Text>
              <Text fontSize="md" fontWeight="semibold">
                {squareFootage.toLocaleString()} sq ft
              </Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text fontSize="md" color="text.secondary">Price Per Sq Ft:</Text>
              <Text fontSize="md" fontWeight="semibold">
                {formatCurrency(pricePerSqFt)}/sq ft
              </Text>
            </HStack>
            <Divider />
            <HStack justify="space-between" w="full">
              <Text fontSize="lg" fontWeight="bold" color="text.primary">
                Total Rehab Cost:
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="brand.500">
                {formatCurrency(totalRehabCost)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Action Buttons */}
        <HStack spacing={3} justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="brand" 
            onClick={handleApplyCalculation}
            isDisabled={pricePerSqFt <= 0 || squareFootage <= 0}
          >
            Update Rehab Costs
          </Button>
        </HStack>
      </VStack>
    </CommonModal>
  );
};

export default SqFtRehabCalculatorModal;