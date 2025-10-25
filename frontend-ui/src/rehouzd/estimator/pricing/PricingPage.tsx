import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Button,
  VStack,
  HStack,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.user);

  // Pricing plans data
  const plans: PricingPlan[] = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      description: "Perfect for beginners exploring the platform",
      features: [
        "7 properties to be serviced",
        "Instant investor offer estimates",
        "Rental and sold comps",
        "Underwriting tool with editable inputs",
        "Buyer ranking system",
        "Buyer details (name, address, purchase history)"
      ],
      buttonText: "Start Free"
    },
    {
      id: "professional",
      name: "Professional",
      price: "$XX.xx",
      description: "For active real estate professionals",
      features: [
        "xx estimates per month",
        "Instant investor offer estimates",
        "Comprehensive rental and sold comps",
        "Advanced underwriting tool with editable inputs",
        "Priority buyer ranking system",
        "Detailed buyer information and analytics",
        "xx custom underwrites per month from a Rehouzd analyst"
      ],
      buttonText: "Get Started",
      isPopular: true
    }
  ];

  const handlePlanSelect = (plan: PricingPlan) => {
    if (plan.id === "free") {
      if (!user.isLoggedIn) {
        // Navigate to home page with plan parameter to trigger auth modal
        navigate(`/?plan=${plan.id}`);
      }
      // If user is already logged in, button is disabled so this won't be called
    } else if (plan.id === "professional") {
      // Professional plan is disabled, so this won't be called
    }
  };

  return (
    <Box py={16} pt="100px" bg="gray.50">
      <Container maxW="container.xl">
        <VStack spacing={8} textAlign="center" mb={12}>
          <Heading
            as="h1"
            fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
            fontWeight="bold"
            fontFamily="heading"
            color="gray.800"
          >
            Start Free. Scale When You're Ready
          </Heading>
        </VStack>

        <Box
          borderWidth="2px"
          borderRadius="xl"
          overflow="hidden"
          maxW="container.lg"
          mx="auto"
          bg="white"
        >
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            justify="center"
            align="stretch"
            p={6}
            gap={8}
          >
            {plans.map((plan) => (
              <Box 
                key={plan.id}
                bg={plan.id === "professional" ? "gray.50" : "white"}
                p={8}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={plan.id === "professional" ? "gray.300" : "gray.200"}
                flex="1"
                position="relative"
                maxW={{ base: "full", md: "50%" }}
                opacity={plan.id === "professional" ? 0.85 : 1}
              >

                {plan.isPopular && (
                  <Badge
                    position="absolute"
                    top="-1px"
                    right="20px"
                    colorScheme="green"
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="md"
                    fontWeight="medium"
                    opacity={plan.id === "professional" ? 0.7 : 1}
                  >
                    Most Popular
                  </Badge>
                )}
                <VStack align="flex-start" spacing={4} position="relative" zIndex={2}>
                  <Text 
                    fontSize="xl" 
                    fontWeight="bold" 
                    color={plan.id === "professional" ? "gray.600" : "gray.800"} 
                    fontFamily="heading"
                  >
                    {plan.name}
                  </Text>
                  <HStack align="baseline">
                    <Text 
                      fontSize="4xl" 
                      fontWeight="bold" 
                      color={plan.id === "professional" ? "gray.600" : "gray.800"} 
                      fontFamily="heading"
                    >
                      {plan.price}
                    </Text>
                    <Text color="gray.500" fontFamily="body">/month</Text>
                  </HStack>
                  <Text 
                    color={plan.id === "professional" ? "gray.600" : "gray.600"} 
                    fontFamily="body"
                  >
                    {plan.description}
                  </Text>

                  <Button
                    mt={4}
                    w="full"
                    py={6}
                    bg={plan.id === "professional" ? "gray.100" : "green.800"}
                    color={plan.id === "professional" ? "gray.600" : "white"}
                    borderColor={plan.id === "professional" ? "gray.300" : "green.800"}
                    borderWidth="1px"
                    _hover={plan.id === "professional" ? {} : {
                      bg: "brand.500",
                      borderColor: "brand.500",
                      transform: "translateY(-2px)",
                      boxShadow: "lg"
                    }}
                    _active={plan.id === "professional" ? {} : {
                      bg: "brand.600"
                    }}
                    onClick={() => handlePlanSelect(plan)}
                    fontFamily="body"
                    isDisabled={plan.id === "professional" || (plan.id === "free" && user.isLoggedIn)}
                    cursor={plan.id === "professional" || (plan.id === "free" && user.isLoggedIn) ? "not-allowed" : "pointer"}
                  >
                    {plan.id === "professional" 
                      ? "Coming Soon" 
                      : plan.id === "free" 
                        ? (user.isLoggedIn ? "Already Signed Up" : "Login") 
                        : plan.buttonText
                    }
                  </Button>

                  <VStack spacing={4} align="flex-start" w="full" mt={4}>
                    {plan.features.map((feature, index) => (
                      <HStack key={index} align="flex-start">
                        <Icon 
                          as={FiCheck as React.ElementType} 
                          mt={1} 
                          color={plan.id === "professional" ? "gray.500" : "#104911"} 
                          boxSize={4} 
                        />
                        <Text 
                          color={plan.id === "professional" ? "gray.600" : "gray.700"} 
                          fontFamily="body" 
                          fontSize="sm"
                        >
                          {feature}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </Box>
            ))}
          </Flex>
        </Box>
      </Container>
    </Box>
  );
};

export default PricingPage; 