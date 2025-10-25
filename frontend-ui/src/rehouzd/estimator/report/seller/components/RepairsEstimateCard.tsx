import React from 'react';
import { Box, Heading, VStack, HStack, Text, Flex, useColorModeValue } from '@chakra-ui/react';

interface Category {
  name: string;
  amount: string; // formatted currency, e.g. "$1,234"
  color: string; // now trusted from parent, always green scale
}

interface RepairsEstimateCardProps {
  total: string; // formatted total, e.g. "$12,345"
  categories: Category[];
  size?: number;
}

export default function RepairsEstimateCard({ total, categories, size = 120 }: RepairsEstimateCardProps) {
  const donutRadius = 44;
  const stroke = 14;
  const C = 2 * Math.PI * donutRadius;
  const headingColor = useColorModeValue("gray.700", "gray.200");

  const items = (categories || []).map((c) => ({
    label: c.name,
    value: Number(String(c.amount).replace(/[^0-9.-]+/g, '')) || 0,
    color: c.color,
    amount: c.amount,
  }));

  const totalValue = items.reduce((s, it) => s + it.value, 0) || 1;

  let acc = 0;
  const segments = items.map((it) => {
    const ratio = it.value / totalValue;
    const dash = Math.max(0, ratio * C);
    const dashArray = `${dash} ${Math.max(0, C - dash)}`;
    const seg = { ...it, dashArray, offset: -acc };
    acc += dash;
    return seg;
  });

  return (
    <Box border="1px solid" borderColor="gray.200" borderRadius="lg" p={5} bg="white">
      
      <Text fontSize="14px" fontWeight={600} color={headingColor} mb={3}>
        Repairs (est.)
      </Text>      

      <Flex direction={{ base: 'column', md: 'row' }} align="flex-start" gap={4} data-print-row="true">
        {/* Left column: Donut + Total */}
        <VStack spacing={3} align="center" flexShrink={0}>
          <Box>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Repairs donut, total ${total}`}>
              <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
                <circle r={donutRadius} cx={0} cy={0} fill="transparent" stroke="#EDF2F7" strokeWidth={stroke} />

                {segments.map((s, i) => (
                  <circle
                    key={i}
                    r={donutRadius}
                    cx={0}
                    cy={0}
                    fill="transparent"
                    stroke={s.color}
                    strokeWidth={stroke}
                    strokeDasharray={s.dashArray}
                    strokeDashoffset={s.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </g>

              <g>
                <circle cx={size / 2} cy={size / 2} r={donutRadius - stroke / 2} fill="white" />
                <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize={10} fill="#111827">
                  Repairs
                </text>
                <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontSize={12} fontWeight={600} fill="#111827">
                  {total}
                </text>
              </g>
            </svg>
          </Box>

          {/* Total positioned under the donut, left-aligned on md+ */}
          <Box width="100%" textAlign={{ base: 'center', md: 'left' }}>
            <HStack spacing={2}>
              <Text fontSize="12px" color="gray.600">Total</Text>
              <Text fontSize="12px" fontWeight="semibold">{total}</Text>
            </HStack>
          </Box>
        </VStack>

        {/* Right column: Legend only */}
        <VStack align="stretch" spacing={2} flex={1}>
          {items.length === 0 ? (
            <Text fontSize="sm" color="gray.500" textAlign={{ base: 'center', md: 'left' }}>
              No repair categories specified
            </Text>
          ) : (
            items.map((it, i) => (
              <HStack key={i} justify="space-between" fontSize="sm">
                <HStack spacing={3} align="center">
                  <Box w="10px" h="10px" borderRadius="full" bg={it.color} />
                  <Text color="gray.700">{it.label}</Text>
                </HStack>
                <Text fontWeight="semibold" color="gray.700">{it.amount}</Text>
              </HStack>
            ))
          )}
        </VStack>
      </Flex>
    </Box>
  );
}