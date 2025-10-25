import React from 'react';
import {
  Box,
  Container,
  Heading,
  Button,
  Stack,
  Divider,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

interface PriceAndSellSectionProps {
  isLoggedIn: boolean;
  onAuthOpen: (plan?: string) => void;
}

const PriceAndSellSection: React.FC<PriceAndSellSectionProps> = ({ isLoggedIn, onAuthOpen }) => {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (!isLoggedIn) {
      onAuthOpen();
    } else {
      navigate("/estimate");
    }
  };

  return (
    <Box color="white" py={{ base: 8, md: 12, lg: 16 }}>
      {/* Full-width separator line */}
      <Box 
        borderTop="3px solid rgba(255, 255, 255, 0.3)"
        w="100vw"
        position="relative"
        left="50%"
        right="50%"
        marginLeft="-50vw"
        marginRight="-50vw"
        mb={{ base: 8, md: 12 }}
      />
      
      <Container maxW="1400px" centerContent px={{ base: 4, md: 6, lg: 8 }}>
        <Stack spacing={{ base: 6, md: 8, lg: 10 }} align="center">
          {/* Heading */}
          <Heading
            as="h2"
            fontSize={{ base: 'lg', md: '2xl', lg: '3xl', xl: '4xl' }}
            fontWeight="bold"
            fontFamily="heading"
            textAlign="center"
            px={{ base: 2, md: 0 }}
            lineHeight={1.2}
          >
            Price & Sell A Home Now
          </Heading>
          
          {/* Button */}
          <Button 
            bg="#104911"
            color="white"
            borderRadius="8px"
            size="lg"
            height={{ base: "44px", md: "48px", lg: "56px" }}
            px={{ base: 6, md: 8, lg: 12 }}
            fontSize={{ base: "md", md: "lg", lg: "xl" }}
            fontFamily="body"
            fontWeight="bold"
            onClick={handleButtonClick}
            cursor="pointer"
            boxShadow="0 4px 12px rgba(255, 255, 255, 0.2)"
            border="2px solid rgba(255, 255, 255, 0.8)"
            _hover={{ 
              bg: "rgba(255, 255, 255, 0.1)",
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(255, 255, 255, 0.3)",
              borderColor: "rgba(255, 255, 255, 1)"
            }}
            transition="all 0.2s ease"
          >
            Try It Free
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default PriceAndSellSection; 