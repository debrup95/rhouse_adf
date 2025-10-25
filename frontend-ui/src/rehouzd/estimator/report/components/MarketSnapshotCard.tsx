import React from 'react';
import { Box, Heading, VStack, HStack, Text, Icon, SimpleGrid } from '@chakra-ui/react';
import { FaChartBar } from 'react-icons/fa';

interface ChartData {
  month: string;
  height: string;
  count: number;
}

interface MarketSnapshotCardProps {
  zipCode: string;
  chartData: ChartData[];
  loading?: boolean;
  error?: string | null;
  marketStats?: {
    totalInvestorPurchases: number;
    averagePrice: number;
    medianPrice: number;
    activeInvestors: number;
  } | null;
}

const MarketSnapshotCard: React.FC<MarketSnapshotCardProps> = ({ 
  zipCode, 
  chartData, 
  loading = false, 
  error = null, 
  marketStats = null 
}) => {
  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      padding={6}
      display="flex"
      flexDirection="column"
    >
      <Heading
        size="md"
        margin="0 0 4 0"
        fontSize="xl"
        fontFamily="Poppins"
        color="brand.500"
        display="flex"
        alignItems="center"
        paddingBottom={4}
      >
        <Icon as={FaChartBar as React.ElementType} marginRight={2} />
        Market Snapshot: {zipCode}
      </Heading>
      
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="120px"
          color="gray.500"
        >
          <Text>Loading market data...</Text>
        </Box>
      ) : error ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="120px"
          color="red.500"
          textAlign="center"
          padding={4}
        >
          <Text fontSize="sm">Error loading market data. Using fallback data.</Text>
        </Box>
      ) : (
        <Box
          className="market-snapshot-bars"
          flexGrow={1}
          display="flex"
          justifyContent="space-around"
          alignItems="flex-end"
          height="120px"
          marginBottom={0}
          padding="4 0"
        >
          {chartData.map((barData, index) => (
            <Box
              key={index}
              display="flex"
              flexDirection="column"
              justifyContent="flex-end"
              alignItems="center"
              width="30%"
              height="100%"
            >
              <Text
                fontSize="sm"
                fontWeight={700}
                fontFamily="Poppins"
                color="gray.800"
                marginBottom={1}
              >
                {barData.count}
              </Text>
              <Box
                width="35px"
                backgroundColor="brand.500"
                borderRadius="4px 4px 0 0"
                style={{ height: barData.height }}
              />
              <Text
                fontSize="xs"
                color="gray.600"
                marginTop={1.5}
              >
                {barData.month}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      
      <Text
        textAlign="center"
        fontSize="sm"
        fontWeight={500}
        color="gray.800"
        marginTop={2}
        marginBottom={0}
      >
        Active Investor Purchases
      </Text>
    </Box>
  );
};

export default MarketSnapshotCard;
