import {
  Container,
  SimpleGrid,
  Image,
  Flex,
  Heading,
  Text,
  Stack,
  Divider,
} from '@chakra-ui/react';

export default function AboutFounder() {
  return (
    <Container maxW={'5xl'} py={12}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
        <Stack spacing={4}>
          <Text
            textTransform={'uppercase'}
            color={'blue.400'}
            fontWeight={600}
            fontSize={'sm'}
            bg={'blue.50'}
            p={2}
            alignSelf={'flex-start'}
            rounded={'md'}>
            Our Story
          </Text>
          <Heading>A Real Estate Investment Expert</Heading>
          <Text fontSize={'lg'}>
            With over a decade of experience in real estate investment, our founder
            has helped countless investors make informed decisions and achieve their
            investment goals.
          </Text>
          <Stack
            spacing={4}
            divider={<Divider />}>
          </Stack>
        </Stack>
        <Flex>
          <Image
            rounded={'md'}
            alt={'feature image'}
            src={'https://images.unsplash.com/photo-1507679799987-c73779587ccf'}
            objectFit={'cover'}
          />
        </Flex>
      </SimpleGrid>
    </Container>
  );
} 