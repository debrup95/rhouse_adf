import React from 'react';
import { Box, Heading, Text, VStack, HStack, Image } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface ReportHeaderProps {
  reportTitle: string;
  propertyAddress: string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ reportTitle, propertyAddress }) => {
  return (
    <Box
      className="report-header"
      borderBottom="3px solid"
      borderColor="brand.500"
      paddingBottom={4}
      marginBottom={4}
    >
      <HStack justify="space-between" align="center" height="60px">
        <Box flex="1" display="flex" justifyContent="flex-start">
          <Image
            className="report-logo"
            src="/rehouzd-logo.png"
            alt="Rehouzd"
            height="50px"
            objectFit="contain"
          />
        </Box>
        
        <VStack spacing={2} align="center" flex="2">
          <Heading
            className="report-title"
            size="xl"
            color="brand.500"
            fontFamily="Poppins"
            fontWeight={600}
            textAlign="center"
            whiteSpace="nowrap"
            fontSize="3xl"
          >
            {reportTitle}
          </Heading>
          <a 
            href={`https://www.google.com/search?q=${encodeURIComponent(`${propertyAddress} Zillow Redfin realtor.com homes.com`).replace(/%20/g, '+')}`}
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
            <Text
              className="header-address"
              fontSize="lg-sm"
              color="gray.600"
              margin={0}
              style={{ whiteSpace: 'nowrap' }}
              textAlign="center"
            >
              {propertyAddress}
            </Text>
            <ExternalLinkIcon className="external-link-icon" ml={1} boxSize={4} />
          </a>
        </VStack>
        
        <Box flex="1" />
      </HStack>
    </Box>
  );
};

export default ReportHeader;
