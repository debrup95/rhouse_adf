import React from 'react';
import { Box, HStack, Text, Button, Image } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import ShareSellerReportButton from './ShareSellerReportButton';

interface SellerReportFooterProps {
  isSharedView?: boolean;
  reportStrategy?: 'rent' | 'flip';
  presetValues?: Record<string, number>;
  selectedComps?: string[];
  propertyAddress?: string;
  estimateData?: any;
  onPrintPDF?: () => void;
}

const SellerReportFooter: React.FC<SellerReportFooterProps> = ({ 
  isSharedView = false,
  reportStrategy = 'flip',
  presetValues = {},
  selectedComps,
  propertyAddress = 'Property Report',
  estimateData,
  onPrintPDF
}) => {
  return (
    <Box
      className="page-break-avoid"
      borderTop="1px solid"
      borderColor="gray.200"
      paddingTop={4}
      marginTop={4}
    >
      {/* Footer Content */}
      <HStack justify="space-between" align="center" fontSize="sm">
        <Image
          src="/rehouzd-logo.png"
          alt="Rehouzd"
          height="45px"
          crossOrigin="anonymous"
          objectFit="contain"
        />
        
        <HStack spacing={3}>
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

export default SellerReportFooter;
