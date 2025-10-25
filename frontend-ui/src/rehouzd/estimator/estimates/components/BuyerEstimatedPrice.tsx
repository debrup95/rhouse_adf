import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Flex,
    Heading,
    Text,
    Input,
    HStack,
    VStack,
    SimpleGrid,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBuyerEstimatedPrice, updateTargetProfit } from '../../store/underwriteSlice';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { calculateBuyerEstimatedPrice } from '../../utils/calculateBuyerEstimatedPrice';

interface BuyerEstimatedPriceProps {
    strategy: string;
}

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
}

// Counter component for animating number changes
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '' }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest: number) => Math.round(latest));
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        const animation = animate(count, value, { duration: 0.8 });
        
        // Update the display value when the animation progresses
        const unsubscribe = rounded.onChange(v => {
            setDisplayValue(v);
        });
        
        return () => {
            animation.stop();
            unsubscribe();
        };
    }, [count, rounded, value]);
    
    // Format the number as currency
    const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        maximumFractionDigits: 0
    }).format(displayValue);
    
    return (
        <motion.span>
            {prefix}{formattedValue}
        </motion.span>
    );
};

export const BuyerEstimatedPrice: React.FC<BuyerEstimatedPriceProps> = ({ 
    strategy,
}) => {
    const dispatch = useAppDispatch();
    const borderPrimary = "border.primary";
    const textPrimary = "text.primary";
    
    // Get values from Redux store with safe defaults
    const rentValues = useAppSelector(state => state.underwrite?.rent || {
        afterRepairValue: 0,
        highRehab: 0
    });
    const flipValues = useAppSelector(state => state.underwrite?.flip || {
        estimatedOffer: 0,
        highRehab: 0,
        holdingCosts: 0
    });
    const buyerEstimatedPrice = useAppSelector(state => state.underwrite?.buyerEstimatedPrice || {
        buyerEstimatedOffer: 0,
        targetProfit: 0,
        maxAllowableOffer: 0
    });
    
    // Get address state to access property condition
    const addressState = useAppSelector(state => state.address);
    const propertyCondition = addressState.condition?.toLowerCase() || '';
    
    // Determine if property is a fixer based on condition
    const isFixerProperty = propertyCondition.toLowerCase() === 'outdated' || propertyCondition.toLowerCase() === 'fixer';
    
    // Determine if property is standard based on condition
    const isStandardProperty = propertyCondition.toLowerCase() === 'standard';
    
    // Format number with commas
    const formatNumberWithCommas = (value: number): string => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    // Ref to track if we're updating from user input
    const isUserInputRef = useRef(false);
    // Debounce timer for target profit dispatch
    const targetProfitDebounceRef = useRef<NodeJS.Timeout | null>(null);
    
    // Local state for target profit input with safe default
    const [targetProfitInput, setTargetProfitInput] = useState(
        formatNumberWithCommas(buyerEstimatedPrice?.targetProfit || 0)
    );
    
    // Update local state when Redux state changes (but not from user input)
    useEffect(() => {
        if (buyerEstimatedPrice?.targetProfit !== undefined && !isUserInputRef.current) {
            setTargetProfitInput(formatNumberWithCommas(buyerEstimatedPrice.targetProfit));
        }
        // Reset the flag
        isUserInputRef.current = false;
    }, [buyerEstimatedPrice?.targetProfit]);
    
    // Use the utility function to calculate buyer estimated price
    const calculatedPrice = useMemo(() => {
        // Prepare the data for the utility function
        const rentData = {
            afterRepairValue: rentValues.afterRepairValue,
            highRehab: rentValues.highRehab
        };
        
        const flipData = {
            estimatedOffer: flipValues.estimatedOffer,
            highRehab: flipValues.highRehab,
            holdingCosts: flipValues.holdingCosts
        };
        
        // Call the utility function
        return calculateBuyerEstimatedPrice(
            strategy,
            isFixerProperty,
            isStandardProperty,
            rentData,
            flipData
        );
    }, [
        strategy, 
        isFixerProperty, 
        isStandardProperty,
        rentValues.afterRepairValue, 
        rentValues.highRehab, 
        flipValues.estimatedOffer, 
        flipValues.highRehab, 
        flipValues.holdingCosts
    ]);
    
    // Update Redux store when calculated price changes
    useEffect(() => {
        const targetProfit = buyerEstimatedPrice?.targetProfit || 0;
        const maxAllowableOffer = Math.max(0, calculatedPrice.buyerEstimatedOffer - targetProfit);
        
        dispatch(updateBuyerEstimatedPrice({
            buyerEstimatedOffer: calculatedPrice.buyerEstimatedOffer,
            targetProfit: targetProfit,
            maxAllowableOffer: maxAllowableOffer
        }));
    }, [calculatedPrice.buyerEstimatedOffer, buyerEstimatedPrice?.targetProfit, dispatch]);
    
    // Handle target profit input changes
    const handleTargetProfitChange = useCallback((value: string) => {
        // Set flag to indicate this is user input
        isUserInputRef.current = true;
        
        // Remove commas and only allow numbers
        const numericValue = value.replace(/[^0-9]/g, '');
        const targetProfit = parseFloat(numericValue) || 0;
        
        // Enforce max limit of 100,000
        const clampedTargetProfit = Math.min(targetProfit, 100000);
        
        // Debounce Redux updates to avoid lag while typing
        if (targetProfitDebounceRef.current) {
            clearTimeout(targetProfitDebounceRef.current);
        }
        targetProfitDebounceRef.current = setTimeout(() => {
            dispatch(updateTargetProfit(clampedTargetProfit));
            // Reset the ref once dispatched
            targetProfitDebounceRef.current = null;
        }, 200);
        
        // Format with commas for display
        setTargetProfitInput(formatNumberWithCommas(clampedTargetProfit));
    }, [dispatch]);

    // Clear any pending debounce on unmount
    useEffect(() => {
        return () => {
            if (targetProfitDebounceRef.current) {
                clearTimeout(targetProfitDebounceRef.current);
            }
        };
    }, []);
    
    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };
    
    return (
        <Accordion 
            allowToggle 
            mb={{ base: 4, md: 6 }}
            borderRadius="xl"
            borderWidth="2px"
            borderColor="gray.200"
            bg="gray.50"
            boxShadow="lg"
            overflow="hidden"
        >
            <AccordionItem border="none">
                <AccordionButton 
                    p={{ base: 3, md: 4 }}
                    _hover={{ bg: "gray.100" }}
                    _expanded={{ bg: "gray.100" }}
                >
                    <Box flex="1" textAlign="left">
                        <Flex justify="space-between" align="center">
                            <VStack spacing={1} align="start" flex={1}>
                                <Heading 
                                    as="h3" 
                                    fontSize={{ base: "sm", md: "md" }} 
                                    color="gray.800"
                                    textAlign="left"
                                    fontWeight="semibold"
                                >
                                    Buyer's Estimated Purchase Price
                                </Heading>
                                
                                <Text 
                                    fontSize={{ base: "xs", md: "sm" }} 
                                    color="gray.600"
                                    textAlign="left"
                                >
                                    Most likely cash offer today.
                                </Text>
                            </VStack>
                            
                            {/* Large Price Display */}
                            <Box 
                                textAlign="right" 
                                ml={6}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={buyerEstimatedPrice?.buyerEstimatedOffer || 0}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <Text 
                                            fontWeight="bold" 
                                            fontSize={{ base: "xl", md: "2xl", lg: "3xl" }} 
                                            color="green.800"
                                            textAlign="right"
                                        >
                                            <AnimatedCounter value={buyerEstimatedPrice?.buyerEstimatedOffer || 0} prefix="$" />
                                        </Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>
                        </Flex>
                    </Box>
                    <AccordionIcon />
                </AccordionButton>
                
                <AccordionPanel pb={4} px={{ base: 3, md: 4 }}>
                    {/* Separator Line */}
                    <Box 
                        height="2px" 
                        bg="gray.300" 
                        mb={4}
                        borderRadius="full"
                    />
                    
                    {/* Three boxes layout */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={4}>
                        {/* Target Profit */}
                        <Box
                            p={3}
                            borderRadius="xl"
                            borderWidth="2px"
                            borderColor="gray.200"
                            display="flex"
                            flexDirection="column"
                        >
                            <VStack spacing={1} align="start">
                                <Text 
                                    fontSize="md" 
                                    color="gray.700" 
                                    textAlign="left"
                                >
                                    Target Profit
                                </Text>
                                <Box position="relative" width="100%">
                                    <Text
                                        position="absolute"
                                        left="16px"
                                        top="50%"
                                        transform="translateY(-50%)"
                                        color="gray.500"
                                        fontSize="lg"
                                        fontWeight="bold"
                                        zIndex={10}
                                        pointerEvents="none"
                                    >
                                        $
                                    </Text>
                                    <Input
                                        value={targetProfitInput}
                                        onChange={(e) => handleTargetProfitChange(e.target.value)}
                                        placeholder="0"
                                        fontSize="xl"
                                        fontWeight="bold"
                                        textAlign="left"
                                        bg="white"
                                        borderColor="gray.300"
                                        borderWidth="2px"
                                        height="50px"
                                        color={targetProfitInput && targetProfitInput !== "0" ? "gray.800" : "gray.500"}
                                        _placeholder={{
                                            color: "gray.500"
                                        }}
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)"
                                        }}
                                        pl="7"
                                        pr="4"
                                    />
                                </Box>
                            </VStack>
                        </Box>
                        
                        {/* Max Allowable Offer */}
                        <Box
                            p={3}
                            borderRadius="xl"
                            borderWidth="2px"
                            borderColor="gray.200"
                            display="flex"
                            flexDirection="column"
                        >
                            <VStack spacing={1} align="start">
                                <Text 
                                    fontSize="md" 
                                    color="gray.700" 
                                    textAlign="left"
                                >
                                    Max Allowable Offer
                                </Text>
                                <Text 
                                    fontSize="2xl" 
                                    fontWeight="bold" 
                                    color="gray.800" 
                                    textAlign="left"
                                >
                                    <AnimatedCounter value={buyerEstimatedPrice?.maxAllowableOffer || 0} prefix="$" />
                                </Text>
                            </VStack>
                        </Box>
                        
                        {/* Buyer Estimated Offer */}
                        <Box
                            p={3}
                            borderRadius="xl"
                            borderWidth="2px"
                            borderColor="gray.200"
                            display="flex"
                            flexDirection="column"
                        >
                            <VStack spacing={1} align="start">
                                <Text 
                                    fontSize="md" 
                                    color="gray.700" 
                                    textAlign="left"
                                >
                                    Buyer Estimated Offer
                                </Text>
                                <Text 
                                    fontSize="2xl" 
                                    fontWeight="bold" 
                                    color="gray.800" 
                                    textAlign="left"
                                >
                                    <AnimatedCounter value={buyerEstimatedPrice?.buyerEstimatedOffer || 0} prefix="$" />
                                </Text>
                            </VStack>
                        </Box>
                    </SimpleGrid>
                    
                    {/* Formula explanation */}
                    <Box textAlign="left">
                        <Text 
                            fontSize="sm" 
                            color="gray.600" 
                            textAlign="left"
                            fontWeight="medium"
                        >
                            Max Allowable Offer = Buyer Estimated Offer - Target Profit.
                        </Text>
                    </Box>
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
    );
};

export default BuyerEstimatedPrice;