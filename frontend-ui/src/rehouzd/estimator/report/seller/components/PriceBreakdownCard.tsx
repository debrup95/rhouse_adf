import React from 'react';
import {
  Box,
  Flex,
  Text,
  Tooltip,
  HStack,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

type Category = {
  key: string;
  value?: number | null;
  details?: string;
  color?: string; // optional override color
};

type PriceBreakdownCardProps = {
  categories?: Category[] | null; // up to 5 categories
  total?: number | null;
};

// Default data (used when incoming values are null/undefined)
const DEFAULT_CATEGORIES: Category[] = [
  { key: "Purchase", value: 50000, details: "", color: "#064e3b" },
  { key: "Repairs", value: 50000, details: "", color: "#0f766e" },
  { key: "Resale", value: 15000, details: "Agent commissions 6% • Title • Taxes", color: "#10b981" },
  { key: "Holding", value: 15000, details: "Purchase title work • Taxes, Insurance, Utilities • Loan costs", color: "#34d399" },
  { key: "Risk and Return", value: 20000, details: "Covers risk, vacancy, profit target", color: "#6ee7b7" },
];

const DEFAULT_TOTAL = 150000;

const safeNumber = (n?: number | null, fallback = 0) => (typeof n === "number" && !Number.isNaN(n) ? n : fallback);

const PriceBreakdownCard: React.FC<PriceBreakdownCardProps> = ({ categories: propCategories, total: propTotal }) => {
  // normalize categories: use supplied or defaults
  const categories = (propCategories && propCategories.length ? propCategories : DEFAULT_CATEGORIES).map((c, i) => ({
    key: c.key ?? DEFAULT_CATEGORIES[i].key,
    value: safeNumber(c.value, DEFAULT_CATEGORIES[i].value!),
    details: c.details ?? DEFAULT_CATEGORIES[i].details,
    color: c.color ?? DEFAULT_CATEGORIES[i].color,
  }));
  const headingColor = useColorModeValue("gray.700", "gray.200");

  const total = propTotal == null ? DEFAULT_TOTAL : propTotal;

  const sum = categories.reduce((s, c) => s + (safeNumber(c.value, 0)), 0);
  // avoid division by zero; if sum is 0 we'll render equal-width segments (fallback)
  const denom = sum === 0 ? categories.length : sum;

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      borderRadius="12px"
      width="100%"
      boxShadow="0 8px 30px rgba(16,24,40,0.08)"
      p={4}>
        {/* Header */}
        <Flex direction="column">
          <Flex align="flex-start">
            <Box>
              <Text fontSize="14px" fontWeight={600} color={headingColor}>
                How we price this home
              </Text>
            </Box>
          </Flex>

          {/* Offer Basis row - total on same line */}
          <Flex justify="space-between" align="center" mt={0.5}>
            <Text fontSize="12px" fontWeight={500} color="#0f172a">
              Offer Basis
            </Text>
            <Text fontSize="18px" fontWeight={700} id="totalValue">
              ${total.toLocaleString()}
            </Text>
          </Flex>

          {/* Stacked bar */}
          <Box mt={3}>
            <Flex height="28px" borderRadius="8px" overflow="hidden" bg="#e6eef2">
              {categories.map((cat) => {
                const value = safeNumber(cat.value, 0);
                const pct = (value / denom) * 100;
                // use flex as percentage string to avoid passing numeric 0 which Chakra may interpret oddly
                const flexValue = `${pct}%`;
                return (
                  <Tooltip
                    key={cat.key}
                    label={`${cat.key}: $${value.toLocaleString()} (${pct.toFixed(1)}%)`}
                    placement="top"
                  >
                    <Box
                      flex={`0 0 ${flexValue}`}
                      bg={cat.color}
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-start"
                      px={2}
                      color={cat.key === "Risk and Return" ? "black" : "white"}
                      fontWeight={600}
                      fontSize="10px"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                    >
                      {pct > 6 ? cat.key : ""}
                    </Box>
                  </Tooltip>
                );
              })}
            </Flex>

            {/* Price bar (white) - each cell width aligns with stacked bar using same computed percentage flex */}
            

            {/* Legend area */}
            <Box mt={3} borderRadius="10px" p={2} bg="#fafafa" border="1px solid #d1d5db">
              <Flex wrap="wrap" gap={2}>
                {categories.map((cat) => (
                  <HStack key={cat.key} spacing={2} minW={["120px"]}>
                    <Box width="8px" height="8px" borderRadius="50%" bg={cat.color} />
                    <Text fontSize="10px" color="#111827">
                      <Text as="span" fontWeight={700}>
                        {cat.key}
                      </Text>
                      {` $${safeNumber(cat.value, 0).toLocaleString()}`}
                      {cat.details ? ` • ${cat.details}` : ""}
                    </Text>
                  </HStack>
                ))}
              </Flex>
            </Box>
          </Box>
        </Flex>
    </Box>
  );
};

export default PriceBreakdownCard;
