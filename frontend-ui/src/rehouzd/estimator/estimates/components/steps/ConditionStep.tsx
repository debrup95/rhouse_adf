// ConditionStep.tsx
import React, { useState, useCallback } from 'react';
import { Box, Heading, VStack, HStack, Button, Icon, SimpleGrid } from '@chakra-ui/react';
import { FaArrowLeft } from 'react-icons/fa';
import ConditionGalleryCard from '../ConditionGalleryCard';
import ConditionRehabCalculator from '../ConditionRehabCalculator';

// Define condition data with image paths and strategy badges
const conditionData = [
    {
        value: 'Fixer',
        label: 'Fixer',
        description: 'Needs significant repairs, updates to major systems and finishes.',
        strategies: ['Fix & Flip', 'BRRRR'],
        exteriorImage: '/images/fixer/exterior-fixer.jpg',
        interiorImages: [
            '/images/fixer/fixer-kitchen.jpg',
            '/images/fixer/fixer-living-room.jpg',
            '/images/fixer/fixer-bathroom.jpg'
        ]
    },
    {
        value: 'Outdated',
        label: 'Outdated',
        description: 'Functional but needs cosmetic updates, older finishes and systems.',
        strategies: ['Fix & Flip', 'BRRRR'],
        exteriorImage: '/images/outdated/exterior-outdated.jpg',
        interiorImages: [
            '/images/outdated/outdated-kitchen.jpg',
            '/images/outdated/outdated-living-room.jpg',
            '/images/outdated/outdated-bathroom.jpg'
        ]
    },
    {
        value: 'Standard',
        label: 'Standard',
        description: 'Good condition, modern finishes, may need minor updates.',
        strategies: ['Buy & Hold'],
        exteriorImage: '/images/standard/exterior-standard.jpg',
        interiorImages: [
            '/images/standard/standard-kitchen.jpg',
            '/images/standard/standard-living-room.jpg',
            '/images/standard/standard-bathroom.jpg'
        ]
    },
    {
        value: 'Renovated',
        label: 'Renovated',
        description: 'Recently upgraded with premium finishes and modern systems.',
        strategies: ['Buy & Hold'],
        exteriorImage: '/images/renovated/exterior-renovated.jpg',
        interiorImages: [
            '/images/renovated/renovated-kitchen.jpg',
            '/images/renovated/renovated-living-room.jpg',
            '/images/renovated/renovated-bathroom.jpg'
        ]
    }
];

interface ConditionStepProps {
    selectedCondition: string;
    onConditionSelect: (condition: string) => void;
    onBack: () => void;
    onNext: () => void;
    isLoading?: boolean;
    loadingText?: string;
    propertyData?: {
        squareFootage?: number;
        address?: string;
        bathrooms?: number;
    };
    // Add new props for rehab values
    onRehabValuesChange?: (values: Record<string, number>) => void;
}

const ConditionStep: React.FC<ConditionStepProps> = ({ 
    selectedCondition, 
    onConditionSelect,
    onBack,
    onNext,
    isLoading = false,
    loadingText = "Loading...",
    propertyData = {},
    onRehabValuesChange
}) => {
    // Use theme colors directly
    const textColor = 'text.primary';
    
    // Handle rehab values change
    const handleRehabValuesChange = useCallback((values: Record<string, number>) => {
        onRehabValuesChange?.(values);
    }, [onRehabValuesChange]);
    
    return (
        <Box w="100%" maxW="1400px" mx="auto">
            <Heading 
                size="lg" 
                mb={6} 
                color={textColor}
            >
                Property Condition & Rehab Setup
            </Heading>
            
            {/* Two-panel layout */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8} w="100%">
                {/* Left Panel - Condition Selection */}
                <Box border="1px solid" borderColor="gray.300" borderRadius="lg" p={6} bg="white" flex="1">
                    <Heading 
                        size="md" 
                        mb={4} 
                        color={textColor}
                    >
                        Select Condition
                    </Heading>
                    
                    <VStack spacing={4} align="stretch">
                        {conditionData.map((condition) => (
                            <ConditionGalleryCard
                                key={condition.value}
                                condition={condition}
                                isSelected={selectedCondition === condition.value}
                                onClick={() => onConditionSelect(condition.value)}
                            />
                        ))}
                    </VStack>
                </Box>

                {/* Right Panel - Rehab Calculator */}
                <Box flex="1">
                    <ConditionRehabCalculator
                        selectedCondition={selectedCondition || null}
                        propertyData={propertyData}
                        onValuesChange={handleRehabValuesChange}
                    />
                </Box>
            </SimpleGrid>

            {/* Action Buttons */}
            <HStack mt={8} w="100%">
                <Button 
                    leftIcon={<Icon as={FaArrowLeft as React.ElementType} />} 
                    variant="outline" 
                    onClick={onBack} 
                    flex="1"
                >
                    Back
                </Button>
                <Button
                    colorScheme="brand"
                    flex="2"
                    isDisabled={!selectedCondition || isLoading}
                    onClick={() => {
                        try {
                            // Log snapshot before navigating to step 3
                            // Defer require to avoid import cycles
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            const { store } = require("../../../store");
                        } catch (e) {
                            console.warn("[ConditionStep] Failed to log underwrite snapshot:", e);
                        }
                        onNext();
                    }}
                    isLoading={isLoading}
                    loadingText={loadingText}
                >
                    Find Your Buyer
                </Button>
            </HStack>
        </Box>
    );
};

export default ConditionStep;
