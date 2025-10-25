import React from 'react';
import { Box, Heading, Text, VStack, HStack, Image, Button, Link } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import ShareSellerReportButton from './ShareSellerReportButton';

interface SellerReportHeaderProps {
  reportTitle: string;
  propertyAddress: string;
  propertyDetails: {
    bedBath: string;
    squareFootage: string;
  };
  onPrintPDF?: () => void;
  isSharedView?: boolean;
  // Props for ShareSellerReportButton
  reportStrategy?: 'rent' | 'flip';
  presetValues?: Record<string, number>;
  selectedComps?: string[];
  estimateData?: any;
}

const SellerReportHeader: React.FC<SellerReportHeaderProps> = ({ 
  reportTitle, 
  propertyAddress, 
  propertyDetails,
  onPrintPDF,
  isSharedView = false,
  reportStrategy = 'flip',
  presetValues = {},
  selectedComps,
  estimateData
}) => {
  return (
    <Box
      className="report-header"
      borderBottom="3px solid"
      borderColor="brand.500"
      paddingBottom={4}
      marginBottom={4}
      marginTop={2}
    >
      <HStack justify="space-between" align="center" height="60px">
        {/* Logo commented out as requested */}
        {/* <Box flex="1" display="flex" justifyContent="flex-start">
          <Image
            className="report-logo"
            src="/rehouzd-logo.png"
            alt="Rehouzd"
            height="50px"
            objectFit="contain"
          />
        </Box> */}
        
        <VStack spacing={1} align="flex-start" flex="1">
          <Heading
            className="report-title"
            size="xl"
            color="brand.500"
            fontFamily="Poppins"
            fontWeight={600}
            textAlign="left"
            whiteSpace="nowrap"
            fontSize="2xl"
          >
            {reportTitle}
          </Heading>
          <HStack spacing={2} align="center">
            {/* <a 
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
                fontSize="sm"
                color="gray.600"
                margin={0}
                style={{ whiteSpace: 'nowrap' }}
                textAlign="left"
              >
                {propertyAddress}
              </Text>
              <ExternalLinkIcon className="external-link-icon" ml={1} boxSize={3} />
            </a> */}
            <Text fontSize="xs" color="gray.500" margin={0} textAlign="left" whiteSpace="nowrap">
              <Link
                href={`https://www.google.com/search?q=${encodeURIComponent(`${propertyAddress} Zillow Redfin realtor.com homes.com`).replace(/%20/g, '+')}`}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                textDecoration="underline"
                _hover={{ textDecoration: "underline" }}
              >
                {propertyAddress}
                <ExternalLinkIcon className="external-link-icon" ml={1} boxSize={3} />
              </Link>
              
              , {propertyDetails.bedBath}, {propertyDetails.squareFootage}
            </Text>
          </HStack>
        </VStack>
        
        <HStack spacing={3} flex="1" justify="flex-end">
        {!isSharedView && (
          <Button
            size="sm"
            variant="outline"
            colorScheme="brand"
            data-print-hide
          >
            View Photos
          </Button>
        )}
          {!isSharedView && (
            <ShareSellerReportButton
              reportStrategy={reportStrategy}
              presetValues={presetValues}
              selectedComps={selectedComps}
              propertyAddress={propertyAddress}
              estimateData={estimateData}
              size="sm"
              colorScheme="brand"
            />
          )}
          {!isSharedView && (
            <Button
              size="sm"
              variant="solid"
              colorScheme="green"
              onClick={onPrintPDF}
              data-print-hide
            >
              Download PDF
            </Button>  
          )}        
        </HStack>
      </HStack>
    </Box>
  );
};

export default SellerReportHeader;
