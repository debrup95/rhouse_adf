import React from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Flex,
  Badge,
  useToken,
  useColorModeValue,
} from "@chakra-ui/react";

type SpeedCardProps = {
  cashClose: string; // e.g., "21d"
  listAndWait: string; // e.g., "180d"
  holdingCostPerMonth?: number; // Dynamic holding cost per month
  accent?: string;
};

const SpeedBars: React.FC<{
  items: { label: string; days: number }[];
  accent?: string;
  max: number;
}> = ({ items, accent = "blue.400", max }) => {
  const [accentColor] = useToken("colors", [accent as any]) as any[];

  return (
    <VStack spacing={3} align="stretch">
      {items.map((it, idx) => {
        const pct = Math.round((it.days / Math.max(max, 1)) * 100);
        return (
          <HStack key={idx} spacing={3} align="center">
            <Text fontSize="sm" minW="110px" color="gray.700">
              {it.label}
            </Text>

            <Flex flex={1} align="center">
              <Box
                flex={1}
                height="10px"
                bg="gray.100"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  height="100%"
                  width={`${pct}%`}
                  bg={accent}
                  style={{ backgroundColor: accentColor || accent }}
                />
              </Box>

              <Badge ml={3} fontSize="xs" colorScheme="gray">
                {it.days}d
              </Badge>
            </Flex>
          </HStack>
        );
      })}
    </VStack>
  );
};

const SpeedCard: React.FC<SpeedCardProps> = ({ 
  cashClose, 
  listAndWait, 
  holdingCostPerMonth = 400, 
  accent = "blue.400" 
}) => {
  // Convert string like "21d" → number 21
  const cashCloseDays = parseInt(cashClose.replace(/\D/g, ""), 10);
  const listAndWaitDays = parseInt(listAndWait.replace(/\D/g, ""), 10);
  const headingColor = useColorModeValue("gray.700", "gray.200");

  const speedData = [
    { label: "Cash Close", days: cashCloseDays },
    { label: "List & Wait", days: listAndWaitDays },
  ];

  const computedMax = Math.max(...speedData.map((d) => d.days), 1);

  // Format the holding cost as currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Box rounded="2xl" borderWidth={1} borderColor="gray.200" p={3} bg="white">
      <Text fontSize="14px" fontWeight={600} color={headingColor} mb={3}>
        Speed
      </Text>

      <SpeedBars items={speedData} accent={accent} max={computedMax} />

      <Text mt={4} fontSize="11px" color="gray.500">
        Every 30 days typically burns {formatCurrency(holdingCostPerMonth)} in holding costs and market risk
      </Text>
    </Box>
  );
};

export default SpeedCard;
export type { SpeedCardProps };