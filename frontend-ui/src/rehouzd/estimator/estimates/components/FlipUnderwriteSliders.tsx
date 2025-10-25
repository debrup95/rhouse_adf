import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Flex, SimpleGrid, VStack, NumberInput, NumberInputField, HStack, Button, Switch, FormControl, FormLabel, Stack, useBreakpointValue } from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateFlipValues, toggleFlipHighRehabMode, setFlipCustomHighRehab, updateFlipHighRehabValue } from '../../store/underwriteSlice';

// Debounce hook to reduce expensive calculations and Redux updates during typing
const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
};

// Utility function to format number with commas for display
const formatNumberWithCommas = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

// Utility function to parse number from comma-formatted string
const parseNumberFromCommas = (value: string): number => {
  const cleanedValue = value.replace(/,/g, '');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

// Utility function to get dynamic font size accounting for commas
const getDynamicFontSize = (value: string) => {
  // Remove commas for length calculation since they don't represent significant digits
  const digitLength = value.replace(/,/g, '').length;
  // Optimized for perfect display of 8-digit numbers (especially for ARV)
  if (digitLength > 8) return 'md';   // For 9+ digit numbers (> 100 million)
  return 'lg';                        // Perfect for 8 digits and below (up to $99,999,999)
};

interface FlipUnderwriteSlidersProps {
  initialValues?: {
    sellingCosts?: number;
    holdingCosts?: number;
    margin?: number;
    highRehab?: number;
    afterRepairValue?: number;
  };
  onSliderChange?: (key: string, value: number) => void;
  onValuesChanged?: (values: {
    sellingCosts: number;
    holdingCosts: number;
    margin: number;
    highRehab: number;
    afterRepairValue: number;
    estimatedOffer: number;
    defaultHighRehab: number;
    customHighRehab: number;
    isUsingCustomHighRehab: boolean;
  }) => void;
  disableReduxUpdates?: boolean;
  onDetailedCalculatorClick?: () => void;
  onSqFtCalculatorClick?: () => void;
}

const FlipUnderwriteSliders: React.FC<FlipUnderwriteSlidersProps> = ({ 
  initialValues = {}, 
  onSliderChange = () => {},
  onValuesChanged = () => {},
  onDetailedCalculatorClick,
  onSqFtCalculatorClick
}) => {
  // Get persisted values from Redux store
  const dispatch = useAppDispatch();
  const persistedValues = useAppSelector(state => state.underwrite.flip);
  // Get offer range from Redux store to calculate estimated purchase percentage
  const offerRange = useAppSelector(state => state.underwrite.offerRange);
  // Get active strategy to ensure updates when rental/flip toggle is switched
  const activeStrategy = useAppSelector(state => state.underwrite.activeStrategy);
  
  // Use persisted values or provided initial values
  const [sellingCosts, setSellingCosts] = useState(
    initialValues.sellingCosts ?? persistedValues.sellingCosts ?? 0
  );
  const [holdingCosts, setHoldingCosts] = useState(
    initialValues.holdingCosts ?? persistedValues.holdingCosts ?? 0
  );
  const [margin, setMargin] = useState(
    initialValues.margin ?? persistedValues.margin ?? 0
  );
  
  const [highRehab, setHighRehab] = useState(
    initialValues.highRehab ?? persistedValues.highRehab ?? 0 
  );
  // Use the afterRepairValue from initialValues (from backend) or from Redux
  const [afterRepairValue, setAfterRepairValue] = useState(
    initialValues.afterRepairValue ?? persistedValues.afterRepairValue ?? 0
  );

  // Debounced values to avoid recalculating and dispatching on every keystroke
  const debouncedSellingCosts = useDebouncedValue(sellingCosts, 250);
  const debouncedHoldingCosts = useDebouncedValue(holdingCosts, 250);
  const debouncedMargin = useDebouncedValue(margin, 250);
  const debouncedHighRehab = useDebouncedValue(highRehab, 250);
  const debouncedAfterRepairValue = useDebouncedValue(afterRepairValue, 250);

  // Add temporary input states to handle partial typing
  const [sellingCostsInput, setSellingCostsInput] = useState((sellingCosts || 0).toString());
  const [holdingCostsInput, setHoldingCostsInput] = useState((holdingCosts || 0).toString());
  const [marginInput, setMarginInput] = useState((margin || 0).toString());

  const [highRehabInput, setHighRehabInput] = useState((highRehab || 0).toString());
  const [afterRepairValueInput, setAfterRepairValueInput] = useState((afterRepairValue || 0).toString());

  // State for dynamic font sizes
  const [sellingCostsInputFontSize, setSellingCostsInputFontSize] = useState('lg');
  const [holdingCostsInputFontSize, setHoldingCostsInputFontSize] = useState('lg');
  const [marginInputFontSize, setMarginInputFontSize] = useState('lg');

  const [highRehabInputFontSize, setHighRehabInputFontSize] = useState('lg');
  const [afterRepairValueInputFontSize, setAfterRepairValueInputFontSize] = useState('lg');
  
  // Local state to track current mode for immediate UI updates
  const [currentMode, setCurrentMode] = useState<'sqft' | 'itemized'>(
    persistedValues.isUsingCustomHighRehab ? 'itemized' : 'sqft'
  );

  // Track focus to avoid rewriting input value while typing (prevents caret reset)
  const [isSellingFocused, setIsSellingFocused] = useState(false);
  const [isHoldingFocused, setIsHoldingFocused] = useState(false);
  const [isMarginFocused, setIsMarginFocused] = useState(false);
  const [isArvFocused, setIsArvFocused] = useState(false);

  // Update input states when main values change
  useEffect(() => {
    // Only sync display when not focused to preserve caret and avoid flicker
    if (!isSellingFocused) {
      setSellingCostsInput(sellingCosts.toString());
    }
    if (!isHoldingFocused) {
      setHoldingCostsInput(holdingCosts.toString());
    }
    if (!isMarginFocused) {
      setMarginInput(margin.toString());
    }
    setHighRehabInput(formatNumberWithCommas(highRehab));
    if (!isArvFocused) {
      setAfterRepairValueInput(formatNumberWithCommas(afterRepairValue));
    }
  }, [sellingCosts, holdingCosts, margin, highRehab, afterRepairValue, isSellingFocused, isHoldingFocused, isMarginFocused, isArvFocused]);

  // useEffect hooks to update font sizes based on input string length
  useEffect(() => {
    setSellingCostsInputFontSize(getDynamicFontSize(sellingCostsInput));
  }, [sellingCostsInput]);

  useEffect(() => {
    setHoldingCostsInputFontSize(getDynamicFontSize(holdingCostsInput));
  }, [holdingCostsInput]);

  useEffect(() => {
    setMarginInputFontSize(getDynamicFontSize(marginInput));
  }, [marginInput]);



  useEffect(() => {
    setHighRehabInputFontSize(getDynamicFontSize(highRehabInput));
  }, [highRehabInput]);

  useEffect(() => {
    setAfterRepairValueInputFontSize(getDynamicFontSize(afterRepairValueInput));
  }, [afterRepairValueInput]);

  // Sync high rehab value when toggle state changes
  useEffect(() => {
    // Update local mode state when Redux state changes
    setCurrentMode(persistedValues.isUsingCustomHighRehab ? 'itemized' : 'sqft');
    
    if (!persistedValues.isUsingCustomHighRehab && persistedValues.defaultHighRehab !== highRehab && persistedValues.defaultHighRehab > 0) {
      // If we're in default mode and the default value is different, update to default
      setHighRehab(persistedValues.defaultHighRehab);
    } else if (persistedValues.isUsingCustomHighRehab && persistedValues.customHighRehab !== highRehab && persistedValues.customHighRehab >= 0 && persistedValues.customHighRehab !== persistedValues.defaultHighRehab) {
      // If we're in custom mode and the custom value is different, update to custom
      setHighRehab(persistedValues.customHighRehab);
    }
  }, [persistedValues.isUsingCustomHighRehab, persistedValues.defaultHighRehab, persistedValues.customHighRehab]);

  // Fixed min/max ranges as requested
  const sellingCostsRange = { min: 0, max: 10 };
  const holdingCostsRange = { min: 1, max: 10 };
  const marginRange = { min: 5, max: 40 };
  
  // Dynamic rehab ranges based on initial values (±$10k)

  // const [highRehabRange, setHighRehabRange] = useState({ min: Math.max(0, highRehab - 10000), max: highRehab + 10000 });

  // Dynamic rehab ranges based on initial values (±$10k)

  const [highRehabRange] = useState({ min: Math.max(0, highRehab - 10000), max: highRehab + 10000 });

  // Responsive values for mobile optimization
  const stackDirection = useBreakpointValue({ base: 'column', md: 'row' }) as 'column' | 'row';
  const textSize = useBreakpointValue({ base: 'md', md: 'xl' });
  const spacing = useBreakpointValue({ base: 3, md: 6 });

  // Use a ref to track if we're in the middle of an update
  const isUpdatingRef = useRef(false);
  
  // Use a ref to store previous values for comparison
  const prevValuesRef = useRef({
    sellingCosts: debouncedSellingCosts,
    holdingCosts: debouncedHoldingCosts,
    margin: debouncedMargin,
    highRehab: debouncedHighRehab,
    afterRepairValue: debouncedAfterRepairValue,
    estimatedOffer: 0
  });

  // Add debounce timeout refs for number inputs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update state when initialValues change
  useEffect(() => {
    // Skip if we're updating internally
    if (isUpdatingRef.current) return;
    
    // Only update if initialValues are explicitly provided
    if (initialValues.sellingCosts !== undefined) {
      setSellingCosts(initialValues.sellingCosts);
    }
    if (initialValues.holdingCosts !== undefined) {
      setHoldingCosts(initialValues.holdingCosts);
    }
    if (initialValues.margin !== undefined) {
      setMargin(initialValues.margin);
    }

    if (initialValues.highRehab !== undefined) 
      {
        setHighRehab(initialValues.highRehab);
        // setHighRehabRange({ min: Math.max(0, initialValues.highRehab - 10000), max: initialValues.highRehab + 10000 });
      }
    if (initialValues.afterRepairValue !== undefined) {
      setAfterRepairValue(initialValues.afterRepairValue);
    }
  }, [initialValues]);

  // Calculate estimated offer based on current values (use immediate state for initial render)
  const calculateEstimatedOffer = useCallback(() => {
    // If afterRepairValue is 0, return 0 for the estimated offer
    if (!afterRepairValue || afterRepairValue === 0) {
      return 0;
    }
    
    // Convert percentages to actual amounts
    const sellingCostsAmount = (afterRepairValue * sellingCosts) / 100;
    const holdingCostsAmount = (afterRepairValue * holdingCosts) / 100;
    const marginAmount = (afterRepairValue * margin) / 100;
    
    const totalCosts = afterRepairValue - sellingCostsAmount - holdingCostsAmount - marginAmount;
    
   return totalCosts;
  }, [afterRepairValue, sellingCosts, holdingCosts, margin]);

  // Add useMemo to calculate estimated offer whenever relevant values change
  const estimatedOffer = useMemo(() => {
    return calculateEstimatedOffer();
  }, [calculateEstimatedOffer]);

  // Calculate estimated purchase percentage
  const estimatedPurchasePercentage = useMemo(() => {
    // Only show value if this is the active strategy
    if (activeStrategy !== 'flip') {
      return null;
    }
    
    if (!afterRepairValue || afterRepairValue === 0) {
      return null; // Return null to indicate no valid calculation
    }
    
    // Calculate the actual buyer estimated purchase price: estimatedOffer - rehab costs
    const buyerEstimatedPurchasePrice = estimatedOffer - highRehab;
    
    if (buyerEstimatedPurchasePrice <= 0) {
      return null;
    }
    
    // ARV % = (Buyer Estimated Offer / ARV) × 100
    return Math.round((buyerEstimatedPurchasePrice / afterRepairValue) * 100);
  }, [estimatedOffer, afterRepairValue, highRehab, activeStrategy]);

  // Memoize the function that updates Redux and calls onValuesChanged
  const updateValues = useCallback(() => {
    const currentValues = {
      sellingCosts: debouncedSellingCosts,
      holdingCosts: debouncedHoldingCosts,
      margin: debouncedMargin,
      highRehab: debouncedHighRehab,
      afterRepairValue: debouncedAfterRepairValue,
      estimatedOffer
    };
    
    // Only update if values have actually changed
    const prevValues = prevValuesRef.current;
    
    if (
      prevValues.sellingCosts !== currentValues.sellingCosts ||
      prevValues.holdingCosts !== currentValues.holdingCosts ||
      prevValues.margin !== currentValues.margin ||
      prevValues.highRehab !== currentValues.highRehab ||
      prevValues.afterRepairValue !== currentValues.afterRepairValue ||
      prevValues.estimatedOffer !== currentValues.estimatedOffer
    ) {
      // Update the previous values ref
      prevValuesRef.current = { ...currentValues };
      
      // Update Redux store - include existing default values
      dispatch(updateFlipValues({
        ...currentValues,
        defaultHighRehab: persistedValues.defaultHighRehab,
        customHighRehab: persistedValues.customHighRehab,
        isUsingCustomHighRehab: persistedValues.isUsingCustomHighRehab
      }));
      
      // Set flag to prevent reacting to the initialValues change
      isUpdatingRef.current = true;
      onValuesChanged({
        ...currentValues,
        defaultHighRehab: persistedValues.defaultHighRehab,
        customHighRehab: persistedValues.customHighRehab,
        isUsingCustomHighRehab: persistedValues.isUsingCustomHighRehab
      });
      
      // Reset flag after a timeout
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [debouncedSellingCosts, debouncedHoldingCosts, debouncedMargin, debouncedHighRehab, debouncedAfterRepairValue, estimatedOffer, dispatch, onValuesChanged, persistedValues.defaultHighRehab, persistedValues.customHighRehab, persistedValues.isUsingCustomHighRehab]);

  // Call updateValues when values change, but use a debounce approach
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateValues();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [updateValues]);

  // Handle slider change and call parent callback
  const handleSliderChange = (key: string, value: number) => {
    switch(key) {
      case 'sellingCosts':
        setSellingCosts(value);
        break;
      case 'holdingCosts':
        setHoldingCosts(value);
        break;
      case 'margin':
        setMargin(value);
        break;
      
      case 'highRehab':
        setHighRehab(value);
        // Update the appropriate value based on current mode without changing mode
        dispatch(updateFlipHighRehabValue(value));
        break;
      case 'afterRepairValue':
        setAfterRepairValue(value);
        break;
    }
    onSliderChange(key, value);
  };

  // Handle input change without immediately updating state
  const handleInputChange = (key: string, value: string) => {
    switch(key) {
      case 'sellingCosts':
        setSellingCostsInput(value);
        break;
      case 'holdingCosts':
        setHoldingCostsInput(value);
        break;
      case 'margin':
        setMarginInput(value);
        break;
      
      case 'highRehab':
        setHighRehabInput(value);
        break;
      case 'afterRepairValue':
        setAfterRepairValueInput(value);
        break;
    }
  };

  // Handle direct number input change on blur or enter
  const handleNumberChange = (key: string, valueAsString: string, valueAsNumber: number) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Value is already cleaned and parsed in the onChange handler
      const value = valueAsNumber;
      
      switch(key) {
        case 'sellingCosts':
          setSellingCosts(value);
          break;
        case 'holdingCosts':
          setHoldingCosts(value);
          break;
        case 'margin':
          setMargin(value);
          break;

        case 'highRehab':
          setHighRehab(value);
          // Update the appropriate value based on current mode without changing mode
          dispatch(updateFlipHighRehabValue(value));
          break;
        case 'afterRepairValue':
          setAfterRepairValue(value);
          break;
      }
      
      onSliderChange(key, value);
      
      debounceTimeoutRef.current = null;
    }, 800); 
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Box py={6} px={8} bg="gray.50" borderRadius="lg">
      {/* Horizontal layout for sliders */}
      <SimpleGrid columns={{base: 2, md: 4}} spacing={4} mb={8}>
        {/* Selling Costs Slider */}
        <Box bg="white" p={4} borderRadius="md" shadow="sm">
          <VStack align="center" spacing={2}>
            <Text fontWeight="semibold" fontSize="md" color="gray.700" mt={3}>Selling Costs</Text>
            <HStack width="100%" justify="center" mb={5}>
              <NumberInput 
                value={sellingCostsInput}
                step={0.1}
                precision={1}
                onChange={(valueString) => {
                  setSellingCostsInput(valueString);
                  const parsed = parseFloat(valueString);
                  handleInputChange('sellingCosts', valueString);
                  handleNumberChange('sellingCosts', valueString, isNaN(parsed) ? 0 : parsed);
                }}
                size="sm"
                maxW="150px"
                borderRadius="md"
                keepWithinRange={false}
                onFocus={() => setIsSellingFocused(true)}
                onBlur={() => {
                  setIsSellingFocused(false);
                  if (sellingCostsInput === '' || isNaN(Number(sellingCostsInput))) {
                    setSellingCostsInput('0');
                  }
                }}
              >
                <NumberInputField fontWeight="bold" fontSize={sellingCostsInputFontSize} />
              </NumberInput>
              <Text>%</Text>
            </HStack>
            <Slider 
              min={sellingCostsRange.min} 
              max={sellingCostsRange.max} 
              step={0.1} 
              value={sellingCosts} 
              onChange={(val) => handleSliderChange('sellingCosts', val)}
              aria-label="Selling Costs"
              colorScheme="green"
            >
              <SliderTrack h="3px">
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={4} />
            </Slider>
          </VStack>
        </Box>

        {/* Holding Costs Slider */}
        <Box bg="white" p={4} borderRadius="md" shadow="sm">
          <VStack align="center" spacing={2}>
            <Text fontWeight="semibold" fontSize="sm" color="gray.700" mt={3}>Holding Costs</Text>
            <HStack width="100%" justify="center" mb={5}>
              <NumberInput 
                value={holdingCostsInput}
                step={0.1}
                precision={1}
                onChange={(valueString) => {
                  setHoldingCostsInput(valueString);
                  const parsed = parseFloat(valueString);
                  handleInputChange('holdingCosts', valueString);
                  handleNumberChange('holdingCosts', valueString, isNaN(parsed) ? 0 : parsed);
                }}
                size="sm"
                maxW="150px"
                borderRadius="md"
                keepWithinRange={false}
                onFocus={() => setIsHoldingFocused(true)}
                onBlur={() => {
                  setIsHoldingFocused(false);
                  if (holdingCostsInput === '' || isNaN(Number(holdingCostsInput))) {
                    setHoldingCostsInput('0');
                  }
                }}
              >
                <NumberInputField fontWeight="bold" fontSize={holdingCostsInputFontSize} />
              </NumberInput>
              <Text>%</Text>
            </HStack>
            <Slider 
              min={holdingCostsRange.min} 
              max={holdingCostsRange.max} 
              step={0.1} 
              value={holdingCosts} 
              onChange={(val) => handleSliderChange('holdingCosts', val)}
              aria-label="Holding Costs"
              colorScheme="green"
            >
              <SliderTrack h="3px">
                <SliderFilledTrack />
              </SliderTrack>
                <SliderThumb boxSize={4} />
            </Slider>
          </VStack>
        </Box>

        {/* Margin Slider */}
        <Box bg="white" p={4} borderRadius="md" shadow="sm">
          <VStack align="center" spacing={2}>
            <Text fontWeight="semibold" fontSize="md" color="gray.700" mt={3}>Margin</Text>
            <HStack width="100%" justify="center" mb={5}>
              <NumberInput 
                value={marginInput}
                step={0.1}
                precision={1}
                onChange={(valueString) => {
                  setMarginInput(valueString);
                  const parsed = parseFloat(valueString);
                  handleInputChange('margin', valueString);
                  handleNumberChange('margin', valueString, isNaN(parsed) ? 0 : parsed);
                }}
                size="sm"
                maxW="150px"
                borderRadius="md"
                keepWithinRange={false}
                onFocus={() => setIsMarginFocused(true)}
                onBlur={() => {
                  setIsMarginFocused(false);
                  if (marginInput === '' || isNaN(Number(marginInput))) {
                    setMarginInput('0');
                  }
                }}
              >
                <NumberInputField fontWeight="bold" fontSize={marginInputFontSize} />
              </NumberInput>
              <Text>%</Text>
            </HStack>
            <Slider 
              min={marginRange.min} 
              max={marginRange.max} 
              step={0.1} 
              value={margin} 
              onChange={(val) => handleSliderChange('margin', val)}
              aria-label="Margin"
              colorScheme="green"
            >
              <SliderTrack h="3px">
                <SliderFilledTrack />
              </SliderTrack>
                <SliderThumb boxSize={4} />
            </Slider>
          </VStack>
        </Box>



        {/* Rehab with Pill Toggle */}
        <Box 
          bg="white" 
          p={4} 
          borderRadius="md" 
          shadow="sm"
          cursor="pointer"
          onClick={() => {
            // Clicking anywhere in the card opens the currently selected mode's modal
            if (currentMode === 'itemized') {
              onDetailedCalculatorClick?.();
            } else {
              onSqFtCalculatorClick?.();
            }
          }}
          _hover={{ shadow: "md" }}
          transition="shadow 0.2s"
        >
          <VStack align="center" spacing={2}>
            <Text fontWeight="semibold" fontSize="md" color="gray.700" mt={3}>Rehab</Text>
            
            <HStack width="100%" mb={5} spacing={1} justifyContent="flex-start" ml={-4}>
              <Text fontWeight="bold" flexShrink={0}>$</Text>
              <NumberInput 
                value={highRehabInput}
                step={1000}
                onChange={(valueString) => {
                  // Remove commas for processing but keep original string for display
                  const cleanValue = valueString.replace(/,/g, '');
                  const numericValue = parseFloat(cleanValue) || 0;
                  
                  // Update input with formatted value
                  const formattedValue = formatNumberWithCommas(numericValue);
                  handleInputChange('highRehab', formattedValue);
                  handleNumberChange('highRehab', cleanValue, numericValue);
                }}
                size="sm"
                flex="1"
                minW="110px"
                borderRadius="md"
                keepWithinRange={false}
                isDisabled={true}
              >
                <NumberInputField fontWeight="bold" fontSize={highRehabInputFontSize} />
              </NumberInput>
            </HStack>
            <Slider 
              min={highRehabRange.min} 
              max={highRehabRange.max} 
              step={1000} 
              value={highRehab} 
              onChange={(val) => handleSliderChange('highRehab', val)}
              aria-label="High Rehab"
              colorScheme="green"
              isDisabled={true}
            >
              <SliderTrack h="3px">
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={4} />
            </Slider>
            
            {/* Compact Toggle Buttons Below Slider */}
            {/* Pill Toggle - Clicking either side opens the respective modal */}
            <HStack 
              spacing={0} 
              borderRadius="lg" 
              overflow="hidden" 
              border="1px solid" 
              borderColor="gray.600" 
              mt={3}
              onClick={(e) => e.stopPropagation()} // Prevent card click when clicking toggle
            >
                             <Button
                 size="xs"
                 variant="unstyled"
                 bg={currentMode === 'sqft' ? "brand.500" : "transparent"}
                 color={currentMode === 'sqft' ? "white" : "gray.600"}
                 borderRadius={currentMode === 'sqft' ? "md" : "none"}
                 border="none"
                 _hover={{ 
                   bg: currentMode === 'sqft' ? 'brand.600' : 'gray.50',
                   color: currentMode === 'sqft' ? "white" : "gray.700"
                 }}
                 fontSize="xs"
                 fontWeight="medium"
                 px={4}
                 paddingBottom={2}
                paddingTop={1}
                 mt={1}
                 mb={1}
                 ml={1}
                 mr={1}
                onClick={() => {
                  if (persistedValues.isUsingCustomHighRehab) {
                    // If in custom mode, switch to Sq Ft mode and open modal
                    dispatch(toggleFlipHighRehabMode());
                    setCurrentMode('sqft');
                  }
                  // Always open SqFt calculator when clicking Sq Ft button
                  onSqFtCalculatorClick?.();
                }}
              >
                Sq Ft
              </Button>
              {onDetailedCalculatorClick && (
                                 <Button
                   size="xs"
                   variant="unstyled"
                   bg={currentMode === 'itemized' ? "brand.500" : "transparent"}
                   color={currentMode === 'itemized' ? "white" : "gray.600"}
                   borderRadius={currentMode === 'itemized' ? "md" : "none"}
                   border="none"
                   _hover={{ 
                     bg: currentMode === 'itemized' ? 'brand.600' : 'gray.50',
                     color: currentMode === 'itemized' ? "white" : "gray.700"
                   }}
                   fontSize="xs"
                   fontWeight="medium"
                   px={4}
                   paddingBottom={2}
                   paddingTop={1}
                   mt={1}
                   mb={1}
                   ml={1}
                   mr={1}
                  onClick={() => {
                    if (!persistedValues.isUsingCustomHighRehab) {
                      // If not in custom mode, switch to custom mode and open modal
                      dispatch(toggleFlipHighRehabMode());
                      setCurrentMode('itemized');
                    }
                    // Always open detailed calculator when clicking Itemized button
                    onDetailedCalculatorClick();
                  }}
                >
                  Itemized
                </Button>
              )}
            </HStack>
            
            {/* Instructional note */}
            <Text fontSize="xs" color="gray.600" mt={1}>
              *Click to edit rehab cost
            </Text>
          </VStack>
        </Box>
      </SimpleGrid>

      {/* After Repair Value and Estimated Offer */}
      <Stack 
        direction={stackDirection} 
        justify={{ base: 'center', md: 'space-between' }} 
        align={{ base: 'center', md: 'center' }}
        spacing={spacing}
        pt={6} 
        mt={4} 
        borderTopWidth="1px" 
        borderColor="gray.200"
      >
        <Flex align="center" direction={{ base: 'column', sm: 'row' }} textAlign={{ base: 'center', sm: 'left' }}>
          <Text fontWeight="semibold" fontSize={textSize} color="gray.700" mr={{ base: 0, sm: 2 }} mb={{ base: 1, sm: 0 }}>
            Estimated Purchase:
          </Text>
          <Text fontWeight="bold" fontSize={textSize} color="green.600">
            {estimatedPurchasePercentage !== null ? `${estimatedPurchasePercentage}% ARV` : "—"}
          </Text>
        </Flex>
        <Flex align="center" direction={{ base: 'column', sm: 'row' }} textAlign={{ base: 'center', sm: 'left' }}>
          <Text fontWeight="semibold" fontSize={textSize} color="gray.700" mr={{ base: 0, sm: 2 }} mb={{ base: 1, sm: 0 }}>
            After Repair Value:
          </Text>
          <HStack spacing={1}>
            <Text fontWeight="bold" flexShrink={0}>$</Text>
            <NumberInput 
              value={afterRepairValueInput}
              step={1000}
              onChange={(valueString) => {
                // Do not format while typing to preserve caret
                const cleanValue = valueString.replace(/,/g, '');
                const numericValue = parseFloat(cleanValue);
                handleInputChange('afterRepairValue', valueString);
                handleNumberChange('afterRepairValue', cleanValue, isNaN(numericValue) ? 0 : numericValue);
              }}
              size="sm"
              minW="100px"
              maxW={{ base: "140px", sm: "120px" }}
              borderRadius="md"
              keepWithinRange={false}
              onFocus={() => setIsArvFocused(true)}
              onBlur={() => {
                setIsArvFocused(false);
                const clean = afterRepairValueInput.replace(/,/g, '');
                const numericValue = parseFloat(clean);
                const coerced = isNaN(numericValue) ? 0 : numericValue;
                setAfterRepairValueInput(formatNumberWithCommas(coerced));
              }}
            >
              <NumberInputField fontWeight="bold" fontSize={afterRepairValueInputFontSize} color="red.600" textAlign="right" px={2}/>
            </NumberInput>
          </HStack>
        </Flex>
      </Stack>
    </Box>
  );
};

export default React.memo(FlipUnderwriteSliders);