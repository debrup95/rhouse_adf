import React, { useState } from 'react';
import { Box, Text, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, SimpleGrid, useColorModeValue } from '@chakra-ui/react';

const UnderwriteSliders: React.FC = () => {
    const [rent, setRent] = useState(1000);
    const [expense, setExpense] = useState(35);
    const [capRate, setCapRate] = useState(6.5);
    const [lowRehab, setLowRehab] = useState(30);
    const [highRehab, setHighRehab] = useState(40);
    const labelColor = useColorModeValue('gray.800', 'white');

    return (
        <SimpleGrid columns={[1, 2, 3]} spacing={6}>
            {/* Rent Slider */}
            <Box>
                <Text fontWeight="bold" color={labelColor}>
                    Rent
                </Text>
                <HStack>
                    <Text>${rent}</Text>
                </HStack>
                <Slider min={500} max={3000} step={50} value={rent} onChange={(val) => setRent(val)} colorScheme="teal">
                    <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                </Slider>
            </Box>

            {/* Expense Slider */}
            <Box>
                <Text fontWeight="bold" color={labelColor}>
                    Expense
                </Text>
                <HStack>
                    <Text>{expense}%</Text>
                </HStack>
                <Slider min={0} max={100} step={5} value={expense} onChange={(val) => setExpense(val)} colorScheme="teal">
                    <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                </Slider>
            </Box>

            {/* Cap Rate Slider */}
            <Box>
                <Text fontWeight="bold" color={labelColor}>
                    Cap Rate
                </Text>
                <HStack>
                    <Text>{capRate}%</Text>
                </HStack>
                <Slider min={0} max={15} step={0.5} value={capRate} onChange={(val) => setCapRate(val)} colorScheme="teal">
                    <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                </Slider>
            </Box>

            {/* Low Rehab Slider */}
            <Box>
                <Text fontWeight="bold" color={labelColor}>
                    Low Rehab
                </Text>
                <HStack>
                    <Text>{lowRehab}k</Text>
                </HStack>
                <Slider min={0} max={100} step={5} value={lowRehab} onChange={(val) => setLowRehab(val)} colorScheme="teal">
                    <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                </Slider>
            </Box>

            {/* High Rehab Slider */}
            <Box>
                <Text fontWeight="bold" color={labelColor}>
                    High Rehab
                </Text>
                <HStack>
                    <Text>{highRehab}k</Text>
                </HStack>
                <Slider min={0} max={200} step={10} value={highRehab} onChange={(val) => setHighRehab(val)} colorScheme="teal">
                    <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                </Slider>
            </Box>
        </SimpleGrid>
    );
};

export default UnderwriteSliders;