import React from 'react';
import { Box, Heading, VStack, HStack, Text, Icon } from '@chakra-ui/react';
import { FaHome } from 'react-icons/fa';

interface PropertyDetailsCardProps {
  propertyType: string;
  bedBath: string;
  squareFootage: string;
  yearBuilt: string;
  condition: string;
  investmentType: string;
}

const PropertyDetailsCard: React.FC<PropertyDetailsCardProps> = ({
  propertyType,
  bedBath,
  squareFootage,
  yearBuilt,
  condition,
  investmentType
}) => {
  const detailItems = [
    { label: 'Type', value: propertyType },
    { label: 'Bed / Bath', value: bedBath },
    { label: 'Sq. Ft.', value: squareFootage },
    { label: 'Year Built', value: yearBuilt },
    { label: 'Condition', value: condition },
    { label: 'Investment Type', value: investmentType }
  ];

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      padding={6}
      display="flex"
      flexDirection="column"
    >
      <Heading
        size="md"
        margin="0 0 4 0"
        fontSize="xl"
        fontFamily="Poppins"
        color="brand.500"
        display="flex"
        alignItems="center"
        paddingBottom={4}
      >
        <Icon as={FaHome as React.ElementType} marginRight={2} />
        Property Details
      </Heading>
      
      <VStack spacing={2} align="stretch" flex={1}>
        {detailItems.map((item, index) => (
          <HStack
            key={index}
            justify="space-between"
            padding="2.5 0"
            borderBottom={index === detailItems.length - 1 ? 'none' : '1px solid'}
            borderColor="gray.200"
            fontSize="sm"
          >
            <Text color="gray.600">{item.label}</Text>
            <Text fontWeight={700}>{item.value}</Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};

export default PropertyDetailsCard;
