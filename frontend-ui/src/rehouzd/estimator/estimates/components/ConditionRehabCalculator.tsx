import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Icon,
  Badge,
  Spacer,
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
  FaFire
} from 'react-icons/fa';

// Preset values for each condition
const CONDITION_PRESETS = {
  'Fixer': {
    bathrooms: 2, // Full
    windows: 10, // 10 windows
    electrical: 2, // Full House Rewire
    plumbing: 2, // Full Re-pipe
    interiorPaint: 2, // Full Repaint
    exteriorPaint: 3, // Full Repaint
    exteriorSiding: 4, // Full Vinyl Siding
    kitchen: 2, // Full Replacement
    roof: 2, // Asphalt (Architectural)
    hvac: 3, // Full System Replacement
    flooring: 3, // Full (Beds & Living)
    waterHeater: 2, // 50-Gal Tank
    contingency: 5
  },
  'Outdated': {
    bathrooms: 2, // Full
    windows: 0, // None
    electrical: 1, // Replace Panel
    plumbing: 0, // None
    interiorPaint: 2, // Full Repaint
    exteriorPaint: 3, // Full Repaint
    exteriorSiding: 2, // 2/4 Vinyl Siding
    kitchen: 2, // Full Replacement
    roof: 2, // Asphalt (Architectural)
    hvac: 2, // Replace Condenser/Furnace
    flooring: 3, // Full (Beds & Living)
    waterHeater: 2, // 50-Gal Tank
    contingency: 5
  },
  'Standard': {
    bathrooms: 1, // Partial
    windows: 0, // None
    electrical: 0, // None
    plumbing: 0, // None
    interiorPaint: 1, // Half Repaint
    exteriorPaint: 1, // Pressure Wash Only
    exteriorSiding: 0, // None
    kitchen: 1, // Partial Refresh
    roof: 0, // None
    hvac: 1, // Repair
    flooring: 1, // Bedrooms Only
    waterHeater: 0, // None
    contingency: 5
  },
  'Renovated': {
    bathrooms: 0, // None
    windows: 0,
    electrical: 0, // None
    plumbing: 0, // None
    interiorPaint: 0, // None
    exteriorPaint: 0, // None
    exteriorSiding: 0, // None
    kitchen: 0, // None
    roof: 0, // None
    hvac: 0, // None
    flooring: 0, // None
    waterHeater: 0, // None
    contingency: 0
  }
};

interface RehabCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  unit: string;
  options: string[];
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

interface ConditionRehabCalculatorProps {
  selectedCondition: string | null;
  propertyData?: {
    squareFootage?: number;
    bathrooms?: number;
  };
  onValuesChange?: (values: Record<string, number>) => void;
}

// Define rehab categories outside component to prevent recreation on every render
const CONDITION_REHAB_CATEGORIES: RehabCategory[] = [
    {
      id: 'bathrooms',
      name: 'Bathrooms',
      icon: FaBath as React.ElementType,
      unit: 'Partial',
      options: ['None', 'Partial', 'Full'],
      defaultValue: 0,
      min: 0,
      max: 2,
      step: 1
    },
    {
      id: 'windows',
      name: 'Windows',
      icon: FaWindowMaximize as React.ElementType,
      unit: 'windows',
      options: [],
      defaultValue: 0,
      min: 0,
      max: 20,
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
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
      step: 1
    }
];

const ConditionRehabCalculator: React.FC<ConditionRehabCalculatorProps> = ({
  selectedCondition,
  propertyData = {},
  onValuesChange
}) => {
  // State for category values (hooks must be called before any early returns)
  const [categoryValues, setCategoryValues] = useState<Record<string, number>>({});
  const [contingencyPercent, setContingencyPercent] = useState<number>(10);
  
  // Ref for scroll container
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);

  // Load preset values when condition changes (only when condition actually changes)
  useEffect(() => {
    if (selectedCondition && CONDITION_PRESETS[selectedCondition as keyof typeof CONDITION_PRESETS]) {
      const preset = CONDITION_PRESETS[selectedCondition as keyof typeof CONDITION_PRESETS];
      setCategoryValues(preset);
      setContingencyPercent(preset.contingency);
      
      // Notify parent of the preset values
      onValuesChange?.(preset);
    }
    // Only reset when there's actually no condition selected
  }, [selectedCondition]);

  // Handle category value changes
  const handleCategoryChange = useCallback((categoryId: string, value: number) => {

    const newValues = {
      ...categoryValues,
      [categoryId]: value
    };
    setCategoryValues(newValues);
    onValuesChange?.(newValues);
  }, [categoryValues, onValuesChange]);

  // Handle contingency change
  const handleContingencyChange = useCallback((value: number) => {
    setContingencyPercent(value);
    const newValues = {
      ...categoryValues,
      contingency: value
    };
    onValuesChange?.(newValues);
  }, [categoryValues, onValuesChange]);

  // Get option label for current value
  const getOptionLabel = (category: RehabCategory, value: number): string => {
    if (category.id === 'windows') {
      return value === 0 ? 'None' : `${value} window${value !== 1 ? 's' : ''}`;
    }
    return category.options[value] || 'None';
  };

  // Handle scroll to prevent scrolling when no condition is selected
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedCondition && scrollRef.current) {
      // Prevent scrolling by resetting to the last allowed position
      scrollRef.current.scrollTop = lastScrollTop.current;
    } else if (scrollRef.current) {
      // Update the last allowed scroll position
      lastScrollTop.current = scrollRef.current.scrollTop;
    }
  }, [selectedCondition]);

  return (
    <Box border="1px solid" borderColor="gray.300" borderRadius="lg" p={6} bg="white" position="relative">
      <Text fontSize="lg" fontWeight="bold" color="text.primary" mb={4}>
        Edit Rehab Preset
      </Text>
      
      <VStack spacing={4} align="stretch">
                 <SimpleGrid 
            columns={{base: 1, md: 2}} 
            spacing={3} 
            maxH="60vh" 
            overflowY="auto"
            ref={scrollRef}
            onScroll={handleScroll}
          >
          {CONDITION_REHAB_CATEGORIES.map((category) => {
            const currentValue = categoryValues[category.id] || category.defaultValue;
            const currentLabel = getOptionLabel(category, currentValue);

            return (
              <Box 
                key={category.id} 
                bg="background.primary" 
                p={3} 
                borderRadius="md" 
                border="1px solid" 
                borderColor="border.primary"
                boxShadow="sm"
              >
                <VStack spacing={2} align="stretch">
                  {/* Category Header */}
                  <HStack spacing={2}>
                    <Icon as={category.icon} boxSize={4} color="brand.500" />
                    <Box flex={1}>
                      <Text fontWeight="semibold" fontSize="sm" color="text.primary">
                        {category.name}
                      </Text>
                      <Text fontSize="xs" color="text.secondary">{currentLabel}</Text>
                    </Box>
                  </HStack>

                  {/* Slider */}
                  <Box px={1}>
                    <Slider
                      value={currentValue}
                      min={category.min}
                      max={category.max}
                      step={category.step}
                      onChange={(value) => handleCategoryChange(category.id, value)}
                      colorScheme="brand"
                      size="sm"
                      isDisabled={!selectedCondition}
                    >
                      <SliderTrack bg="gray.200" h="4px">
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb boxSize={4} />
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
          p={3} 
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
        >
          <VStack spacing={2} align="stretch">
            <HStack spacing={2}>
              <Icon as={FaPercentage as React.ElementType} boxSize={4} color="brand.500" />
              <Box flex={1}>
                <Text fontWeight="semibold" fontSize="sm" color="text.primary">
                  Contingency
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  {contingencyPercent}% buffer for unexpected costs
                </Text>
              </Box>
            </HStack>

            <Box px={1}>
              <Slider
                value={contingencyPercent}
                min={0}
                max={25}
                step={5}
                onChange={handleContingencyChange}
                colorScheme="orange"
                size="sm"
                isDisabled={!selectedCondition}
              >
                <SliderTrack bg="gray.200" h="4px">
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </Box>

            <HStack justify="space-between" fontSize="xs" color="text.secondary" px={1}>
              <Text>0%</Text>
              <Text>25%</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>

      {/* Transparent overlay when no condition is selected */}
       {!selectedCondition && (
         <Box
           position="absolute"
           top={0}
           left={0}
           right={0}
           bottom={0}
           bg="rgba(255, 255, 255, 0.9)"
           borderRadius="lg"
           display="flex"
           flexDirection="column"
           alignItems="center"
           justifyContent="center"
           cursor="not-allowed"
           zIndex={10}
         >
           <Box
             border="1px solid"
             borderColor="gray.500"
             borderRadius="md"
             p={6}
             bg="gray.500"
             textAlign="center"
             maxW="90%"
           >
             <Text fontSize="lg" color="white" mb={2} fontWeight="bold">
               Select a condition
             </Text>
             <Text fontSize="sm" color="white" textAlign="center">
               Choose a property condition on the left to see and edit its rehab preset.
             </Text>
           </Box>
         </Box>
       )}
    </Box>
  );
};

export default ConditionRehabCalculator; 