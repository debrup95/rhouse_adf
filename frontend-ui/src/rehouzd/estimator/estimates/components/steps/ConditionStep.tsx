// ConditionStep.tsx
import React from 'react';
import {Box, Heading, SimpleGrid, HStack, Button, useColorModeValue, Icon} from '@chakra-ui/react';
import { FaArrowLeft } from 'react-icons/fa';
import ConditionCard from './ConditionCard';

interface ConditionStepProps {
    selectedCondition: string;
    onSelectCondition: (condition: string) => void;
    onBack: () => void;
    onNext: () => void;
    isLoading: boolean;
}

const ConditionStep: React.FC<ConditionStepProps> = ({
                                                         selectedCondition,
                                                         onSelectCondition,
                                                         onBack,
                                                         onNext,
                                                         isLoading,
                                                     }) => {
    return (
        <Box w="100%" mt={8}>
            <Heading size="md" mb={4} color={useColorModeValue('gray.800', 'white')}>
                How would you describe your home?
            </Heading>
            <SimpleGrid columns={1} spacing={4} w="100%">
                <ConditionCard
                    title="Fixer"
                    subtitle="Major Repairs"
                    imageUrl="/images/fixer.jpg"
                    isSelected={selectedCondition === 'Fixer'}
                    onSelect={() => onSelectCondition('Fixer')}
                />
                <ConditionCard
                    title="Outdated"
                    subtitle="In need of an update"
                    imageUrl="/images/outdated.jpg"
                    isSelected={selectedCondition === 'Outdated'}
                    onSelect={() => onSelectCondition('Outdated')}
                />
                <ConditionCard
                    title="Standard"
                    subtitle="Minor updates and touch ups"
                    imageUrl="/images/standard.jpg"
                    isSelected={selectedCondition === 'Standard'}
                    onSelect={() => onSelectCondition('Standard')}
                />
                <ConditionCard
                    title="Renovated"
                    subtitle="New Kitchen, Bathrooms, Flooring"
                    imageUrl="/images/renovated.jpg"
                    isSelected={selectedCondition === 'Renovated'}
                    onSelect={() => onSelectCondition('Renovated')}
                />
            </SimpleGrid>
            <HStack mt={6} w="100%">
                <Button leftIcon={<Icon as={FaArrowLeft as React.ElementType} />} variant="outline" onClick={onBack} flex="1">
                     Back
                </Button>
                <Button
                    colorScheme="teal"
                    flex="2"
                    isDisabled={!selectedCondition || isLoading}
                    onClick={onNext}
                    isLoading={isLoading}
                >
                    Get My Offer
                </Button>

            </HStack>
        </Box>
    );
};

export default ConditionStep;
