import React from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

interface HeroProps {
  isLoggedIn: boolean;
  onAuthOpen: (plan?: string) => void;
}

const Hero: React.FC<HeroProps> = ({ isLoggedIn, onAuthOpen }) => {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (!isLoggedIn) {
      onAuthOpen();
    } else {
      navigate("/estimate");
    }
  };

  return (
    <Box>
      {/* Main Hero Section */}
      <Box color="white" px={0} w="100%">
        <Flex
          direction={{ base: "column", xl: "row" }}
          gap={{ base: 6, xl: 4 }}
          justifyContent="space-between"
          align="center"
          textAlign={{ base: "center", xl: "left" }}
          py={{ base: 8, md: 16 }}
          pb={{ base: 16, md: 24, lg: 28 }}
          w="100%"
          px={{ base: 4, md: 8, lg: 12 }}
          maxW="1400px"
          mx="auto"
        >
          {/* Left Column - Text and Button */}
          <VStack
            flex={{ base: "none", xl: "1" }}
            spacing={2}
            textAlign="left"
            align="flex-start"
            w="100%"
            pr={{ base: 0, xl: 8 }}
          >
            {/* Beta Tag */}
            <Badge
              variant="outline"
              borderColor="rgba(255, 255, 255, 0.3)" // softer border
              color="rgba(255, 255, 255, 0.6)" // lighter text
              px={4}
              py={1.5} // slightly smaller padding
              borderRadius="full"
              fontSize="x-small"
              fontWeight="normal" // reduce boldness
              bg="transparent"
            >
              100% Free During Beta
            </Badge>

            {/* Main Heading */}
            <VStack spacing={4} align="flex-start">
              <Heading
                as="h1"
                fontSize={{ base: "2xl", md: "3xl", lg: "38px" }}
                fontWeight="bold"
                lineHeight={1.1}
                fontFamily="heading"
                whiteSpace={{ base: "normal", xl: "nowrap" }}
              >
                Maximize Your Assignment Fee
              </Heading>
              <Heading
                as="h2"
                fontSize={{ base: "xl", md: "3xl", lg: "38px" }}
                fontWeight="bold"
                lineHeight={1.1}
                fontFamily="heading"
              >
                Connect with Active Buyers
              </Heading>
            </VStack>
            <VStack spacing={6} align="flex-start" mt={4}>
              <Text
                fontSize={{ base: "md", md: "sm" }}
                color="white"
                opacity={0.85}
                maxW="600px"
                lineHeight={1.6}
              >
                Get firm offers in 48 hours so you can close faster and earn
                more.
              </Text>

              <Button
                bg="white"
                color="#104911"
                borderRadius="8px"
                height={{ base: "40px", md: "44px" }}
                px={{ base: 12, md: 16 }}
                fontSize={{ base: "md", md: "lg" }}
                fontFamily="body"
                fontWeight="bold"
                onClick={handleButtonClick}
                cursor="pointer"
                w={{ base: "100%", md: "auto" }}
                minW="260px"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
                border="2px solid white"
                _hover={{
                  bg: "gray.50",
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                  borderColor: "white",
                }}
                transition="all 0.2s ease"
              >
                Price & Get Offers Now
              </Button>
            </VStack>
          </VStack>

          {/* Right Column - Video */}
          <Box
            flex={{ base: "none", xl: "1" }}
            w="100%"
            display="flex"
            justifyContent={{ base: "center", xl: "flex-end" }}
            alignItems="center"
            pl={{ base: 0, xl: 8 }}
          >
            <Box
              w={{ base: "100%", md: "500px", lg: "600px" }}
              maxW={{ base: "500px", md: "600px", lg: "700px" }}
              borderRadius="12px"
              overflow="hidden"
              boxShadow="0 25px 50px rgba(0, 0, 0, 0.4), 0 15px 25px rgba(0, 0, 0, 0.25), 0 8px 15px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)"
            >
              {/* Loom Video - clean container */}
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                <iframe
                  src="https://www.loom.com/embed/9d2f94c141eb456eb75c5172e7f2df71?sid=dd82baa3-3f81-4829-93f3-a88f350587ff"
                  frameBorder="0"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "12px",
                  }}
                  title="How It Works Video"
                />
              </div>
            </Box>
          </Box>
        </Flex>
      </Box>

      {/* Bottom Banner Section */}
      <Box
        bg="gray.100"
        py={4}
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
              SPENDING HOURS RUNNING COMPS?
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
              NO SOLID BUYERS
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
              UNSURE WHAT INVESTORS WILL PAY?
            </Text>
          </HStack>
        </Container>
      </Box>
    </Box>
  );
};

export default Hero;
