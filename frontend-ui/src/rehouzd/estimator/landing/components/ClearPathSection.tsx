import React from 'react';
import {
  Box,
  Container,
  Flex,
  Text,
  Heading,
  VStack,
  Image,
  HStack,
} from '@chakra-ui/react';

const steps = [
  {
    number: 1,
    title: "Price the Deal",
    description: "Enter an address to get ARV, rehab budget, comps and max allowable offer.",
  },
  {
    number: 2,
    title: "See your Buyers",
    description: "Instantly access a ranked list of verified cash buyers who fit the deal.",
  },
  {
    number: 3,
    title: "Take Action",
    description: "Call the top buyer, share the numbers, and lock in the offer - no guesswork.",
  },
];

const imageSources = [
  '/EstimatedOfferPrice_Step1.png',
  '/BuyersList_Step2.png',
  '/Offer_Step3.png',
];

const ClearPathSection = () => {
  return (
    <Box py={{ base: 8, md: 12, lg: 16 }} color="white">
      <Container maxW="1400px" px={{ base: 4, md: 6, lg: 8 }}>
        <VStack spacing={{ base: 8, md: 12, lg: 16 }} align="stretch">
          <Heading
            textAlign="center"
            fontSize={{ base: 'lg', md: 'xl', lg: '2xl', xl: '3xl' }}
            fontWeight="bold"
            letterSpacing="wide"
            mb={{ base: 4, md: 6 }}
          >
            A CLEAR PATH TO CLOSE
          </Heading>

          {/* Desktop/large screens: two-column layout */}
          <Flex
            display={{ base: 'none', lg: 'flex' }}
            direction="row"
            gap={{ base: 8, md: 12, lg: 16 }}
            align="flex-start"
          >
            {/* Left Side - Steps */}
            <VStack spacing={{ base: 8, md: 10, lg: 12 }} align="stretch" flex="1">
              {steps.map((step, index) => (
                <Flex key={step.number} minH={{ base: "180px", md: "200px", lg: "280px" }} align="center">
                  {/* Step Number Box */}
                  <Box
                    bg="whiteAlpha.300"
                    borderRadius="md"
                    minW={{ base: "60px", md: "70px", lg: "80px" }}
                    minH={{ base: "60px", md: "70px", lg: "80px" }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
                    fontWeight="bold"
                    mr={{ base: 4, md: 5, lg: 6 }}
                    color="white"
                    flexShrink={0}
                  >
                    {step.number}
                  </Box>

                  {/* Title and Description */}
                  <Box flex="1">
                    <Text 
                      fontSize={{ base: "lg", md: "xl", lg: "2xl" }} 
                      fontWeight="bold" 
                      mb={{ base: 1, md: 2 }}
                      lineHeight={1.2}
                    >
                      {step.title}
                    </Text>
                    <Text 
                      fontSize={{ base: "sm", md: "md", lg: "lg" }} 
                      color="whiteAlpha.800"
                      lineHeight={1.5}
                    >
                      {step.description}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>

            {/* Right Side - Images */}
            <VStack 
              spacing={{ base: 8, md: 10, lg: 12 }} 
              align="center"
              w={{ base: "100%", lg: "520px" }}
              maxW={{ base: "100%", lg: "520px" }}
              flex={{ base: "none", lg: "0 0 520px" }}
            >
              {imageSources.map((src,index) => (
              <Box
                key={index}
                w="100%"
                h={{ base: "180px", md: "200px", lg: "280px" }}
                bg="white"
                borderRadius="lg"
                overflow="hidden"
                boxShadow="0 25px 50px rgba(0, 0, 0, 0.4), 0 15px 25px rgba(0, 0, 0, 0.25), 0 8px 15px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)"
                mx="auto"
              >
                <Image 
                  src={src}
                  alt={`Screen ${index + 1}`}
                  w="100%"
                  h="100%"
                  maxW="100%"
                  objectFit="contain"
                  fallbackSrc="https://via.placeholder.com/500x480"
                />
              </Box>
              ))}
            </VStack>
          </Flex>

          {/* Mobile/tablet: stack each step followed by its image */}
          <VStack display={{ base: 'flex', lg: 'none' }} spacing={{ base: 8, md: 10 }} align="stretch">
            {steps.map((step, index) => (
              <Box key={step.number}>
                <Flex minH={{ base: "180px", md: "200px" }} align="center">
                  <Box
                    bg="whiteAlpha.300"
                    borderRadius="md"
                    minW={{ base: "60px", md: "70px" }}
                    minH={{ base: "60px", md: "70px" }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize={{ base: "2xl", md: "3xl" }}
                    fontWeight="bold"
                    mr={{ base: 4, md: 5 }}
                    color="white"
                    flexShrink={0}
                  >
                    {step.number}
                  </Box>
                  <Box flex="1">
                    <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" mb={{ base: 1, md: 2 }} lineHeight={1.2}>
                      {step.title}
                    </Text>
                    <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800" lineHeight={1.5}>
                      {step.description}
                    </Text>
                  </Box>
                </Flex>

                <Box
                  w="100%"
                  h={{ base: "180px", md: "200px" }}
                  bg="white"
                  borderRadius="lg"
                  overflow="hidden"
                  boxShadow="0 25px 50px rgba(0, 0, 0, 0.4), 0 15px 25px rgba(0, 0, 0, 0.25), 0 8px 15px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)"
                  mt={{ base: 3, md: 4 }}
                >
                  <Image
                    src={imageSources[index]}
                    alt={`Screen ${index + 1}`}
                    w="100%"
                    h="100%"
                    maxW="100%"
                    objectFit="contain"
                    fallbackSrc="https://via.placeholder.com/500x480"
                  />
                </Box>
              </Box>
            ))}
          </VStack>
        </VStack>
      </Container>

      {/* Footer Banner */}
      <Box
        bg="gray.100"
        mt={{ base: 12, md: 16, lg: 20 }}
        py={{ base: 3, md: 4, lg: 5 }}
        w="100vw"
        position="relative"
        left="50%"
        right="50%"
        marginLeft="-50vw"
        marginRight="-50vw"
      >
        <Container maxW="1400px" px={{ base: 4, md: 6, lg: 8 }}>          
          <HStack
            spacing={{ base: 4, md: 6, lg: 8 }}
            justify="center"
            align="center"
            flexWrap={{ base: "wrap", md: "nowrap" }}
            gap={{ base: 2, md: 4, lg: 6 }}
          >
            <Text
              fontSize={{ base: "xs", md: "sm", lg: "md" }}
              fontWeight="bold"
              color="green.800"
              textAlign="center"
              flex="1"
              minW={{ base: "100%", md: "auto" }}
              whiteSpace={{ base: "normal", md: "nowrap" }}
            >
              OVER 1,000 DEALS ANALYZED
            </Text>
            <Text
              fontSize={{ base: "xs", md: "sm", lg: "md" }}
              fontWeight="bold"
              color="green.800"
              textAlign="center"
              flex="2"
              whiteSpace={{ base: "normal", md: "nowrap" }}
              flexShrink={0}
            >
              BUILT BY A TEAM BEHIND $5B+ IN HOME ACQUISITIONS
            </Text>
            <Text
              fontSize={{ base: "xs", md: "sm", lg: "md" }}
              fontWeight="bold"
              color="green.800"
              textAlign="center"
              flex="1"
              minW={{ base: "100%", md: "auto" }}
              whiteSpace={{ base: "normal", md: "nowrap" }}
            >
              WALL STREET GRADE TOOLS
            </Text>
          </HStack>
        </Container>
      </Box>
    </Box>
  );
};

export default ClearPathSection;
