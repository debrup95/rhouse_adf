import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  useColorModeValue,
  Container,
  Center,
  Divider,
} from '@chakra-ui/react';
import { FaHome, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  
  const bgColor = useColorModeValue('background.primary', 'gray.800');
  const textPrimaryColor = useColorModeValue('text.primary', 'white');
  const textSecondaryColor = useColorModeValue('text.secondary', 'gray.300');
  const brandColor = useColorModeValue('brand.500', 'brand.200');

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxW="container.lg" py={20}>
      <Center minH="60vh">
        <Box
          p={8}
          borderRadius="xl"
          bg={bgColor}
          boxShadow="xl"
          textAlign="center"
          maxW="600px"
          w="full"
          border="1px solid"
          borderColor={useColorModeValue('border.primary', 'gray.600')}
          position="relative"
          overflow="hidden"
        >
          {/* Background decoration */}
          <Box
            position="absolute"
            top="-50px"
            right="-50px"
            w="150px"
            h="150px"
            bg={brandColor}
            borderRadius="full"
            opacity={0.05}
            zIndex={0}
          />
          <Box
            position="absolute"
            bottom="-30px"
            left="-30px"
            w="100px"
            h="100px"
            bg={brandColor}
            borderRadius="full"
            opacity={0.05}
            zIndex={0}
          />
          <VStack spacing={6} position="relative" zIndex={1}>
            {/* 404 Display */}
            <Box position="relative" py={4}>
              <Heading 
                size="4xl" 
                color={brandColor}
                fontWeight="bold"
                letterSpacing="wider"
              >
                404
              </Heading>
              <Box 
                position="absolute"
                bottom={0}
                left="50%"
                transform="translateX(-50%)"
                w="60px"
                h="4px"
                bg={brandColor}
                borderRadius="full"
                opacity={0.3}
              />
            </Box>

            {/* Main heading */}
            <Heading 
              size="xl" 
              color={textPrimaryColor}
              textAlign="center"
            >
              Page Not Found
            </Heading>

            {/* Description */}
            <Text 
              fontSize="lg" 
              color={textSecondaryColor}
              textAlign="center"
              maxW="400px"
            >
              Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
            </Text>

            {/* Divider */}
            <Divider borderColor={brandColor} opacity={0.2} />

            {/* Action buttons */}
            <VStack spacing={4} pt={2}>
              <Button
                leftIcon={<Icon as={FaHome as React.ElementType} />}
                colorScheme="brand"
                size="lg"
                onClick={handleGoHome}
                px={8}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                transition="all 0.2s ease-in-out"
              >
                Go to Homepage
              </Button>
              
              <HStack spacing={4}>
                <Button
                  leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                  variant="outline"
                  colorScheme="brand"
                  size="md"
                  onClick={handleGoBack}
                  px={6}
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  }}
                  transition="all 0.2s ease-in-out"
                >
                  Go Back
                </Button>
                
                <Button
                  leftIcon={<Icon as={FaSearch as React.ElementType} />}
                  variant="outline"
                  colorScheme="brand"
                  size="md"
                  onClick={() => navigate('/estimate')}
                  px={6}
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  }}
                  transition="all 0.2s ease-in-out"
                >
                  Get Estimate
                </Button>
              </HStack>
            </VStack>

            {/* Additional help text */}
            <Text 
              fontSize="sm" 
              color={textSecondaryColor}
              textAlign="center"
              pt={4}
            >
              If you believe this is an error, please contact our support team.
            </Text>
          </VStack>
        </Box>
      </Center>
    </Container>
  );
};

export default NotFoundPage; 