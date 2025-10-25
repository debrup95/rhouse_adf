import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Box,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Flex,
  SimpleGrid,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Button,
  Input,
  Switch,
  FormControl,
  FormLabel,
  Stack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  updateRentValues,
  toggleRentHighRehabMode,
  setRentCustomHighRehab,
  updateRentHighRehabValue,
} from "../../store/underwriteSlice";
import { motion, AnimatePresence } from "framer-motion";
import { calculateBuyerEstimatedPrice } from "../../utils/calculateBuyerEstimatedPrice";

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
  return new Intl.NumberFormat("en-US").format(value);
};

// Utility function to parse number from comma-formatted string
const parseNumberFromCommas = (value: string): number => {
  const cleanedValue = value.replace(/,/g, "");
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

// Utility function to get dynamic font size accounting for commas
const getDynamicFontSize = (value: string) => {
  // Remove commas for length calculation since they don't represent significant digits
  const digitLength = value.replace(/,/g, "").length;
  // Optimized for perfect display of 8-digit numbers (especially for ARV)
  if (digitLength > 8) return "md"; // For 9+ digit numbers (> 100 million)
  return "lg"; // Perfect for 8 digits and below (up to $99,999,999)
};

interface RentUnderwriteSlidersProps {
  initialValues?: {
    rent?: number;
    expense?: number;
    capRate?: number;
    highRehab?: number;
  };
  onSliderChange?: (key: string, value: number) => void;
  onValuesChanged?: (values: {
    rent: number;
    expense: number;
    capRate: number;
    highRehab: number;
    afterRepairValue: number;
    defaultHighRehab: number;
    customHighRehab: number;
    isUsingCustomHighRehab: boolean;
  }) => void;
  disableReduxUpdates?: boolean;
  onDetailedCalculatorClick?: () => void;
  onSqFtCalculatorClick?: () => void;
}

const RentUnderwriteSliders: React.FC<RentUnderwriteSlidersProps> = ({
  initialValues = {},
  onSliderChange = () => {},
  onValuesChanged = () => {},
  onDetailedCalculatorClick,
  onSqFtCalculatorClick,
}) => {
  const dispatch = useAppDispatch();
  const persistedValues = useAppSelector((state) => state.underwrite.rent);
  // Get active strategy to ensure updates when rental toggle is switched
  const activeStrategy = useAppSelector(
    (state) => state.underwrite.activeStrategy
  );
  // Get address data for property condition
  const addressData = useAppSelector((state) => state.address);
  // Get flip data for holding costs (needed for fixer property calculation)
  const flipData = useAppSelector((state) => state.underwrite.flip);

  const [rent, setRent] = useState(
    initialValues.rent ?? persistedValues.rent ?? 0
  );
  const [expense, setExpense] = useState(
    initialValues.expense ?? persistedValues.expense ?? 0
  );
  const [capRate, setCapRate] = useState(
    initialValues.capRate ?? persistedValues.capRate ?? 0
  );

  const [highRehab, setHighRehab] = useState(
    initialValues.highRehab ?? persistedValues.highRehab ?? 0
  );

  const [rentInput, setRentInput] = useState((rent || 0).toString());
  const [expenseInput, setExpenseInput] = useState((expense || 0).toString());
  const [capRateInput, setCapRateInput] = useState((capRate || 0).toString());

  const [highRehabInput, setHighRehabInput] = useState(
    (highRehab || 0).toString()
  );

  // State for dynamic font sizes
  const [rentInputFontSize, setRentInputFontSize] = useState("lg");
  const [expenseInputFontSize, setExpenseInputFontSize] = useState("lg");
  const [capRateInputFontSize, setCapRateInputFontSize] = useState("lg");

  const [highRehabInputFontSize, setHighRehabInputFontSize] = useState("lg");

  // Track focus to avoid rewriting input value while typing (prevents caret reset)
  const [isRentFocused, setIsRentFocused] = useState(false);
  const [isExpenseFocused, setIsExpenseFocused] = useState(false);
  const [isCapRateFocused, setIsCapRateFocused] = useState(false);

  // Local state to track current mode for immediate UI updates
  const [currentMode, setCurrentMode] = useState<"sqft" | "itemized">(
    persistedValues.isUsingCustomHighRehab ? "itemized" : "sqft"
  );

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const expenseRange = { min: 5, max: 70 };
  const capRateRange = { min: 1.5, max: 20 };

  // const [rentRange, setRentRange] = useState({ min: Math.max(0, rent - 500), max: rent + 500 });

  // const [highRehabRange, setHighRehabRange] = useState({ min: Math.max(0, highRehab - 10000), max: highRehab + 10000 })

  const [rentRange] = useState({
    min: Math.max(0, rent - 500),
    max: rent + 500,
  });

  const [highRehabRange] = useState({
    min: Math.max(0, highRehab - 10000),
    max: highRehab + 10000,
  });

  // Responsive values for mobile optimization
  const stackDirection = useBreakpointValue({ base: "column", md: "row" }) as
    | "column"
    | "row";
  const textSize = useBreakpointValue({ base: "md", md: "xl" });
  const spacing = useBreakpointValue({ base: 3, md: 6 });

  const isUpdatingRef = useRef(false);

  // Debounced values to avoid recalculating and dispatching on every keystroke
  const debouncedRent = useDebouncedValue(rent, 250);
  const debouncedExpense = useDebouncedValue(expense, 250);
  const debouncedCapRate = useDebouncedValue(capRate, 250);
  const debouncedHighRehab = useDebouncedValue(highRehab, 250);

  const prevValuesRef = useRef({
    rent: debouncedRent,
    expense: debouncedExpense,
    capRate: debouncedCapRate,
    highRehab: debouncedHighRehab,
    afterRepairValue: 0,
  });

  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (initialValues.rent !== undefined) {
      setRent(initialValues.rent);
      // setRentRange({ min: Math.max(0, initialValues.rent - 500), max: initialValues.rent + 500 });
    }
    if (initialValues.expense !== undefined) {
      setExpense(initialValues.expense);
    }
    if (initialValues.capRate !== undefined) {
      setCapRate(initialValues.capRate);
    }

    if (initialValues.highRehab !== undefined) {
      setHighRehab(initialValues.highRehab);
      // setHighRehabRange({ min: Math.max(0, initialValues.highRehab - 10000), max: initialValues.highRehab + 10000 });
    }
  }, [initialValues]);

  useEffect(() => {
    // Only sync display when not focused to preserve caret and avoid flicker
    if (!isRentFocused) {
      setRentInput(formatNumberWithCommas(rent));
    }
    if (!isExpenseFocused) {
      setExpenseInput(expense.toString());
    }
    if (!isCapRateFocused) {
      setCapRateInput(capRate.toString());
    }
    setHighRehabInput(formatNumberWithCommas(highRehab));
  }, [rent, expense, capRate, highRehab, isRentFocused, isExpenseFocused, isCapRateFocused]);

  // useEffect hooks to update font sizes based on input string length
  useEffect(() => {
    setRentInputFontSize(getDynamicFontSize(rentInput));
  }, [rentInput]);

  useEffect(() => {
    setExpenseInputFontSize(getDynamicFontSize(expenseInput));
  }, [expenseInput]);

  useEffect(() => {
    setCapRateInputFontSize(getDynamicFontSize(capRateInput));
  }, [capRateInput]);

  useEffect(() => {
    setHighRehabInputFontSize(getDynamicFontSize(highRehabInput));
  }, [highRehabInput]);

  // Sync high rehab value when toggle state changes
  useEffect(() => {

    // Update local mode state when Redux state changes
    setCurrentMode(
      persistedValues.isUsingCustomHighRehab ? "itemized" : "sqft"
    );

    if (
      !persistedValues.isUsingCustomHighRehab &&
      persistedValues.defaultHighRehab !== highRehab &&
      persistedValues.defaultHighRehab > 0
    ) {
      // If we're in default mode and the default value is different, update to default
      setHighRehab(persistedValues.defaultHighRehab);
    } else if (
      persistedValues.isUsingCustomHighRehab &&
      persistedValues.customHighRehab !== highRehab &&
      persistedValues.customHighRehab >= 0 &&
      persistedValues.customHighRehab !== persistedValues.defaultHighRehab
    ) {
      // If we're in custom mode and the custom value is different, update to custom
      setHighRehab(persistedValues.customHighRehab);
    }
  }, [
    persistedValues.isUsingCustomHighRehab,
    persistedValues.defaultHighRehab,
    persistedValues.customHighRehab,
  ]);

  const afterRepairValue = useMemo(() => {
    const annualRent = rent * 12;
    const operatingExpense = annualRent * (expense / 100);
    const netOperatingIncome = annualRent - operatingExpense;
    if (capRate === 0) return 0; // Avoid division by zero
    const arv = netOperatingIncome / (capRate / 100);
    return arv;
  }, [rent, capRate, expense]);

  // Calculate estimated purchase percentage using proper buyer estimated price calculation
  const estimatedPurchasePercentage = useMemo(() => {
    // Only show value if this is the active strategy
    if (activeStrategy !== "rent") {
      return null;
    }

    if (!afterRepairValue || afterRepairValue === 0) {
      return null; // Return null to indicate no valid calculation
    }

    // Get property condition to determine calculation method
    const propertyCondition = addressData?.condition;
    const isFixerProperty = propertyCondition === 'Fixer' || propertyCondition === 'Outdated';
    const isStandardProperty = propertyCondition === 'Standard';

    // Prepare rental values for calculation
    const rentValues = {
      afterRepairValue,
      highRehab: debouncedHighRehab,
      rent: debouncedRent,
      expense: debouncedExpense,
      capRate: debouncedCapRate
    };

    // Prepare flip values (needed for fixer property calculation)
    const flipValues = {
      estimatedOffer: 0, // Not used for rental
      highRehab: 0, // Not used for rental  
      holdingCosts: flipData?.holdingCosts || 4 // Default holding costs for fixer calculation
    };

    // Calculate the actual buyer estimated purchase price
    const result = calculateBuyerEstimatedPrice(
      'rent',
      isFixerProperty,
      isStandardProperty,
      rentValues,
      flipValues
    );

    const buyerEstimatedOffer = result.buyerEstimatedOffer;

    if (buyerEstimatedOffer <= 0) {
      return null;
    }

    // ARV % = (Buyer Estimated Offer / ARV) × 100
    return Math.round((buyerEstimatedOffer / afterRepairValue) * 100);
  }, [afterRepairValue, highRehab, rent, expense, capRate, activeStrategy, addressData?.condition, flipData?.holdingCosts]);

  // Remove immediate dispatch-on-change; rely on debounced updates via updateValues below

  const updateValues = useCallback(() => {
    const currentValues = {
      rent: debouncedRent,
      expense: debouncedExpense,
      capRate: debouncedCapRate,
      highRehab: debouncedHighRehab,
      afterRepairValue,
    };

    const prevValues = prevValuesRef.current;

    if (
      prevValues.rent !== currentValues.rent ||
      prevValues.expense !== currentValues.expense ||
      prevValues.capRate !== currentValues.capRate ||
      prevValues.highRehab !== currentValues.highRehab ||
      prevValues.afterRepairValue !== currentValues.afterRepairValue
    ) {
      prevValuesRef.current = { ...currentValues };

      dispatch(
        updateRentValues({
          ...currentValues,
          defaultHighRehab: persistedValues.defaultHighRehab,
          customHighRehab: persistedValues.customHighRehab,
          isUsingCustomHighRehab: persistedValues.isUsingCustomHighRehab,
        })
      );

      isUpdatingRef.current = true;
      onValuesChanged({
        ...currentValues,
        defaultHighRehab: persistedValues.defaultHighRehab,
        customHighRehab: persistedValues.customHighRehab,
        isUsingCustomHighRehab: persistedValues.isUsingCustomHighRehab,
      });

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [
    debouncedRent,
    debouncedExpense,
    debouncedCapRate,
    debouncedHighRehab,
    afterRepairValue,
    dispatch,
    onValuesChanged,
    persistedValues.defaultHighRehab,
    persistedValues.customHighRehab,
    persistedValues.isUsingCustomHighRehab,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateValues();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [updateValues]);

  const handleInputChange = (key: string, value: string) => {
    switch (key) {
      case "rent":
        setRentInput(value);
        break;
      case "expense":
        setExpenseInput(value);
        break;
      case "capRate":
        setCapRateInput(value);
        break;

      case "highRehab":
        setHighRehabInput(value);
        break;
    }
  };

  const handleNumberChange = (
    key: string,
    valueAsString: string,
    valueAsNumber: number
  ) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Value is already cleaned and parsed in the onChange handler
      const value = valueAsNumber;

      switch (key) {
        case "rent":
          setRent(value);
          break;
        case "expense":
          setExpense(value);
          break;
        case "capRate":
          setCapRate(value);
          break;

        case "highRehab":
          setHighRehab(value);
          // Update the appropriate value based on current mode without changing mode
          dispatch(updateRentHighRehabValue(value));
          break;
      }

      onSliderChange(key, value);

      debounceTimeoutRef.current = null;
    }, 800);
  };

  const handleSliderChange = (key: string, value: number) => {
    switch (key) {
      case "rent":
        setRent(value);
        break;
      case "expense":
        setExpense(value);
        break;
      case "capRate":
        setCapRate(value);
        break;

      case "highRehab":
        setHighRehab(value);
        // Update the appropriate value based on current mode without changing mode
        dispatch(updateRentHighRehabValue(value));
        break;
    }

    onSliderChange(key, value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // const formatExpense = (expense: number, rent: number) => { // This function was unused
  //   return ((rent / expense) * 100).toFixed(0);
  // };

  return (
    <>
      <Box py={6} px={8} bg="gray.50" borderRadius="lg">
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
          {/* Rent Slider */}
          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <VStack align="center" spacing={2}>
              <Text fontWeight="semibold" fontSize="lg" color="gray.700">
                Rent
              </Text>
              <HStack
                width="100%"
                mb={5}
                spacing={1}
                justifyContent="flex-start"
                ml={-4}
              >
                <Text fontWeight={"bold"} flexShrink={0}>
                  $
                </Text>
                <Input
                  value={rentInput}
                  onChange={(e) => {
                    const valueString = e.target.value;
                    const cleanValue = valueString.replace(/,/g, "");
                    const numericValue = parseFloat(cleanValue);
                    handleInputChange("rent", valueString);
                    handleNumberChange("rent", cleanValue, isNaN(numericValue) ? 0 : numericValue);
                  }}
                  size="sm"
                  flex="1"
                  minW="110px"
                  borderRadius="md"
                  fontWeight="bold"
                  fontSize={rentInputFontSize}
                  onFocus={() => setIsRentFocused(true)}
                  onBlur={() => {
                    setIsRentFocused(false);
                    const numericValue = parseNumberFromCommas(rentInput);
                    setRentInput(formatNumberWithCommas(numericValue));
                  }}
                />
              </HStack>
              <Slider
                min={rentRange.min}
                max={rentRange.max}
                step={50}
                value={rent}
                onChange={(val) => handleSliderChange("rent", val)}
                aria-label="Rent"
                colorScheme="green"
              >
                <SliderTrack h="3px">
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </VStack>
          </Box>

          {/* Expense Slider */}
          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <VStack align="center" spacing={2}>
              <Text fontWeight="semibold" fontSize="lg" color="gray.700">
                Expense
              </Text>
              <HStack width="100%" mb={5} spacing={1}>
                <NumberInput
                  value={expenseInput}
                  step={1}
                  onChange={(valueString) => {
                    // Allow empty while typing; coerce on blur
                    setExpenseInput(valueString);
                    const parsed = parseFloat(valueString);
                    handleInputChange("expense", valueString);
                    handleNumberChange("expense", valueString, isNaN(parsed) ? 0 : parsed);
                  }}
                  size="sm"
                  flex="1"
                  keepWithinRange={false}
                  borderRadius="md"
                  onFocus={() => setIsExpenseFocused(true)}
                  onBlur={() => {
                    setIsExpenseFocused(false);
                    if (expenseInput === "" || isNaN(Number(expenseInput))) {
                      setExpenseInput("0");
                    }
                  }}
                >
                  <NumberInputField
                    fontWeight="bold"
                    fontSize={expenseInputFontSize}
                  />
                </NumberInput>
                <Text fontWeight={"bold"} flexShrink={0}>
                  %
                </Text>
              </HStack>
              <Slider
                min={expenseRange.min}
                max={expenseRange.max}
                step={1}
                value={expense}
                onChange={(val) => handleSliderChange("expense", val)}
                aria-label="Expense"
                colorScheme="green"
              >
                <SliderTrack h="3px">
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </VStack>
          </Box>

          {/* Cap Rate Slider */}
          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <VStack align="center" spacing={2}>
              <Text fontWeight="semibold" fontSize="lg" color="gray.700">
                Cap Rate
              </Text>
              <HStack width="100%" mb={5} spacing={1}>
                {/* Removed $ sign for Cap Rate as it's a percentage */}
                <NumberInput
                  value={capRateInput}
                  step={0.1} // Finer step for cap rate
                  precision={1}
                  onChange={(valueString) => {
                    setCapRateInput(valueString);
                    const parsed = parseFloat(valueString);
                    handleInputChange("capRate", valueString);
                    handleNumberChange("capRate", valueString, isNaN(parsed) ? 0 : parsed);
                  }}
                  size="sm"
                  flex="1"
                  keepWithinRange={false}
                  borderRadius="md"
                  onFocus={() => setIsCapRateFocused(true)}
                  onBlur={() => {
                    setIsCapRateFocused(false);
                    if (capRateInput === "" || isNaN(Number(capRateInput))) {
                      setCapRateInput("0");
                    }
                  }}
                >
                  <NumberInputField
                    fontWeight="bold"
                    fontSize={capRateInputFontSize}
                  />
                </NumberInput>
                <Text fontWeight={"bold"} flexShrink={0}>
                  %
                </Text>
              </HStack>
              <Slider
                min={capRateRange.min}
                max={capRateRange.max}
                step={0.1}
                value={capRate}
                onChange={(val) => handleSliderChange("capRate", val)}
                aria-label="Cap Rate"
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
              if (currentMode === "itemized") {
                onDetailedCalculatorClick?.();
              } else {
                onSqFtCalculatorClick?.();
              }
            }}
            _hover={{ shadow: "md" }}
            transition="shadow 0.2s"
          >
            <VStack align="center" spacing={2}>
              <Text fontWeight="semibold" fontSize="lg" color="gray.700">
                Rehab
              </Text>

              <HStack
                width="100%"
                mb={5}
                spacing={1}
                justifyContent="flex-start"
                ml={-4}
              >
                <Text fontWeight={"bold"} flexShrink={0}>
                  $
                </Text>
                <NumberInput
                  value={highRehabInput}
                  step={1000}
                  onChange={(valueString) => {
                    // Remove commas for processing but keep original string for display
                    const cleanValue = valueString.replace(/,/g, "");
                    const numericValue = parseFloat(cleanValue) || 0;

                    // Update input with formatted value
                    const formattedValue = formatNumberWithCommas(numericValue);
                    handleInputChange("highRehab", formattedValue);
                    handleNumberChange("highRehab", cleanValue, numericValue);
                  }}
                  size="sm"
                  flex="1"
                  minW="110px"
                  keepWithinRange={false}
                  borderRadius="md"
                  isDisabled={true}
                >
                  <NumberInputField
                    fontWeight="bold"
                    fontSize={highRehabInputFontSize}
                  />
                </NumberInput>
              </HStack>
              <Slider
                min={highRehabRange.min}
                max={highRehabRange.max}
                step={1000}
                value={highRehab}
                onChange={(val) => handleSliderChange("highRehab", val)}
                aria-label="High Rehab"
                colorScheme="green"
                isDisabled={true}
              >
                <SliderTrack h="3px">
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>

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
                  bg={currentMode === "sqft" ? "brand.500" : "transparent"}
                  color={currentMode === "sqft" ? "white" : "gray.600"}
                  borderRadius={currentMode === "sqft" ? "md" : "none"}
                  border="none"
                  _hover={{
                    bg: currentMode === "sqft" ? "brand.600" : "gray.50",
                    color: currentMode === "sqft" ? "white" : "gray.700",
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
                      dispatch(toggleRentHighRehabMode());
                      setCurrentMode("sqft");
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
                     bg={
                       currentMode === "itemized" ? "brand.500" : "transparent"
                     }
                     color={currentMode === "itemized" ? "white" : "gray.600"}
                     borderRadius={currentMode === "itemized" ? "md" : "none"}
                     border="none"
                     _hover={{
                       bg: currentMode === "itemized" ? "brand.600" : "gray.50",
                       color: currentMode === "itemized" ? "white" : "gray.700",
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
                        dispatch(toggleRentHighRehabMode());
                        setCurrentMode("itemized");
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

        <Stack
          direction={stackDirection}
          justify={{ base: "center", md: "space-between" }}
          align={{ base: "center", md: "center" }}
          spacing={spacing}
          pt={6}
          mt={4}
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          <Flex
            align="center"
            direction={{ base: "column", sm: "row" }}
            textAlign={{ base: "center", sm: "left" }}
          >
            <Text
              fontWeight="semibold"
              fontSize={textSize}
              color="gray.700"
              mr={{ base: 0, sm: 2 }}
              mb={{ base: 1, sm: 0 }}
            >
              Estimated Purchase:
            </Text>
            <AnimatePresence mode="wait">
              <motion.div
                key={estimatedPurchasePercentage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Text fontWeight="bold" fontSize={textSize} color="green.600">
                  {estimatedPurchasePercentage !== null
                    ? `${estimatedPurchasePercentage}% ARV`
                    : "—"}
                </Text>
              </motion.div>
            </AnimatePresence>
          </Flex>
          <Flex
            align="center"
            direction={{ base: "column", sm: "row" }}
            textAlign={{ base: "center", sm: "left" }}
          >
            <Text
              fontWeight="semibold"
              fontSize={textSize}
              color="gray.700"
              mr={{ base: 0, sm: 2 }}
              mb={{ base: 1, sm: 0 }}
            >
              After Repair Value:
            </Text>
            <AnimatePresence mode="wait">
              <motion.div
                key={afterRepairValue}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Text fontWeight="bold" fontSize={textSize} color="red.600">
                  {formatCurrency(afterRepairValue)}
                </Text>
              </motion.div>
            </AnimatePresence>
          </Flex>
        </Stack>
      </Box>
    </>
  );
};

export default React.memo(RentUnderwriteSliders);
