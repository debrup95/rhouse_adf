import React from 'react';
import { Box, Image, Text, useColorModeValue } from '@chakra-ui/react';

interface ConditionCardProps {
    title: string;
    subtitle: string;
    imageUrl: string;
    isSelected: boolean;
    onSelect: () => void;
}

const ConditionCard: React.FC<ConditionCardProps> = ({
                                                         title,
                                                         subtitle,
                                                         imageUrl,
                                                         isSelected,
                                                         onSelect,
                                                     }) => {
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const selectedBorderColor = useColorModeValue('teal.500', 'teal.300');
    const cardBg = useColorModeValue('white', 'gray.700');
    const titleColor = useColorModeValue('gray.800', 'white');
    const subColor = useColorModeValue('gray.600', 'gray.300');

    return (
        <Box
            display="flex"
            alignItems="center"
            p={4}
            borderRadius="md"
            borderWidth="2px"
            borderColor={isSelected ? selectedBorderColor : borderColor}
            cursor="pointer"
            onClick={onSelect}
            bg={cardBg}
        >
            <Image
                src={imageUrl}
                alt={title}
                boxSize="80px"
                objectFit="cover"
                borderRadius="md"
                mr={4}
            />
            <Box textAlign="left">
                <Text fontWeight="bold" color={titleColor}>
                    {title}
                </Text>
                <Text fontSize="sm" color={subColor}>
                    {subtitle}
                </Text>
            </Box>
        </Box>
    );
};

export default ConditionCard;