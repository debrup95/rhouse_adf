import React from "react";
import {
  Box,
  Grid,
  Text,
  VStack,
  Divider,
  Link,
  useColorModeValue,
} from "@chakra-ui/react";

interface CompItem {
  address: string;
  price?: string | number | null;
  date?: string | null;
  specs?: string | null; // e.g. "3 · 1 · 1,480"
}

interface InvestorCompsCardProps {
  comps?: CompItem[]; // any length; we'll show max 4 and pad if fewer
  title?: string;
}

const formatPrice = (p?: string | number | null) => {
  if (p === null || p === undefined || p === "") return "-";
  const raw = typeof p === "number" ? p : String(p).replace(/[^0-9.-]+/g, "");
  const n = Number(raw);
  if (Number.isFinite(n)) return `$${n.toLocaleString("en-US")}`;
  return String(p);
};

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date; // Return original if invalid date
    
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear().toString().slice(-2); // Get last 2 digits of year
    
    return `${month}/${day}/${year}`;
  } catch {
    return date; // Return original if parsing fails
  }
};

const parseSpecs = (specs?: string | null) => {
  if (!specs) return { beds: "-", baths: "-", sqft: "-" };
  
  const parts = specs.split("·").map(s => s.trim());
  return {
    beds: parts[0] || "-",
    baths: parts[1] || "-", 
    sqft: parts[2] || "-"
  };
};

const InvestorCompsCard: React.FC<InvestorCompsCardProps> = ({
  comps = [],
  title = "Nearby investor buys",
}) => {
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("rgba(16, 24, 40, 0.06)", "rgba(255,255,255,0.04)"); // very subtle
  const headingColor = useColorModeValue("gray.700", "gray.200");
  const muted = useColorModeValue("gray.600", "gray.400");
  const body = useColorModeValue("gray.800", "gray.100");

  // limit to 4 rows, no padding - only show actual data
  let visible = Array.isArray(comps) ? comps.slice(0, 4) : [];
  
  // Sort by price in ascending order for better visual presentation
  visible = visible.sort((a, b) => {
    const getPriceValue = (price: string | number | null | undefined): number => {
      if (price === null || price === undefined) return 0;
      if (typeof price === 'number') return price;
      return parseFloat(String(price).replace(/[^0-9.-]+/g, '') || '0');
    };
    
    const priceA = getPriceValue(a.price);
    const priceB = getPriceValue(b.price);
    return priceA - priceB;
  });
  
  const hasData = visible.length > 0;

  return (
    <Box
      bg={bg}
      border="1px solid" borderColor="gray.200"
      borderRadius="lg"
      p={5}>
      <Text fontSize="14px" fontWeight={600} color={headingColor} mb={3}>
        {title}
      </Text>

      {hasData ? (
        <>
          {/* header with thin bottom separator */}
          <Grid
            templateColumns="4fr 2fr 1fr 1fr 1fr 1fr"
            gap={2}
            alignItems="center"
            alignContent="center"
            fontSize="12px"
            color={muted}
            pb={2}
            borderBottom={`1px solid ${borderColor}`}
            mb={2}
          >
            <Box>Address</Box>
            <Box>Price</Box>
            <Box textAlign="center">Date</Box>
            <Box textAlign="center">Beds</Box>
            <Box textAlign="center">Baths</Box>
            <Box textAlign="center">Sqft</Box>
          </Grid>

          <VStack spacing={0} align="stretch">
            {visible.map((r, i) => {
              const specs = parseSpecs(r.specs);
              return (
                <Box key={i}>
                  <Grid
                    templateColumns="4fr 2fr 1fr 1fr 1fr 1fr"
                    gap={2}
                    alignItems="center"
                    alignContent="center"
                    py={3}
                    minH="44px"             // consistent row height
                  >
                    {/* Address: single-line, ellipsis if long, clickable */}
                    <Box
                      color={body}
                      fontSize="12px"
                      lineHeight="1.15"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                    >
                      {r.address ? (
                        <Link
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${r.address} Zillow Redfin realtor.com homes.com`).replace(/%20/g, '+')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="inherit"
                          textDecoration="underline"
                          _hover={{ textDecoration: "underline" }}
                        >
                          {r.address?.split(',')[0] || r.address}
                        </Link>
                      ) : (
                        ""
                      )}
                    </Box>

                    {/* Price: bold, no wrap */}
                    <Box
                      color={body}
                      fontSize="12px"
                      whiteSpace="nowrap"
                      display="flex"
                      alignItems="center"
                    >
                      {r.price != null ? formatPrice(r.price) : ""}
                    </Box>

                    {/* Date - centered */}
                    <Box 
                      color={muted} 
                      fontSize="12px" 
                      whiteSpace="nowrap"
                      textAlign="center"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {formatDate(r.date)}
                    </Box>

                    {/* Beds - centered */}
                    <Box
                      textAlign="center"
                      color={muted}
                      fontSize="12px"
                      whiteSpace="nowrap"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {specs.beds}
                    </Box>

                    {/* Baths - centered */}
                    <Box
                      textAlign="center"
                      color={muted}
                      fontSize="12px"
                      whiteSpace="nowrap"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {specs.baths}
                    </Box>

                    {/* Sqft - centered */}
                    <Box
                      textAlign="center"
                      color={muted}
                      fontSize="12px"
                      whiteSpace="nowrap"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {specs.sqft}
                    </Box>
                  </Grid>

                  {/* thin divider (not after last row) */}
                  {i < visible.length - 1 && <Divider borderColor={borderColor} />}
                </Box>
              );
            })}
          </VStack>
        </>
      ) : (
        /* No data available message */
        <Box
          py={8}
          textAlign="center"
          color={muted}
          fontSize="14px"
        >
          No investor data available
        </Box>
      )}
    </Box>
  );
};

export default InvestorCompsCard;