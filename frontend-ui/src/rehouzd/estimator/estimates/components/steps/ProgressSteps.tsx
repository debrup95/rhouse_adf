import React from 'react';
import {
    Flex,
    Box,
    Text,
    useColorModeValue,
    HStack,
} from '@chakra-ui/react';

interface VerticalStep {
    title: string;
    description: string;
}

interface ProgressStepsProps {
    currentStep: number;
    setStep: (step: number) => void;
    verticalSteps: VerticalStep[];
}

/**
 * A vertical stepper that differentiates three states:
 * 1. Completed: stepNumber < currentStep
 * 2. Active: stepNumber === currentStep
 * 3. Incomplete: stepNumber > currentStep
 */
const ProgressSteps: React.FC<ProgressStepsProps> = ({
                                                         currentStep,
                                                         setStep,
                                                         verticalSteps,
                                                     }) => {
    // Shared color references
    const circleBgInactive = useColorModeValue('gray.300', 'gray.600');
    const textColorInactive = useColorModeValue('gray.800', 'gray.200');

    // For the stepper container
    const stepperBg = useColorModeValue('white', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    return (
        <Flex
            direction="column"
            w="100%"
            bg={stepperBg}
            py={3}
            borderRightWidth="1px"
            borderColor={borderColor}
            alignItems="flex-start"
        >
            {verticalSteps.map((item, index) => {
                const stepNumber = index + 1;

                // Determine state
                let circleBg, textColor;
                let clickable = false;

                if (stepNumber < currentStep) {
                    // Completed
                    circleBg = useColorModeValue('teal.200', 'teal.600'); // or any color for completed
                    textColor = useColorModeValue('gray.800', 'gray.100');
                    clickable = true; // allow user to go back
                } else if (stepNumber === currentStep) {
                    // Active
                    circleBg = useColorModeValue('teal.500', 'teal.300');
                    textColor = 'white';
                    clickable = true; // user can re-click
                } else {
                    // Incomplete
                    circleBg = circleBgInactive;
                    textColor = textColorInactive;
                    clickable = false; // user can’t skip ahead
                }

                const handleClick = () => {
                    if (clickable) {
                        setStep(stepNumber);
                    }
                };

                return (
                    <HStack
                        key={item.title}
                        spacing={2}
                        cursor={clickable ? 'pointer' : 'not-allowed'}
                        onClick={handleClick}
                        mb={4}
                    >
                        <Box
                            w="24px"
                            h="24px"
                            borderRadius="50%"
                            bg={circleBg}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color={textColor}
                            fontSize="sm"
                        >
                            {stepNumber}
                        </Box>
                        <Text fontSize="sm" color={textColor}>
                            {item.title}
                        </Text>
                    </HStack>
                );
            })}
        </Flex>
    );
};

export default ProgressSteps;
