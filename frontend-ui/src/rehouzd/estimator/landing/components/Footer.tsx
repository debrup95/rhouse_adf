import React from 'react';
import {
  Box,
  Container,
  Stack,
  SimpleGrid,
  Text,
  Link,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';

export default function Footer() {
  // These hooks return a different value depending on whether
  // the user is in light or dark mode.
  const topBg = useColorModeValue('gray.50', 'gray.800');
  const topColor = useColorModeValue('gray.700', 'gray.100');

  const bottomBg = useColorModeValue('gray.600', 'gray.900');
  const bottomColor = useColorModeValue('white', 'gray.100');

  return (
    <Box bg={topBg} color={topColor}>
      <Container as={Stack} maxW={'6xl'} py={10}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }}>
          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Company
            </Text>
            <Link href={'#'}>About Us</Link>
            <Link href={'#'}>Blog</Link>
            <Link href={'#'}>Careers</Link>
            <Link href={'#'}>Contact Us</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Services
            </Text>
            <Link href={'#'}>Marketplace</Link>
            <Link href={'#'}>Analytics</Link>
            <Link href={'#'}>Underwriting</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Legal
            </Text>
            <Link href={'#'}>Privacy Policy</Link>
            <Link href={'#'}>Terms of Service</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Follow Us
            </Text>
            <Link href={'#'}>LinkedIn</Link>
            <Link href={'#'}>Twitter</Link>
          </Stack>
        </SimpleGrid>
      </Container>

      <Box as="footer" bg={bottomBg} color={bottomColor} py={4}>
        <Flex justify="center">
          <Text fontSize="sm">
            &copy; {new Date().getFullYear()} ReHouzd Inc. All rights reserved.
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}
