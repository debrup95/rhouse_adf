import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
} from '@chakra-ui/react';

const HowItWorks = () => {
  return (
    <Box id="how-it-works" color="white" px={{ base: 4, md: 0 }}>
      <Container maxW="container.xl" centerContent>
        <Stack spacing={{ base: 10, md: 20 }} align="center">
          {/* Heading Section */}
          <Stack spacing={4} textAlign="center" maxW="container.md">
            <Heading
              as="h2"
              fontSize={{ base: 'xl', md: '3xl', lg: '4xl' }}
              fontWeight="bold"
              fontFamily="heading"
              px={{ base: 2, md: 0 }}
            >
              How It Works
            </Heading>
            <Text 
              fontFamily="body"
              maxW="container.sm"
              mx="auto"
              fontWeight="bold"
              fontSize={{ base: "sm", md: "md" }}
              px={{ base: 2, md: 0 }}
              lineHeight="1.5"
            >
              Our platform reveals investor purchase price ranges, accelerates underwriting,
              and connects you with the most qualified buyers for your deal
            </Text>
          </Stack>
          
          {/* Video Section */}
          <Box 
            maxW="container.md" 
            w={{ base: "100%", md: "850px" }}
            px={{ base: 2, md: 0 }}
          >
            <div style={{ 
              position: 'relative', 
              paddingBottom: '54%', 
              height: 0,
              width: '100%',
              maxWidth: '100%'
            }}>
              <iframe 
                src="https://www.loom.com/embed/9a30fcf7598a4eef98bb8761c5f4975d?sid=a06c1e0e-7f40-401d-acae-909d7b050521" 
                frameBorder="0" 
                allowFullScreen 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '8px'
                }}
                title="How It Works Video"
              />
            </div>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default HowItWorks; 
