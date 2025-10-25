import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  VStack,
  SimpleGrid,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Flex,
  Divider,
  Icon,
  Badge,
  Spacer,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FaBath, 
  FaWindowMaximize, 
  FaBolt, 
  FaWrench, 
  FaPaintBrush, 
  FaHome, 
  FaBuilding, 
  FaUtensils, 
  FaWarehouse, 
  FaSnowflake,
  FaPercentage,
  FaThLarge,
  FaFire,
  FaUndo,
  FaDollarSign
} from 'react-icons/fa';
import CommonModal from '../../components/CommonModal';
import rehabCalculatorService, { 
  RehabCalculatorData, 
  RehabCalculationRequest, 
  RehabCalculationResult 
} from '../../services/rehabCalculatorService';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setRentDetailedCategories, setFlipDetailedCategories } from '../../store/underwriteSlice';
import rehabDescriptions from '../../services/rehabDescriptions.json';

// Utility function to format number with commas
const formatNumberWithCommas = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

// Utility function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

interface RehabCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  unit: string; // 'rooms', 'windows', 'quarters', etc.
  options: string[]; // ['None', 'Partial', 'Full'] or ['None', 'Quarter', 'Half']
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  baseCost: number; // Base cost for calculations
}

interface DetailedRehabCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyData?: {
    squareFootage?: number;
    marketName?: string;
    afterRepairValue?: number;
    state?: string;
    county?: string;
    bathrooms?: number; // Added for bathroom count
  };
  onCalculationComplete?: (calculation: {
    totalCost: number;
    categoryBreakdown: Record<string, number>;
    contingency: number;
    finalTotal: number;
  
    highRehab: number;
  }) => void;
  presetValues?: Record<string, number>; // Add preset values from condition step
}

// Helper to get the description for a given category, material/type, and tier
const getScopeDescription = (
  category: string,
  material: string,
  tier: string
): string => {
  const cat = (rehabDescriptions as Record<string, any>)[category];
  
  if (category === 'Windows') {
    if (cat && cat[tier]) {
      return cat[tier];
    }
  } else if (cat && cat[material] && cat[material][tier]) {
    return cat[material][tier];
  }
  
  return 'No details available, based off a sqft.';
};

// Define rehab categories outside component to prevent recreation on every render
const REHAB_CATEGORIES: RehabCategory[] = [
  {
    id: 'bathrooms',
    name: 'Bathrooms',
    icon: FaBath as React.ElementType,
    unit: 'Partial',
    options: ['None', 'Partial', 'Full'],
    defaultValue: 0, // Changed from 1 to 0 to start with "None"
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0 // Will be calculated from API data
  },
  {
    id: 'windows',
    name: 'Windows',
    icon: FaWindowMaximize as React.ElementType,
    unit: 'windows',
    options: [], // Dynamic options for 0-20 windows
    defaultValue: 0, // Changed from 8 to 0 to start with "None"
    min: 0,
    max: 20,
    step: 1,
    baseCost: 0
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: FaBolt as React.ElementType,
    unit: 'None',
    options: ['None', 'Replace Panel', 'Full House Rewire'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: FaWrench as React.ElementType,
    unit: 'None',
    options: ['None', 'Half Re-pipe', 'Full Re-pipe'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  },
  {
    id: 'interiorPaint',
    name: 'Interior Paint',
    icon: FaPaintBrush as React.ElementType,
    unit: 'None',
    options: ['None', 'Half Repaint', 'Full Repaint'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  },
  {
    id: 'exteriorPaint',
    name: 'Exterior Paint',
    icon: FaHome as React.ElementType,
    unit: 'None',
    options: ['None', 'Pressure Wash Only', 'Half Repaint', 'Full Repaint'],
    defaultValue: 0,
    min: 0,
    max: 3,
    step: 1,
    baseCost: 0
  },
  {
    id: 'exteriorSiding',
    name: 'Exterior Siding',
    icon: FaBuilding as React.ElementType,
    unit: 'None',
    options: ['None', '1/4 Vinyl Siding', '2/4 Vinyl Siding', '3/4 Vinyl Siding', 'Full Vinyl Siding'],
    defaultValue: 0,
    min: 0,
    max: 4,
    step: 1,
    baseCost: 0
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: FaUtensils as React.ElementType,
    unit: 'None',
    options: ['None', 'Partial Refresh', 'Full Replacement'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  },
  {
    id: 'roof',
    name: 'Roof',
    icon: FaWarehouse as React.ElementType,
    unit: 'None',
    options: ['None', 'Asphalt (Shingle 3-Tab)', 'Asphalt (Architectural)'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: FaSnowflake as React.ElementType,
    unit: 'None',
    options: ['None', 'Repair', 'Replace Condenser/Furnace', 'Full System Replacement'],
    defaultValue: 0,
    min: 0,
    max: 3,
    step: 1,
    baseCost: 0
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: FaThLarge as React.ElementType,
    unit: 'None',
    options: ['None', 'Bedrooms Only', 'Living Areas Only', 'Full (Beds & Living)'],
    defaultValue: 0,
    min: 0,
    max: 3,
    step: 1,
    baseCost: 0
  },
  {
    id: 'waterHeater',
    name: 'Water Heater',
    icon: FaFire as React.ElementType,
    unit: 'None',
    options: ['None', '40-Gal Tank', '50-Gal Tank'],
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 1,
    baseCost: 0
  }
];

const DetailedRehabCalculatorModal: React.FC<DetailedRehabCalculatorModalProps> = ({
  isOpen,
  onClose,
  propertyData = {},
  onCalculationComplete,
  presetValues = {}
}) => {
  const dispatch = useAppDispatch();
  
  // Get property data from Redux if not provided
  const propertyState = useAppSelector((state: any) => state.property);
  const property = propertyState.properties[0] || null;
  const addressData = property?.addressData?.items?.[0] || null;
  
  // Get current ARV from underwrite sliders (already calculated and stored in Redux)
  const underwriteState = useAppSelector((state: any) => state.underwrite);
  const activeStrategy = underwriteState.activeStrategy || 'rent';

  // Data loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [calculatorData, setCalculatorData] = useState<RehabCalculatorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract property details
  const squareFootage = propertyData.squareFootage || addressData?.square_footage || 0; // Default fallback
  const afterRepairValue = activeStrategy === 'flip' 
    ? underwriteState.flip.afterRepairValue || 0
    : underwriteState.rent.afterRepairValue || 0; // Get ARV directly from Redux
  const state = propertyData.state || addressData?.state_abbreviation || 'TN';
  const county = propertyData.county || addressData?.county || 'Shelby';
  const marketName = propertyData.marketName || calculatorData?.marketName || 'Memphis, TN';

  // Get actual bathroom count from Redux or addressData
  const bathroomCount = propertyData.bathrooms || addressData?.bathrooms || 1;

  // State for each category value - initialize with stored detailed categories first, then preset values
  const [categoryValues, setCategoryValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const storedCategories = activeStrategy === 'rent' 
      ? underwriteState.rent.detailedCategories
      : underwriteState.flip.detailedCategories;
    
    REHAB_CATEGORIES.forEach(category => {
      // Use stored values first (if user has made changes), then preset values, then default
      initial[category.id] = storedCategories?.[category.id] ?? presetValues[category.id] ?? category.defaultValue;
    });

    return initial;
  });

  // Contingency percentage state - initialize with stored value first, then preset value
  const [contingencyPercent, setContingencyPercent] = useState<number>(() => {
    const storedContingency = activeStrategy === 'rent' 
      ? underwriteState.rent.detailedContingency
      : underwriteState.flip.detailedContingency;
    const initialContingency = storedContingency ?? presetValues.contingency ?? 10;

    return initialContingency;
  });

  // Misc amount state - initialize with stored value first, then preset value
  const [miscAmount, setMiscAmount] = useState<number>(() => {
    const storedMisc = activeStrategy === 'rent' 
      ? underwriteState.rent.detailedMiscAmount
      : underwriteState.flip.detailedMiscAmount;
    const initialMisc = storedMisc ?? presetValues.miscAmount ?? 0;

    return initialMisc;
  });

  // Load rehab calculator data when modal opens
  useEffect(() => {
    if (isOpen && !calculatorData && !isLoading) {
      loadRehabData();
    }
  }, [isOpen]);

  // Reset category values when modal opens or strategy changes
  useEffect(() => {
    if (isOpen) {
      const storedCategories = activeStrategy === 'rent' 
        ? underwriteState.rent.detailedCategories
        : underwriteState.flip.detailedCategories;
      
      const storedContingency = activeStrategy === 'rent' 
        ? underwriteState.rent.detailedContingency
        : underwriteState.flip.detailedContingency;
      
      const storedMisc = activeStrategy === 'rent' 
        ? underwriteState.rent.detailedMiscAmount
        : underwriteState.flip.detailedMiscAmount;
      
      // Use stored values first (if user has made changes), then preset values, then defaults
      const resetValues: Record<string, number> = {};
      REHAB_CATEGORIES.forEach(category => {
        resetValues[category.id] = storedCategories?.[category.id] ?? presetValues[category.id] ?? category.defaultValue;
      });
      setCategoryValues(resetValues);
      
      // Use stored contingency first, then preset value, then default
      setContingencyPercent(storedContingency ?? presetValues.contingency ?? 10);
      
      // Use stored misc amount first, then preset value, then default
      setMiscAmount(storedMisc ?? presetValues.miscAmount ?? 0);

    }
  }, [isOpen, activeStrategy, presetValues, underwriteState.rent.detailedCategories, underwriteState.flip.detailedCategories, underwriteState.rent.detailedContingency, underwriteState.flip.detailedContingency, underwriteState.rent.detailedMiscAmount, underwriteState.flip.detailedMiscAmount]);

  const loadRehabData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Loading rehab data
      const data = await rehabCalculatorService.getRehabCalculatorData(state, county, squareFootage);
      
      if (data) {
        setCalculatorData(data);
        // Loaded rehab data successfully
      } else {
        setError('Could not load rehab pricing data. Please check your internet connection and try again.');
      }
    } catch (err) {
      // Error loading rehab data
      setError('Failed to load rehab pricing data. Using basic estimates.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate real costs using the API data
  const rehabCalculation = useMemo((): RehabCalculationResult | null => {
    if (!calculatorData) return null;

    const request: RehabCalculationRequest = {
      afterRepairValue,
      squareFootage,
      bathrooms: categoryValues.bathrooms || 0,
      windows: categoryValues.windows || 0,
      electrical: categoryValues.electrical || 0,
      plumbing: categoryValues.plumbing || 0,
      interiorPaint: categoryValues.interiorPaint || 0,
      exteriorPaint: categoryValues.exteriorPaint || 0,
      exteriorSiding: categoryValues.exteriorSiding || 0,
      kitchen: categoryValues.kitchen || 0,
      roof: categoryValues.roof || 0,
      hvac: categoryValues.hvac || 0,
      flooring: categoryValues.flooring || 0,
      waterHeater: categoryValues.waterHeater || 0,
      contingency: contingencyPercent
    };

    // Pass bathroomCount as a second argument
    return rehabCalculatorService.calculateRehabCosts(request, calculatorData, bathroomCount);
  }, [calculatorData, categoryValues, contingencyPercent, afterRepairValue, squareFootage, underwriteState, bathroomCount]);

  // Debug: Log request and calculated costs whenever they change
  useEffect(() => {
    if (!calculatorData) return;
    const request: RehabCalculationRequest = {
      afterRepairValue,
      squareFootage,
      bathrooms: categoryValues.bathrooms || 0,
      windows: categoryValues.windows || 0,
      electrical: categoryValues.electrical || 0,
      plumbing: categoryValues.plumbing || 0,
      interiorPaint: categoryValues.interiorPaint || 0,
      exteriorPaint: categoryValues.exteriorPaint || 0,
      exteriorSiding: categoryValues.exteriorSiding || 0,
      kitchen: categoryValues.kitchen || 0,
      roof: categoryValues.roof || 0,
      hvac: categoryValues.hvac || 0,
      flooring: categoryValues.flooring || 0,
      waterHeater: categoryValues.waterHeater || 0,
      contingency: contingencyPercent
    };
    const result = rehabCalculatorService.calculateRehabCosts(request, calculatorData, bathroomCount);
    // Map backend keys to UI slider keys for readability
    const backendToUi: Record<string, string> = {
      bathroom: 'bathrooms',
      windows: 'windows',
      electrical: 'electrical',
      plumbing: 'plumbing',
      interior_paint: 'interiorPaint',
      exterior_paint: 'exteriorPaint',
      exterior_siding: 'exteriorSiding',
      kitchen: 'kitchen',
      roof: 'roof',
      hvac: 'hvac',
      flooring: 'flooring',
      water_heater: 'waterHeater'
    };
    const perCategoryCosts: Record<string, number> = {};
    Object.keys(result.categoryBreakdown || {}).forEach((backendKey) => {
      const uiKey = backendToUi[backendKey] || backendKey;
      perCategoryCosts[uiKey] = result.categoryBreakdown[backendKey]?.cost || 0;
    });
    console.log('[DetailedRehabCalculatorModal] Calculation debug:', {
      request,
      derived: {
        tier: result.tier,
        sizeBracket: result.sizeBracket,
        subtotal: result.subtotal,
        contingencyAmount: result.contingencyAmount,
        total: result.total,
      },
      perCategoryCosts
    });
  }, [calculatorData, categoryValues, contingencyPercent, afterRepairValue, squareFootage, bathroomCount]);

  // Handle category value changes
  const handleCategoryChange = useCallback((categoryId: string, value: number) => {
    setCategoryValues(prev => ({
      ...prev,
      [categoryId]: value
    }));
  }, []);

  // Handle reset all values
  const handleResetAll = useCallback(() => {
    const resetValues: Record<string, number> = {};
    REHAB_CATEGORIES.forEach(category => {
      resetValues[category.id] = category.defaultValue;
    });
    setCategoryValues(resetValues);
    setContingencyPercent(10); // Default contingency
    setMiscAmount(0); // Default misc amount
  }, []);

  // Handle apply calculation
  const handleApplyCalculation = useCallback(() => {
    if (!rehabCalculation) return;

    // Calculate total including misc amount
    const totalWithMisc = rehabCalculation.total + miscAmount;
    const highRehab = Math.round(totalWithMisc);

    // Log snapshot BEFORE dispatching to Redux
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { store } = require("../../store");
      const stateBefore = store.getState();
      const underwriteBefore = (stateBefore as any).underwrite;
      console.log("[DetailedRehabCalculatorModal] Update Rehab Costs clicked. BEFORE dispatch:", {
        activeStrategy,
        formValues: {
          categories: categoryValues,
          contingency: contingencyPercent,
          miscAmount,
          computedHighRehab: highRehab,
        },
        rent: {
          highRehab: underwriteBefore?.rent?.highRehab,
          customHighRehab: underwriteBefore?.rent?.customHighRehab,
          defaultHighRehab: underwriteBefore?.rent?.defaultHighRehab,
          isUsingCustomHighRehab: underwriteBefore?.rent?.isUsingCustomHighRehab,
          detailedContingency: underwriteBefore?.rent?.detailedContingency,
          detailedMiscAmount: underwriteBefore?.rent?.detailedMiscAmount,
          detailedCategories: underwriteBefore?.rent?.detailedCategories,
        },
        flip: {
          highRehab: underwriteBefore?.flip?.highRehab,
          customHighRehab: underwriteBefore?.flip?.customHighRehab,
          defaultHighRehab: underwriteBefore?.flip?.defaultHighRehab,
          isUsingCustomHighRehab: underwriteBefore?.flip?.isUsingCustomHighRehab,
          detailedContingency: underwriteBefore?.flip?.detailedContingency,
          detailedMiscAmount: underwriteBefore?.flip?.detailedMiscAmount,
          detailedCategories: underwriteBefore?.flip?.detailedCategories,
        },
      });
    } catch (e) {
      console.warn("[DetailedRehabCalculatorModal] Failed to log BEFORE snapshot:", e);
    }

    // Store detailed categories in Redux
    if (activeStrategy === 'rent') {
      dispatch(setRentDetailedCategories({
        categories: categoryValues,
        contingency: contingencyPercent,
        miscAmount: miscAmount,
        highRehab
      }));
    } else {
      dispatch(setFlipDetailedCategories({
        categories: categoryValues,
        contingency: contingencyPercent,
        miscAmount: miscAmount,
        highRehab
      }));
    }

    // Log snapshot AFTER dispatching to Redux
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { store } = require("../../store");
      const stateAfter = store.getState();
      const underwriteAfter = (stateAfter as any).underwrite;
      console.log("[DetailedRehabCalculatorModal] AFTER dispatch underwrite snapshot:", {
        activeStrategy,
        rent: {
          highRehab: underwriteAfter?.rent?.highRehab,
          customHighRehab: underwriteAfter?.rent?.customHighRehab,
          defaultHighRehab: underwriteAfter?.rent?.defaultHighRehab,
          isUsingCustomHighRehab: underwriteAfter?.rent?.isUsingCustomHighRehab,
          detailedContingency: underwriteAfter?.rent?.detailedContingency,
          detailedMiscAmount: underwriteAfter?.rent?.detailedMiscAmount,
          detailedCategories: underwriteAfter?.rent?.detailedCategories,
        },
        flip: {
          highRehab: underwriteAfter?.flip?.highRehab,
          customHighRehab: underwriteAfter?.flip?.customHighRehab,
          defaultHighRehab: underwriteAfter?.flip?.defaultHighRehab,
          isUsingCustomHighRehab: underwriteAfter?.flip?.isUsingCustomHighRehab,
          detailedContingency: underwriteAfter?.flip?.detailedContingency,
          detailedMiscAmount: underwriteAfter?.flip?.detailedMiscAmount,
          detailedCategories: underwriteAfter?.flip?.detailedCategories,
        },
      });
    } catch (e) {
      console.warn("[DetailedRehabCalculatorModal] Failed to log AFTER snapshot:", e);
    }

    onCalculationComplete?.({
      totalCost: rehabCalculation.subtotal,
      categoryBreakdown: Object.keys(rehabCalculation.categoryBreakdown).reduce((acc, key) => {
        acc[key] = rehabCalculation.categoryBreakdown[key].cost;
        return acc;
      }, {} as Record<string, number>),
      contingency: rehabCalculation.contingencyAmount,
      finalTotal: totalWithMisc,
      highRehab
    });
    onClose();
  }, [rehabCalculation, onCalculationComplete, onClose, activeStrategy, dispatch, categoryValues, contingencyPercent, miscAmount]);

  // Get option label for current value
  const getOptionLabel = (category: RehabCategory, value: number): string => {
    // Special handling for windows (0-20 range)
    if (category.id === 'windows') {
      return value === 0 ? 'None' : `${value} window${value !== 1 ? 's' : ''}`;
    }
    
    return category.options[value] || 'None';
  };

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="4xl"
      closeOnOverlayClick={false}
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center" mb={2}>
          <Text fontSize="2xl" fontWeight="bold" color="brand.500" mb={1}>
            {marketName} Rehab Estimator
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Estimate renovation costs for {formatNumberWithCommas(squareFootage)} sq ft property • {marketName} market pricing
          </Text>
          <Text fontSize="xs" color="text.secondary" mt={1}>
            {rehabCalculation ? `Tier ${rehabCalculation.tier} • ${rehabCalculation.sizeBracket} Property` : ''}
          </Text>
        </Box>

        {/* Reset All Button */}
        <Box textAlign="center" mb={4}>
          <Button
            variant="outline"
            size="sm"
            colorScheme="gray"
            onClick={handleResetAll}
            leftIcon={<Icon as={FaUndo as React.ElementType} />}
          >
            Reset All Values
          </Button>
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box textAlign="center" py={8}>
            <Spinner size="lg" color="brand.500" mb={4} />
            <Text color="text.secondary">Loading market pricing data...</Text>
          </Box>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">{error}</Text>
          </Alert>
        )}

        {/* Category Grid - Only show when data is loaded */}
        {!isLoading && !error && calculatorData && (
          <>
            <SimpleGrid columns={{base: 1, md: 2}} spacing={4} maxH="60vh" overflowY="auto" px={2}>
              {REHAB_CATEGORIES.map((category) => {
                const currentValue = categoryValues[category.id];
                const currentLabel = getOptionLabel(category, currentValue);
                
                // Get cost from real calculation using proper category mapping
                const categoryMapping: Record<string, string> = {
                  bathrooms: 'bathroom',
                  windows: 'windows',
                  electrical: 'electrical',
                  plumbing: 'plumbing',
                  interiorPaint: 'interior_paint',
                  exteriorPaint: 'exterior_paint',
                  exteriorSiding: 'exterior_siding',
                  kitchen: 'kitchen',
                  roof: 'roof',
                  hvac: 'hvac',
                  flooring: 'flooring',
                  waterHeater: 'water_heater'
                };
                
                const categoryName = categoryMapping[category.id] || category.id;
                const currentCost = rehabCalculation?.categoryBreakdown[categoryName]?.cost || 0;

                // Determine if this category should show a tooltip
                const showTooltip = ['Flooring', 'Kitchen', 'Bathrooms', 'Windows'].includes(category.name);
                
                // Determine tier for tooltip lookup
                let tier = '';
                tier = String(rehabCalculation?.tier || 1);
                if (category.name === 'Bathrooms' && currentValue === 1) {
                  tier = 'all';
                }
                
                // Determine material/type for tooltip lookup
                let material = '';
                if (category.name === 'Flooring') {
                  // Map slider values to materials based on flooring calculation logic
                  if (currentValue === 1) material = 'Carpet (Bedrooms)';
                  else if (currentValue === 2) material = 'LVP (Living Areas)';
                  else if (currentValue === 3) material = 'LVP (Living Areas)'; // Full uses LVP primarily
                } else if (category.name === 'Kitchen') {
                  material = currentValue === 1 ? 'Partial Refresh' : currentValue === 2 ? 'Full Replacement' : '';
                } else if (category.name === 'Bathrooms') {
                  material = currentValue === 1 ? 'Partial Refresh' : currentValue === 2 ? 'Full Replacement' : '';
                }
                
                const tooltipLabel = getScopeDescription(category.name, material, tier);

                return (
                  <Box 
                    key={category.id} 
                    bg="background.primary" 
                    p={4} 
                    borderRadius="lg" 
                    border="1px solid" 
                    borderColor="border.primary"
                    boxShadow="sm"
                  >
                    <VStack spacing={3} align="stretch">
                      {/* Category Header */}
                      <HStack spacing={3}>
                        <Icon as={category.icon} boxSize={5} color="brand.500" />
                        <Box flex={1}>
                          <Text fontWeight="semibold" fontSize="md" color="text.primary">
                            {category.name}
                          </Text>
                          {/* Tooltip for scope label */}
                          {showTooltip ? (
                            <Tooltip
                              label={tooltipLabel}
                              aria-label="Scope description"
                              hasArrow
                              bg="white"
                              color="#333333"
                              fontSize="12px"
                              p={2}
                              boxShadow="md"
                              maxW="240px"
                              placement="auto"
                              openDelay={100}
                              closeOnClick={true}
                            >
                              <Text as="span" fontSize="xs" color="text.secondary" tabIndex={0} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>
                                {currentLabel}
                              </Text>
                            </Tooltip>
                          ) : (
                            <Text fontSize="xs" color="text.secondary">{currentLabel}</Text>
                          )}
                        </Box>
                        <Badge colorScheme="green" fontSize="xs">
                          {formatCurrency(currentCost)}
                        </Badge>
                      </HStack>

                      {/* Slider */}
                      <Box px={2}>
                        <Slider
                          value={currentValue}
                          min={category.min}
                          max={category.max}
                          step={category.step}
                          onChange={(value) => handleCategoryChange(category.id, value)}
                          colorScheme="green"
                        >
                          <SliderTrack bg="gray.200" h="6px">
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb boxSize={5} />
                        </Slider>
                      </Box>

                      {/* Option Labels */}
                      <HStack justify="space-between" fontSize="xs" color="text.secondary" px={1}>
                        {category.id === 'windows' ? (
                          <>
                            <Text>0</Text>
                            <Spacer />
                            <Text>20</Text>
                          </>
                        ) : (
                          <>
                            <Text>{category.options[0]}</Text>
                            <Spacer />
                            <Text>{category.options[category.options.length - 1]}</Text>
                          </>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
                );
              })}
            </SimpleGrid>

            {/* Contingency Slider */}
            <Box 
              bg="background.secondary" 
              p={4} 
              borderRadius="lg"
              border="1px solid"
              borderColor="border.primary"
            >
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Icon as={FaPercentage as React.ElementType} boxSize={5} color="brand.500" />
                  <Box flex={1}>
                    <Text fontWeight="semibold" fontSize="md" color="text.primary">
                      Contingency
                    </Text>
                    <Text fontSize="xs" color="text.secondary">
                      {contingencyPercent}% buffer for unexpected costs
                    </Text>
                  </Box>
                  <Badge colorScheme="orange" fontSize="xs">
                    {formatCurrency(rehabCalculation?.contingencyAmount || 0)}
                  </Badge>
                </HStack>

                <Box px={2}>
                  <Slider
                    value={contingencyPercent}
                    min={0}
                    max={25}
                    step={5}
                    onChange={setContingencyPercent}
                    colorScheme="orange"
                  >
                    <SliderTrack bg="gray.200" h="6px">
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={5} />
                  </Slider>
                </Box>

                <HStack justify="space-between" fontSize="xs" color="text.secondary" px={1}>
                  <Text>0%</Text>
                  <Text>25%</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Misc Amount Input */}
            <Box 
              bg="background.secondary" 
              p={4} 
              borderRadius="lg"
              border="1px solid"
              borderColor="border.primary"
            >
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Icon as={FaDollarSign as React.ElementType} boxSize={5} color="brand.500" />
                  <Box flex={1}>
                    <Text fontWeight="semibold" fontSize="md" color="text.primary">
                      Misc Amount
                    </Text>
                    <Text fontSize="xs" color="text.secondary">
                      Additional miscellaneous costs
                    </Text>
                  </Box>
                  <Badge colorScheme="blue" fontSize="xs">
                    {formatCurrency(miscAmount)}
                  </Badge>
                </HStack>

                                  <Box px={2}>
                    <Input
                      placeholder="Enter misc amount"
                      bg="white"
                      borderColor="gray.300"
                      _focus={{ borderColor: "brand.500" }}
                      value={formatNumberWithCommas(miscAmount || 0)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const rawValue = e.target.value.replace(/[^0-9]/g, '');
                        const numValue = parseFloat(rawValue);
                        // Enforce max limit of 1,000,000
                        const clampedValue = Math.min(isNaN(numValue) ? 0 : numValue, 1000000);
                        setMiscAmount(clampedValue);
                      }}
                    />
                  </Box>
              </VStack>
            </Box>

            <Divider />

            {/* Total Summary */}
            <Box bg="background.secondary" p={4} borderRadius="lg">
              <VStack spacing={2}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="md" color="text.secondary">Subtotal:</Text>
                  <Text fontSize="md" fontWeight="semibold">
                    {formatCurrency(rehabCalculation?.subtotal || 0)}
                  </Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="md" color="text.secondary">
                    Contingency ({contingencyPercent}%):
                  </Text>
                  <Text fontSize="md" fontWeight="semibold" color="orange.500">
                    {formatCurrency(rehabCalculation?.contingencyAmount || 0)}
                  </Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="md" color="text.secondary">
                    Misc Amount:
                  </Text>
                  <Text fontSize="md" fontWeight="semibold" color="blue.500">
                    {formatCurrency(miscAmount)}
                  </Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="text.secondary">
                    Per Square Foot:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatCurrency((rehabCalculation?.total || 0) + miscAmount > 0 ? ((rehabCalculation?.total || 0) + miscAmount) / (squareFootage || 1) : 0)}/sq ft
                  </Text>
                </HStack>
                <Divider />
                <HStack justify="space-between" w="full">
                  <Text fontSize="lg" fontWeight="bold" color="text.primary">
                    Total Estimate:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="brand.500">
                    {formatCurrency((rehabCalculation?.total || 0) + miscAmount)}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </>
        )}

        {/* Action Buttons */}
        <HStack spacing={3} justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="brand" 
            onClick={handleApplyCalculation}
            isDisabled={isLoading || !rehabCalculation}
          >
            Update Rehab Costs
          </Button>
        </HStack>
      </VStack>
    </CommonModal>
  );
};

export default DetailedRehabCalculatorModal; 