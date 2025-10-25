import React from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  Icon,
  Flex,
} from '@chakra-ui/react';
import { MdOutlineLocationOn } from 'react-icons/md';
import { FaHome, FaChartLine } from 'react-icons/fa';

export default function CallToAction() {
  // Using theme colors directly
  const bgColor = 'background.secondary';
  const textColor = 'text.primary';
  const subtitleColor = 'text.secondary';
  const iconBgColor = 'brand.50';
  const iconColor = 'brand.500';

  return (
    <Box bg={bgColor} py={12}>
      <Container maxW="7xl">
        <Stack
          spacing={6}
          direction={{ base: 'column', md: 'row' }}
          align={'center'}
          justify={'space-between'}
        >
          <Stack flex={1} spacing={4}>
            <Heading
              lineHeight={1.1}
              fontWeight={700}
              fontSize={{ base: '3xl', sm: '4xl', lg: '5xl' }}
              color={textColor}
            >
              Find your next{' '}
              <Text as={'span'} color={'brand.500'}>
                investment property
              </Text>
            </Heading>
            <Text fontSize={{ base: 'md', lg: 'lg' }} color={subtitleColor}>
              Use our estimator tool to analyze property values, rental income,
              and returns on investment to make data-driven decisions.
            </Text>
            <Stack
              spacing={{ base: 4, sm: 6 }}
              direction={{ base: 'column', sm: 'row' }}
            >
              <Button
                rounded={'md'}
                size={'lg'}
                colorScheme={'brand'}
                px={6}
              >
                Get Started
              </Button>
              <Button
                rounded={'md'}
                size={'lg'}
                px={6}
                variant='outline'
                colorScheme={'brand'}
              >
                Learn More
              </Button>
            </Stack>
          </Stack>
          <Flex
            flex={1}
            justify={'center'}
            align={'center'}
            position={'relative'}
            w={'full'}
          >
            <Stack
              direction={{ base: 'column', sm: 'row' }}
              spacing={{ base: 4, md: 8 }}
              align={'center'}
              justify={'center'}
              w={'full'}
            >
              <Stack align={'center'} spacing={3}>
                <Flex
                  w={16}
                  h={16}
                  align={'center'}
                  justify={'center'}
                  color={iconColor}
                  bg={iconBgColor}
                  rounded={'full'}
                >
                  <Icon as={MdOutlineLocationOn as React.ElementType} w={8} h={8} />
                </Flex>
                <Text fontWeight={600} color={textColor}>
                  Location Analysis
                </Text>
              </Stack>
              <Stack align={'center'} spacing={3}>
                <Flex
                  w={16}
                  h={16}
                  align={'center'}
                  justify={'center'}
                  color={iconColor}
                  bg={iconBgColor}
                  rounded={'full'}
                >
                  <Icon as={FaHome as React.ElementType} w={8} h={8} />
                </Flex>
                <Text fontWeight={600} color={textColor}>
                  Property Valuation
                </Text>
              </Stack>
              <Stack align={'center'} spacing={3}>
                <Flex
                  w={16}
                  h={16}
                  align={'center'}
                  justify={'center'}
                  color={iconColor}
                  bg={iconBgColor}
                  rounded={'full'}
                >
                  <Icon as={FaChartLine as React.ElementType} w={8} h={8} />
                </Flex>
                <Text fontWeight={600} color={textColor}>
                  ROI Projection
                </Text>
              </Stack>
            </Stack>
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
} 