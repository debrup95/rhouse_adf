import React from 'react';
import { Box, SimpleGrid, Tag, TagLabel } from '@chakra-ui/react';
import { CalendarIcon, CheckCircleIcon, NotAllowedIcon, ViewIcon, WarningIcon, TimeIcon } from '@chakra-ui/icons';

interface FeaturesCardProps {
  features: string[];
}

const FeaturesCard: React.FC<FeaturesCardProps> = ({ features }) => {
  const getFeatureIcon = (label: string): React.ReactElement => {
    const l = (label || "").toLowerCase();
    if (l.includes("showings")) return <ViewIcon boxSize="14px" />;
    if (l.includes("repairs")) return <WarningIcon boxSize="14px" />;
    if (l.includes("flexible")) return <CalendarIcon boxSize="14px" />;
    if (l.includes("cash")) return <CheckCircleIcon boxSize="14px" />;
    return <CheckCircleIcon boxSize="14px" />; // Default icon
  };

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      padding={6}
      display="flex"
      flexDirection="column"
      background="white"
    >
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
            display="inline-flex"
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

export default FeaturesCard;
