import React from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  HStack,
  Image,
  Flex,
  Icon,
  Center,
  Grid,
  GridItem,
  VStack,
} from '@chakra-ui/react';

const Footer = () => {  
  return (
    <Box bg="white" color="gray.600" py={{ base: 2, md: 4 }} borderTopWidth="1px" borderColor="gray.200">
      <Container maxW="container.xl" px={{ base: 2, md: 4 }}>
        {/* Logo */}
        <Center mb={{ base: 0, md: 1 }}>
          <Image 
            src="/rehouzd-logo.png" 
            alt="Rehouzd Logo" 
            height={{ base: "60px", md: "100px" }}
            width={{ base: "150px", md: "250px" }}
          />
        </Center>
        
        {/* Contact information */}
        <Center mb={{ base: 2, md: 3 }}>
          <VStack spacing={{ base: 1, md: 0 }}>
            <HStack 
              spacing={{ base: 1, md: 2 }} 
              fontSize={{ base: "12px", md: "16px" }}
              flexWrap="wrap"
              justify="center"
            >
              <Text fontFamily="body">Call Us:</Text>
              <Link href="tel:310-689-8695" fontWeight="bold" color="gray.800" fontFamily="body">
                310-689-8695
              </Link>
            </HStack>
            <HStack 
              spacing={{ base: 1, md: 2 }} 
              fontSize={{ base: "12px", md: "16px" }}
              flexWrap="wrap"
              justify="center"
            >
              <Text fontFamily="body">Email Us:</Text>
              <Link href="mailto:Deal@rehouzd.com" fontWeight="bold" color="gray.800" fontFamily="body">
                Deal@rehouzd.com
              </Link>
            </HStack>
          </VStack>
        </Center>
        
        {/* License information */}
        <Box px={{ base: 1, md: 8 }}>
          <Center>
            <Grid templateColumns={{ base: "1fr", lg: "1fr auto" }} gap={{ base: 1, md: 2 }} w="70%">
              <GridItem 
                bg="#0f3e0a" 
                color="white" 
                py={{ base: 2, md: 3 }} 
                px={{ base: 2, md: 8 }} 
                borderRadius="15px"
                position="relative"
              >
                <VStack spacing={{ base: 0.5, md: 1 }}>
                  <Text 
                    fontWeight="bold" 
                    fontSize={{ base: "14px", md: "16px" }} 
                    fontFamily="heading"
                    textAlign="center"
                  >
                    SEAN KIRK
                  </Text>
                  <Text 
                    fontFamily="body" 
                    fontSize={{ base: "10px", md: "14px" }} 
                    textAlign="center"
                  >
                    REHOUZD
                  </Text>
                  <Text 
                    fontFamily="body" 
                    fontSize={{ base: "8px", md: "14px" }} 
                    textAlign="center"
                    lineHeight="1.2"
                  >
                    TX TREC Information About Brokerage Services,
                  </Text>
                  <Text 
                    fontFamily="body" 
                    fontSize={{ base: "8px", md: "14px" }} 
                    textAlign="center"
                  >
                    TREC Consumer Protection Notice
                  </Text>
                  <Text 
                    fontFamily="body" 
                    fontSize={{ base: "10px", md: "14px" }} 
                    textAlign="center"
                  >
                    License: 728419
                  </Text>
                  <Text 
                    fontFamily="body" 
                    fontSize={{ base: "8px", md: "14px" }} 
                    textAlign="center"
                    lineHeight="1.2"
                  >
                    TN Curb Realty - 11205 Lebanon Rd Mt Juliet TN 37122
                  </Text>
                </VStack>
              </GridItem>
              
              <GridItem 
                display="flex" 
                alignItems={{ base: "center", lg: "flex-end" }} 
                justifyContent="center"
                mt={{ base: 0, lg: 12 }}
              >
                <Image 
                  src="/equal-housing-opportunity2.png" 
                  alt="Equal Housing Opportunity" 
                  height={{ base: "30px", md: "45px" }}
                />
              </GridItem>
            </Grid>
          </Center>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
