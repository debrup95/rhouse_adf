// CashOfferCard.tsx
import React from "react";
import {
  Box,
  Text,
  SimpleGrid,
  Tag,
  TagLabel,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckCircleIcon, TimeIcon, NotAllowedIcon } from "@chakra-ui/icons";

interface CashOfferCardProps {
  price: number | string;
  features?: string[];          // e.g., ["21 Days", "As-is", "No Showings"]
  currency?: string;            // default "$"
}

const CashOfferCard: React.FC<CashOfferCardProps> = ({
  price,
  features = [],
  currency = "$",
}) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const subtleText = useColorModeValue("gray.500", "gray.300");

  const formattedPrice =
    typeof price === "number" ? `${currency}${price.toLocaleString()}` : price;

  const getFeatureIcon = (label: string): React.ReactElement => {
    const l = (label || "").toLowerCase();
    if (l.includes("day")) return <TimeIcon boxSize="14px" />;
    if (l.includes("as-is") || l.includes("as is")) return <CheckCircleIcon boxSize="14px" />;
    if (l.includes("showing") || l.includes("no show")) return <NotAllowedIcon boxSize="14px" />;
    return <CheckCircleIcon boxSize="14px" />; // Default icon
  };

  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={border}
      borderRadius="16px"
      p={3}
      w="100%"
      boxShadow="0 6px 18px rgba(7,13,20,0.06)"
    >
      {/* All-Cash Price label */}
      <Text fontSize="12px" color={subtleText} fontWeight={500} mb={1} mt={1}>
        All-Cash Price
      </Text>

      {/* Price */}
      <Text
        fontSize={["28px", "34px"]}
        fontWeight={800}
        color="gray.900"
        lineHeight="1"
        mt={1}
        mb={8}
      >
        {formattedPrice}
      </Text>

      {/* Feature pills - full width layout */}
      <SimpleGrid columns={features.length || 1} spacing={3} width="100%">
        {features.map((f, idx) => (
          <Tag
            key={idx}
            borderRadius="999px"
            px={3}
            py="8px"
            bg="#ecfdf5"
            color="#065f46"
            fontWeight={400}
            fontSize="10px"
            display="flex"
            alignItems="center"
            justifyContent="flex-start"
            gap={2}
            width="100%"
          >
            {getFeatureIcon(f)}
            <TagLabel>{f}</TagLabel>
          </Tag>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default CashOfferCard;
