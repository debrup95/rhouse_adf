import React from 'react';
import { Box, Heading, VStack, Text, Divider } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface Comparable {
  type: string;
  address: string;
  price: string;
  details: string;
  date?: string;
}

interface ComparablesSectionProps {
  arvComps: Comparable[];
  rentalComps: Comparable[];
}

const ComparablesSection: React.FC<ComparablesSectionProps> = ({ arvComps, rentalComps }) => {
  const renderCompItem = (comp: Comparable, index: number) => (
    <Box key={index} marginBottom={2} fontSize="sm" justifyContent="center">
      <Text fontWeight={700} color="gray.800" fontSize="sm">
        {comp.type}: <a 
          href={`https://www.google.com/search?q=${encodeURIComponent(`${comp.address} Zillow Redfin realtor.com homes.com`).replace(/%20/g, '+')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            color: "inherit", 
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          {comp.address}
          <ExternalLinkIcon ml={1} boxSize={3} />
        </a> - <Text as="span" color="brand.500" fontWeight={700} fontSize="md">
          {comp.price}
        </Text>
      </Text>
      <Text color="gray.600" lineHeight={1.5}>
        {comp.details}{comp.date && ` | ${comp.type === 'SOLD' ? 'Sold' : 'Rented'} ${comp.date}`}
      </Text>
    </Box>
  );

  return (
    <Box>
      <Heading size="md" marginTop={0} justifyContent={'center'} fontSize="lg" borderBottom="2px solid" borderColor="gray.200" paddingBottom={1} marginBottom={3} color="gray.800" fontFamily="Poppins" textAlign="center">
        ARV & Rental Comparables
      </Heading>
      
      <VStack spacing={1} align="stretch">
        <Box justifyContent="center">
          {arvComps.map((comp, index) => renderCompItem(comp, index))}
        </Box>
        
        <Divider />
        
        <Box>
          {rentalComps.map((comp, index) => renderCompItem(comp, index))}
        </Box>
      </VStack>
    </Box>
  );
};

export default ComparablesSection;
