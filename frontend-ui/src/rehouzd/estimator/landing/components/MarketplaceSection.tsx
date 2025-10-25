import React from 'react';
import {
  Container,
  Stack,
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Image,
} from '@chakra-ui/react';

export default function MarketplaceSection() {
  return (
    <Container maxW={'7xl'}>
      <Stack
        align={'center'}
        // spacing={{ base: 8, md: 10 }}
        py={{ base: 20, md: 28 }}
        direction={{ base: 'column', md: 'row' }}>
        <Stack flex={1}>
          <Heading
            lineHeight={1.1}
            fontWeight={600}
            fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}>
            <Text as={'span'}>
              Revolutionizing
            </Text>
            <br />
            <Text as={'span'} color={'blue.400'}>
              Real Estate Investment
            </Text>
          </Heading>
          <Text>
            Transform your real estate investment journey with our cutting-edge marketplace
            and analytical tools. Make informed decisions backed by data.
          </Text>
          <Stack direction={{ base: 'column', sm: 'row' }}>
            <Button
              rounded={'full'}
              size={'lg'}
              fontWeight={'normal'}
              px={6}
              colorScheme={'blue'}>
              Get started
            </Button>
            <Button
              rounded={'full'}
              size={'lg'}
              fontWeight={'normal'}
              px={6}>
              Learn more
            </Button>
          </Stack>
        </Stack>
        <Flex flex={1} justify={'center'} align={'center'} position={'relative'} w={'full'}>
          <Box position={'relative'} height={'300px'} rounded={'2xl'} width={'full'} overflow={'hidden'}>
            <Image
              alt={'Hero Image'}
              fit={'cover'}
              align={'center'}
              w={'100%'}
              h={'100%'}
              src={'https://images.unsplash.com/photo-1554995207-c18c203602cb'}
            />
          </Box>
        </Flex>
      </Stack>
    </Container>
  );
} 