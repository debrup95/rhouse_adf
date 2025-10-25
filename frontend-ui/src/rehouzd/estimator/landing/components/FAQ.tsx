import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData = [
    {
      question: "How is this tool free? What's the catch?",
      answer: "There's no catch. Rehouzd is currently in a free public beta. We're offering full access in exchange for valuable feedback from real estate professionals like you. There are no plans, no credit card required, and no hidden fees."
    },
    {
      question: "Where does your pricing and buyer data come from?",
      answer: "Our platform aggregates data from multiple sources, including public records, MLS data, and proprietary data models. We analyze recent comparable sales and cash transaction histories to provide the most accurate and up-to-date information possible."
    },
    {
      question: "Are the cash buyers on the list actually active?",
      answer: "Yes. Our system identifies buyers based on their recent, verified cash purchase activity in the local market. We prioritize buyers who have closed deals recently to ensure you're connecting with people who are actively investing."
    },
    {
      question: "Is my search history and data private?",
      answer: "Absolutely. Your privacy is paramount. We do not share your individual search history or personal information. The deals you analyze are for your eyes only."
    },
    {
      question: "Who is this platform for?",
      answer: "Rehouzd is designed primarily for residential real estate wholesalers and listing agents who have a property to sell to an investor. If you need to quickly understand a property's investment potential and find a cash buyer, this tool is for you."
    },
    {
      question: "Who are the founders?",
      answer: "Rehouzd is being built by Sean Kirk, who spreadheaded $5 Billion+ in single-family acquisitions at Amherst, and Ragul Shanmugam, the data mastermind who kept Amazon Alexa and the CDC processing 100M+ real-time events a day. Their Wall-Street underwriting know how plus Amazon-grade data engineering now power your free, instant deal pricing and buyer matching software so you can close faster with confidence."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Box id="faq" color="white" pt={4} pb={8}>
      <Container maxW="1400px" centerContent px={{ base: 4, md: 6, lg: 8 }}>
        <Stack spacing={{ base: 6, md: 12 }} align="center">
          {/* Heading Section */}
          <Stack spacing={4} textAlign="center" maxW="container.md">
            <Heading
              as="h2"
              fontSize={{ base: 'xl', md: '2xl', lg: '3xl', xl: '4xl' }}
              fontWeight="bold"
              fontFamily="heading"
              px={{ base: 2, md: 0 }}
            >
              Your Questions, Answered
            </Heading>
          </Stack>
          
          {/* FAQ Questions with Plus Icons */}
          <Box 
            display="flex"
            justifyContent="center"
            w="100%"
          >
            <Stack spacing={2} w="100%" maxW={{ base: "100%", md: "700px", lg: "800px" }}>
              {faqData.map((faq, index) => (
                <Box key={index} w="100%">
                  <Flex
                    justify="space-between"
                    align="center"
                    py={{ base: 3, md: 4 }}
                    px={{ base: 4, md: 6 }}
                    cursor="pointer"
                    _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
                    borderRadius="8px"
                    transition="all 0.2s ease"
                    onClick={() => toggleFAQ(index)}
                    w="100%"
                    minH={{ base: "50px", md: "60px" }}
                  >
                    <Text
                      fontWeight="bold"
                      fontSize={{ base: "md", md: "lg", lg: "xl" }}
                      color="white"
                      fontFamily="heading"
                      flex="1"
                      pr={4}
                      textAlign="left"
                      lineHeight={1.4}
                    >
                      {faq.question}
                    </Text>
                    <Icon
                      as={openIndex === index ? MinusIcon : AddIcon}
                      color="green.300"
                      boxSize={{ base: 4, md: 5 }}
                      transition="transform 0.2s ease"
                      flexShrink={0}
                      ml={4}
                    />
                  </Flex>
                  
                  {/* Answer Section */}
                  {openIndex === index && (
                    <Box
                      bg="rgba(255, 255, 255, 0.05)"
                      borderRadius="0 0 8px 8px"
                      px={{ base: 4, md: 6 }}
                      py={{ base: 3, md: 4 }}
                      mt={-1}
                      borderTop="1px solid rgba(255, 255, 255, 0.1)"
                      w="100%"
                      overflow="hidden"
                    >
                      <Text
                        color="white"
                        fontSize={{ base: "sm", md: "md", lg: "lg" }}
                        lineHeight="1.6"
                        fontFamily="body"
                        sx={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal"
                        }}
                      >
                        {faq.answer}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default FAQ; 