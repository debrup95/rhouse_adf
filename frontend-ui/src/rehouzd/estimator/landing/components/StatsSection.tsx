import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';

interface StatsCardProps {
  title: string;
  stat: string;
}

function StatsCard(props: StatsCardProps) {
  const { title, stat } = props;
  return (
    <Stat
      px={{ base: 4, md: 8 }}
      py={'5'}
      shadow={'xl'}
      border={'1px solid'}
      borderColor="gray.200"
      rounded={'lg'}>
      <StatLabel fontWeight={'medium'} isTruncated>
        {title}
      </StatLabel>
      <StatNumber fontSize={'2xl'} fontWeight={'medium'}>
        {stat}
      </StatNumber>
    </Stat>
  );
}

export default function StatsSection() {
  return (
    <Box maxW="7xl" mx={'auto'} pt={5} px={{ base: 2, sm: 12, md: 17 }}>
      <Heading textAlign={'center'} mb={10}>
        Our company is growing, so is our impact
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 5, lg: 8 }}>
        <StatsCard title={'Properties Listed'} stat={'5,000+'} />
        <StatsCard title={'Active Investors'} stat={'1,000+'} />
        <StatsCard title={'Success Rate'} stat={'95%'} />
      </SimpleGrid>
    </Box>
  );
} 