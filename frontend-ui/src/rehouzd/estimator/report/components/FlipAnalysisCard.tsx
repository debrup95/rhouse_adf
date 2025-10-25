import React from 'react';
import { Box, Heading, VStack, HStack, Text } from '@chakra-ui/react';

interface FlipAnalysisCardProps {
  purchasePrice: string;
  estimatedRehab: string;
  afterRepairValue: string;
  closingHoldingCosts: string;
  closingHoldingPercentage: number;
  estimatedNetProfit: string;
}

const FlipAnalysisCard: React.FC<FlipAnalysisCardProps> = ({ 
  purchasePrice, 
  estimatedRehab, 
  afterRepairValue, 
  closingHoldingCosts, 
  closingHoldingPercentage, 
  estimatedNetProfit 
}) => {
  const financialRows = [
    { label: 'Purchase Price:', value: purchasePrice },
    { label: 'Estimated Rehab:', value: estimatedRehab },
    { label: `Est. Closing/Holding (${closingHoldingPercentage}%)`, value: closingHoldingCosts },
    { label: 'After Repair Value:', value: afterRepairValue }
  ];

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      padding={6}
      display="flex"
      flexDirection="column"
      height="100%"
      position="relative"
    >
      <Heading
        size="md"
        margin="0 0 4 0"
        fontSize="xl"
        fontFamily="Poppins"
        color="brand.500"
        paddingBottom={4}
        textAlign="center"
      >
        Fix & Flip Scenario
      </Heading>
      
      {/* Green separator line */}
      <Box
        height="2px"
        backgroundColor="brand.500"
        marginBottom={4}
        borderRadius="1px"
      />
      
      <VStack spacing={3} align="stretch" flex="1" marginBottom="60px">
        {financialRows.map((row, index) => (
          <HStack
            key={index}
            justify="space-between"
            padding="3 0"
            borderBottom="1px solid"
            borderColor="gray.200"
            fontSize="sm"
          >
            <Text color="gray.600">{row.label}</Text>
            <Text fontWeight={700}>{row.value}</Text>
          </HStack>
        ))}
      </VStack>
      
      {/* Summary section positioned at bottom with absolute positioning */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        background="green.50"
        padding="6 6"
        borderBottomLeftRadius="lg"
        borderBottomRightRadius="lg"
        borderTop="1px solid"
        borderColor="gray.200"
        minHeight="60px"
        display="flex"
        alignItems="center"
      >
        <HStack justify="space-between" width="100%" paddingX={6}>
          <Text fontWeight={700} color="brand.500" fontSize="md">Estimated Net Profit</Text>
          <Text fontSize="lg" fontWeight={700} color="brand.500">{estimatedNetProfit}</Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default FlipAnalysisCard;
