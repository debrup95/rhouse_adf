import React from 'react';
import { Box, Heading, VStack, Text, Link } from '@chakra-ui/react';

interface ReportFooterProps {
  contactTitle: string;
  companyName: string;
  phone: string;
  email: string;
  contactInfo?: string;
}

const ReportFooter: React.FC<ReportFooterProps> = ({
  contactTitle,
  companyName,
  phone,
  email,
  contactInfo
}) => {
  return (
    <Box
      marginTop={1}
      paddingTop={1}
      borderTop="2px solid"
      borderColor="brand.500"
      textAlign="center"
    >
      <VStack spacing={0.5}>
        <Heading
          size="sm"
          margin="0"
          fontSize="lg"
          fontFamily="Poppins"
          color="gray.800"
        >
          {contactTitle}
        </Heading>
        
        <Text margin="0" fontSize="sm" color="gray.600" fontWeight="bold">
          {contactInfo ? (
            // Use pre-formatted contact info for PDF compatibility
            contactInfo
          ) : (
            // Fallback to original format
            <>
              {companyName}
              {companyName && phone && ' | '}
              {phone && (
                <Link href={`tel:${phone.replace(/[^\d]/g, '')}`} color="brand.500" textDecoration="none" fontWeight="bold">
                  {phone}
                </Link>
              )}
              {phone && email && ' | '}
              {email && (
                <Link href={`mailto:${email}`} color="brand.500" textDecoration="none" fontWeight="bold">
                  {email}
                </Link>
              )}
            </>
          )}
        </Text>
      </VStack>
    </Box>
  );
};

export default ReportFooter;
