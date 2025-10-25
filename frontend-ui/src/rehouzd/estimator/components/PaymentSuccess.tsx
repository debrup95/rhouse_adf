import React, { useEffect } from 'react';
import { Box, Text, Icon, VStack } from '@chakra-ui/react';
import { FaCheckCircle } from 'react-icons/fa';

const PaymentSuccess: React.FC = () => {
  useEffect(() => {
    // Send success message to parent window
    if (window.opener) {
      window.opener.postMessage({ type: 'PAYMENT_SUCCESS' }, '*');
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
      bg="#f0f9ff"
    >
      <VStack spacing={6} textAlign="center" p={8}>
        <Icon as={FaCheckCircle as React.ElementType} color="green.500" boxSize={16} />
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
          Payment Successful!
        </Text>
        <Text color="gray.600">
          Your payment has been processed successfully.
          <br />
          This window will close automatically.
        </Text>
      </VStack>
    </Box>
  );
};

export default PaymentSuccess; 