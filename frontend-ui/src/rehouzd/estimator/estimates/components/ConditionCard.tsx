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
    const borderColor = 'border.primary';
    const selectedBorderColor = 'background.primary';
    const cardBg = 'background.secondary';
    const titleColor = 'text.primary';
    const subColor = 'text.secondary';

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
            transition="box-shadow 0.2s"
            _hover={{
                boxShadow: 'lg',
            }}
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