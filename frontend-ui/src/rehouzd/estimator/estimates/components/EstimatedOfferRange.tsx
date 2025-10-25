import React, { useMemo, useState, useEffect } from 'react';
import {
    Box,
    Flex,
    Heading,
    Text,
    Image,
    Icon,
    HStack,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateOfferRange } from '../../store/underwriteSlice';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { calculateOfferRange } from '../../utils/calculateBuyerEstimatedPrice';

interface EstimatedOfferRangeProps {
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

export const EstimatedOfferRange: React.FC<EstimatedOfferRangeProps> = ({ 
    strategy,
}) => {
    const dispatch = useAppDispatch();
    const borderPrimary = "border.primary";
    const textPrimary = "text.primary";
    
    // Get values from Redux store
    const rentValues = useAppSelector(state => state.underwrite.rent);
    const flipValues = useAppSelector(state => state.underwrite.flip);
    
    // Get address state to access property condition
    const addressState = useAppSelector(state => state.address);
    const propertyCondition = addressState.condition?.toLowerCase() || '';
    
    // Determine if property is a fixer based on condition
    const isFixerProperty = propertyCondition.toLowerCase() === 'outdated' || propertyCondition.toLowerCase() === 'fixer';
    
    // Determine if property is standard based on condition
    const isStandardProperty = propertyCondition.toLowerCase() === 'standard';
    
    // State to track previous values for animations
    const [prevLow, setPrevLow] = useState(0);
    const [prevHigh, setPrevHigh] = useState(0);
    
    // Use the utility function to calculate offer range
    const offerRange = useMemo(() => {
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
        return calculateOfferRange(
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
    
    // Update previous values for animation and dispatch to Redux
    useEffect(() => {
        setPrevLow(offerRange.low);
        setPrevHigh(offerRange.high);
        
        // Dispatch the updated offer range to Redux
        dispatch(updateOfferRange({
            low: offerRange.low,
            high: offerRange.high
        }));
    }, [offerRange.low, offerRange.high, dispatch]);
    
    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };
    
    return (
        <Box
            p={{ base: 4, md: 6 }}
            borderRadius="lg"
            mb={{ base: 4, md: 6 }}
            bg="gray.50"
            borderWidth="1px"
            borderColor={borderPrimary}
            width="100%"
            maxWidth="100%"
            overflow="hidden"
        >
            <Heading as="h3" size={{ base: "sm", md: "md" }} mb={{ base: 3, md: 4 }} color="gray.700">
                Buyers Estimated Purchase Price
            </Heading>
            <Flex 
                justify="space-between" 
                align="center" 
                mb={{ base: 2, md: 2 }}
                direction={{ base: "column", sm: "row" }}
                gap={{ base: 2, sm: 0 }}
                width="100%"
                maxWidth="100%"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={offerRange.low}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3 }}
                        style={{ maxWidth: "100%", overflow: "hidden" }}
                    >
                        <Text 
                            fontWeight="bold" 
                            fontSize={{ base: "lg", md: "xl" }} 
                            color={textPrimary}
                            textAlign={{ base: "center", sm: "left" }}
                            wordBreak="break-word"
                        >
                            <AnimatedCounter value={offerRange.low} prefix="$" />
                        </Text>
                    </motion.div>
                </AnimatePresence>
                <Text fontSize={{ base: "sm", md: "md" }} color="gray.500" display={{ base: "block", sm: "none" }}>
                    to
                </Text>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={offerRange.high}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{ maxWidth: "100%", overflow: "hidden" }}
                    >
                        <Text 
                            fontWeight="bold" 
                            fontSize={{ base: "lg", md: "xl" }} 
                            color={textPrimary}
                            textAlign={{ base: "center", sm: "right" }}
                            wordBreak="break-word"
                        >
                            <AnimatedCounter value={offerRange.high} prefix="$" />
                        </Text>
                    </motion.div>
                </AnimatePresence>
            </Flex>
            <Box position="relative" h={{ base: "8px", md: "12px" }} mb={{ base: 3, md: 4 }} width="100%">
                <Box 
                    position="absolute" 
                    left="0" 
                    right="0" 
                    h={{ base: "8px", md: "12px" }}
                    bg="gray.200" 
                    borderRadius="full"
                    width="100%"
                />
                    <Box 
                        position="absolute" 
                        left="0" 
                        width="50%" 
                        h={{ base: "8px", md: "12px" }}
                        bgGradient="linear(to-r, #0a3c34, #b6e78d)"
                        borderRadius="full"
                    />
            </Box>
        </Box>
    );
};

export default EstimatedOfferRange;