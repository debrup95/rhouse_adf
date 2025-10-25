import React from "react";
import {
  Box,
  Grid,
  HStack,
  VStack,
  Text,
  Badge,
  ChakraProvider,
  extendTheme,
  useColorModeValue,
} from "@chakra-ui/react";

// Small helper utilities
const toNum = (x: any) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: any) => {
  const v = toNum(n);
  return v.toLocaleString();
};

export type Row = [string, string | number, boolean?];

export interface CashPath {
  offer: number | string;
}
export interface Retail {
  net: number | string;
  sale?: number;
  rehab?: number;
  holding?: number;
  commission?: number;
  close?: number;
}

export interface TwoCardsInlineProps {
  cashPath: CashPath;
  retail: Retail;
}

/**
 * TwoCardsInline — Chakra-only implementation (no NetMini component required).
 * Use this file if you prefer to keep the card markup inline without importing extra components.
 */
const TakeHomeCard: React.FC<TwoCardsInlineProps> = ({ cashPath, retail }) => {
  const accent = useColorModeValue("green.600", "green.300");
  const headingColor = useColorModeValue("gray.700", "gray.200");
  
  return (
    <Box px={0} pt={4} pb={2}>
      <Box rounded="2xl" borderWidth="1px" borderColor="gray.200" p={5} bg="white">
        <Text mb={3} fontSize="sm" color="gray.700">
          What you take home (est.)
        </Text>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} data-print-two-col="true">
          {/* Card 1: Cash Now */}
          <Box borderRadius="16px" borderWidth="1px" borderColor="gray.200" p={4} bg="white">
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Text fontSize="14px" fontWeight={600} color={headingColor}>
                Cash Now
              </Text>
              <Badge fontSize="11px" colorScheme="gray" variant="subtle">
                Fastest
              </Badge>
            </HStack>

            <Text mt={2} fontSize="2xl" fontWeight={700} color={accent}>
              ${fmt(cashPath.offer)}
            </Text>

            <VStack mt={3} spacing={2} alignItems="stretch">
              {(
                [
                  ["Sale", cashPath.offer, true],
                  ["Repairs", 0],
                  ["Finance/Holding", 0],
                  ["Sale Costs", 0],
                  ["Time at risk", "21 days"],
                  ["Chance of hitting return", "99%"],
                ] as Row[]
              ).map(([label, val, positive], i) => {
                const isString = typeof val === "string";
                const display = isString
                  ? val
                  : `${toNum(val) < 0 ? "-" : ""}$${fmt(Math.abs(toNum(val)))}`;
                const emphasis = Boolean(positive);
                return (
                  <HStack key={i} justifyContent="space-between">
                    <Text fontSize="13px" color="gray.600">
                      {label}
                    </Text>
                    <Text fontSize="13px" fontWeight={emphasis ? 600 : 500} color={emphasis ? "gray.900" : "gray.700"}>
                      {display}
                    </Text>
                  </HStack>
                );
              })}
            </VStack>
          </Box>

          {/* Card 2: Retail After Rehab */}
          <Box borderRadius="16px" borderWidth="1px" borderColor="gray.200" p={4} bg="white">
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Text fontSize="14px" fontWeight={600} color={headingColor}>
                Retail After Rehab
              </Text>
              <Badge fontSize="11px" colorScheme="gray" variant="subtle">
                More work
              </Badge>
            </HStack>

            <Text mt={2} fontSize="2xl" fontWeight={700} color={accent}>
              ${fmt(retail.net)}
            </Text>

            <VStack mt={3} spacing={2} alignItems="stretch">
              {(
                [
                  ["Sale (ARV)", retail.sale ?? 0, true],
                  ["Repairs", -(retail.rehab ?? 0)],
                  ["Finance/Holding", -(retail.holding ?? 0)],
                  ["Sale Costs", -((retail.commission ?? 0) + (retail.close ?? 0))],
                  ["Time at risk", "180 days"],
                  ["Chance to hit ARV", "65%"],
                ] as Row[]
              ).map(([label, val, positive], i) => {
                const isString = typeof val === "string";
                const display = isString
                  ? val
                  : `${toNum(val) < 0 ? "-" : ""}$${fmt(Math.abs(toNum(val)))}`;
                const emphasis = Boolean(positive);
                return (
                  <HStack key={i} justifyContent="space-between">
                    <Text fontSize="13px" color="gray.600">
                      {label}
                    </Text>
                    <Text fontSize="13px" fontWeight={emphasis ? 600 : 500} color={emphasis ? "gray.900" : "gray.700"}>
                      {display}
                    </Text>
                  </HStack>
                );
              })}
            </VStack>
          </Box>
        </Grid>

        <Text mt={3} fontSize="11px" color="gray.500">
          Estimates only. Final numbers depend on inspection, title, and market conditions. Finance/Holding Costs assumes no mortgage payment.
        </Text>
      </Box>
    </Box>
  );
};

export default TakeHomeCard;