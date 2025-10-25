import React, { useEffect, useState } from 'react';
import { Box, Heading, Spinner, Text, Center, Alert, AlertIcon, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

/**
 * Component that handles Google OAuth callback
 * This is the page that Google will redirect to after authentication
 */
const GoogleOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    const processOAuthCallback = () => {
      try {
        // Get the URL parameters
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        const errorReason = params.get('reason');
        const code = params.get('code');
        const state = params.get('state');
        const token = params.get('token');
        const email = params.get('email');
        const firstName = params.get('firstName');
        const lastName = params.get('lastName');
        const userId = params.get('userId');
        const isNewUser = params.get('isNewUser');
        
        // Comprehensive logging for debugging
        const debugData = {
          url: window.location.href,
          params: Object.fromEntries(params.entries()),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        };
        

        
        setDebugInfo(debugData);
        
        // Handle OAuth errors
        if (error) {
          const errorMessage = `OAuth Error: ${error}${errorReason ? ` (${errorReason})` : ''}`;
          setStatus('error');
          setErrorDetails(errorMessage);
          return;
        }
        
        // Handle successful OAuth with token (backend processed)
        if (token && email && userId) {
          setStatus('success');
          
          // Use GoogleAuthHandler logic to process the token
          import('../../auth/components/GoogleAuthHandler').then(() => {
            // Redirect to the auth handler path with current params
            navigate(`/auth/google/callback${window.location.search}`);
          });
          return;
        }
        
        // Handle OAuth authorization code (needs processing)
        if (code) {
          setStatus('error');
          setErrorDetails('Authentication code received but backend processing failed. Check server logs.');
          return;
        }
        
        // No valid OAuth response
        setStatus('error');
        setErrorDetails('Invalid OAuth response - missing required parameters');
        
      } catch (err) {
        setStatus('error');
        setErrorDetails(`Processing error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Process immediately
    processOAuthCallback();
  }, [navigate]);
  
  const handleRetryAuth = () => {
    navigate('/');
  };
  
  const handleViewDebugInfo = () => {
    alert('Debug info logged to console. Please check browser developer tools.');
  };
  
  if (status === 'error') {
    return (
      <Box p={8} maxWidth="600px" mx="auto" textAlign="center">
        <Center flexDirection="column" h="50vh">
          <Heading size="md" mb={4} color="red.500">Authentication Error</Heading>
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">OAuth Error Details:</Text>
              <Text fontSize="sm">{errorDetails}</Text>
            </VStack>
          </Alert>
          
          <VStack spacing={4}>
            <Button colorScheme="blue" onClick={handleRetryAuth}>
              Return to Home & Try Again
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewDebugInfo}>
              View Debug Info (Console)
            </Button>
          </VStack>
          
          <Text mt={6} fontSize="xs" color="gray.500">
            If this error persists, please contact support.
          </Text>
        </Center>
      </Box>
    );
  }
  
  if (status === 'success') {
    return (
      <Box p={8} maxWidth="500px" mx="auto" textAlign="center">
        <Center flexDirection="column" h="50vh">
          <Heading size="md" mb={4} color="green.500">Authentication Successful</Heading>
          <Text>Redirecting you to your account...</Text>
          <Spinner size="lg" mt={4} color="green.500" />
        </Center>
      </Box>
    );
  }
  
  // Default processing state
  return (
    <Box p={8} maxWidth="500px" mx="auto" textAlign="center">
      <Center flexDirection="column" h="50vh">
        <Heading size="md" mb={4}>Processing Google Authentication</Heading>
        <Spinner size="xl" mb={4} color="blue.500" />
        <Text>Please wait while we process your authentication...</Text>
        <Text mt={4} fontSize="sm" color="gray.500">This should complete within a few seconds.</Text>
        
        <Alert status="info" mt={8} borderRadius="md">
          <AlertIcon />
          Do not close this window. Processing authentication...
        </Alert>
        
        {debugInfo && (
          <Button 
            variant="outline" 
            size="xs" 
            mt={4} 
            onClick={handleViewDebugInfo}
          >
            Debug Info
          </Button>
        )}
      </Center>
    </Box>
  );
};

export default GoogleOAuthCallback; 