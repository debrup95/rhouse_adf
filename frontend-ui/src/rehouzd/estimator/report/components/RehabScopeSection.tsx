import React from 'react';
import { Box, Heading, VStack, HStack, Text } from '@chakra-ui/react';

interface RehabItem {
  name: string;
  cost: string;
}

interface RehabScopeSectionProps {
  items: RehabItem[];
  total: string;
}

const RehabScopeSection: React.FC<RehabScopeSectionProps> = ({ items, total }) => {
  return (
    <Box>
      <Heading size="md" marginTop={0} fontSize="lg" borderBottom="2px solid" borderColor="gray.200" paddingBottom={1} marginBottom={3} color="gray.800" fontFamily="Poppins" textAlign="center">
        Estimated Rehab Scope
      </Heading>
      
      <VStack spacing={1} align="stretch">
        {items.map((item, index) => (
          <HStack
            key={index}
            justify="space-between"
            fontSize="sm"
            padding="1 0"
          >
            <Text>{item.name}</Text>
            <Text>{item.cost}</Text>
          </HStack>
        ))}
        
        <HStack
          justify="space-between"
          fontWeight={700}
          borderTop="2px solid"
          borderColor="gray.800"
          marginTop={1}
          paddingTop={1}
        >
          <Text>Total Estimate</Text>
          <Text>{total}</Text>
        </HStack>
      </VStack>
    </Box>
  );
};

export default RehabScopeSection;
