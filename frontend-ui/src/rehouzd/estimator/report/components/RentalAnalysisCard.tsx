import React from 'react';
import { Box, Heading, VStack, HStack, Text } from '@chakra-ui/react';

interface RentalAnalysisCardProps {
  purchasePrice: string;
  estimatedRehab: string;
  monthlyRent: string;
  monthlyExpenses: string;
  monthlyNetIncome: string;
  capRate: string | number;
  expensePercentage: string;
}

const RentalAnalysisCard: React.FC<RentalAnalysisCardProps> = ({ 
  purchasePrice, 
  estimatedRehab, 
  monthlyRent, 
  monthlyExpenses, 
  monthlyNetIncome, 
  capRate, 
  expensePercentage 
}) => {
  const financialRows = [
    { label: 'Purchase Price:', value: purchasePrice },
    { label: 'Estimated Rehab:', value: estimatedRehab },
    { label: 'Estimated Monthly Rent:', value: monthlyRent },
    { label: `Est. Expenses (${expensePercentage}%)`, value: monthlyExpenses },
    { label: 'Est. Net Operating Income:', value: monthlyNetIncome }
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
        BRRRR / Rental Scenario
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
          <Text fontWeight={700} color="brand.500" fontSize="md">Estimated Cap Rate</Text>
          <Text fontSize="lg" fontWeight={700} color="brand.500">{capRate}{typeof capRate === 'number' ? '%' : ''}</Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default RentalAnalysisCard;
