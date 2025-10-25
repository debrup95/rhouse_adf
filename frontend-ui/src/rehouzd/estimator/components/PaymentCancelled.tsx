import React, { useEffect } from 'react';
import { Box, Text, Icon, VStack } from '@chakra-ui/react';
import { FaTimesCircle } from 'react-icons/fa';

const PaymentCancelled: React.FC = () => {
  useEffect(() => {
    // Send cancellation message to parent window
    if (window.opener) {
      window.opener.postMessage({ type: 'PAYMENT_CANCELLED' }, '*');
    }
    
    // Close the window after 2 seconds
    const timer = setTimeout(() => {
      window.close();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      bg="#fef2f2"
    >
      <VStack spacing={6} textAlign="center" p={8}>
        <Icon as={FaTimesCircle as React.ElementType} color="red.500" boxSize={16} />
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
          Payment Cancelled
        </Text>
        <Text color="gray.600">
          Your payment was cancelled.
          <br />
          This window will close automatically.
        </Text>
      </VStack>
    </Box>
  );
};

export default PaymentCancelled; 