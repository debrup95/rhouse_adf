import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerFooter,
  Flex,
  Heading,
  Text,
  Badge,
  Divider,
  Progress,
  VStack,
  Link,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Icon,
  Button,
  useTheme,
  Spacer,
  Center,
  ButtonGroup,
  HStack,
  useDisclosure,
  Tooltip,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  FaPhone,
  FaMapMarkerAlt,
  FaHistory,
  FaFileContract,
  FaDownload,
  FaEnvelope,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaInfoCircle,
  FaCoins,
  FaLock,
  FaShieldAlt,
} from "react-icons/fa";
import { Buyer } from "../store/buyerSlice";
import {
  calculateBuyerMetrics,
  formatCurrency,
  type EnhancedPurchaseHistory,
} from "../utils/buyerAnalytics";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectSkipTraceCredits, setCredits } from "../store/skipTraceSlice";
import { skipTraceService } from "../services/skipTraceService";
import ContactInfoDrawer from "./ContactInfoDrawer";
import SkipTraceFlowModal from "./SkipTraceFlowModal";
import { isInNetworkBuyer } from "../utils/inNetworkBuyers";
import { useNavigate } from "react-router-dom";

const MotionBox = motion(Box);

interface BuyerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer | null;
  subjectPropertyZipCode?: string;
  onCloseParentDrawer?: () => void; // Optional function to close parent drawer
}

// Backend purchase history item interface
interface PurchaseHistoryItem {
  prop_last_sale_dt?: string;
  prop_last_sale_amt?: number;
  prop_address_line_txt?: string;
  prop_city_nm?: string;
  prop_state_nm?: string;
  prop_zip_cd?: string;
  // Also allow for already formatted data
  address?: string;
  date?: string;
  price?: string;
}

// Define the interface for our formatted display
interface FormattedPurchaseHistory {
  address: string;
  date: string;
  price: string;
}

// Items per page for purchase history
const ITEMS_PER_PAGE = 10;

const BuyerDetailDrawer: React.FC<BuyerDetailDrawerProps> = ({
  isOpen,
  onClose,
  buyer,
  subjectPropertyZipCode = "",
  onCloseParentDrawer,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);

  // Contact Info Drawer state (renamed from Modal)
  const {
    isOpen: isContactDrawerOpen,
    onOpen: onOpenContactDrawer,
    onClose: onCloseContactDrawer,
  } = useDisclosure();

  // Skip Trace Flow Modal state
  const {
    isOpen: isSkipTraceModalOpen,
    onOpen: onOpenSkipTraceModal,
    onClose: onCloseSkipTraceModal,
  } = useDisclosure();

  // Get skip trace credits and user from Redux store
  const skipTraceCredits = useAppSelector(selectSkipTraceCredits);
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  // Navigation hook
  const navigate = useNavigate();

  // Fetch credit balance on component mount
  useEffect(() => {
    if (user?.user_id) {
      const fetchCreditBalance = async () => {
        try {
          const userId = parseInt(user.user_id.toString(), 10);
          const creditBalance = await skipTraceService.getCreditBalance(userId);
          // Update Redux store with fetched credits
          dispatch(
            setCredits({
              free: creditBalance.credits.free,
              paid: creditBalance.credits.paid,
            })
          );
        } catch (error) {
          // Failed to fetch credit balance
        }
      };

      fetchCreditBalance();
    }
  }, [user?.user_id, dispatch]);

  // Handle skip trace completion
  const handleSkipTraceComplete = (results: any) => {
    // Skip trace completed
    // Update the buyer data with skip trace results
    // Results will be stored in Redux and displayed in ContactInfoDrawer
  };

  // Return early pattern after hooks
  // Define a safe empty placeholder if buyer is null
  const emptyBuyer = {
    id: "",
    name: "",
    address: "",
    type: [],
    priceRange: "",
    likelihood: "Possible",
    recentPurchases: 0,
    score: 0,
    matchDetails: {
      geographicScore: 0,
      recencyScore: 0,
      priceScore: 0,
      characteristicsScore: 0,
      activityScore: 0,
    },
  } as Buyer;

  // Always use the buyer data or fallback to empty buyer
  const safeBuyer = buyer || emptyBuyer;

  // Reset pagination when buyer changes
  useEffect(() => {
    setCurrentPage(0);
  }, [buyer?.id]);

  // Debug the buyer data when it changes
  useEffect(() => {
    if (buyer) {
      console.log('[FRONTEND BUYER] Buyer data received:', {
        name: buyer.name,
        score: buyer.score,
        likelihood: buyer.likelihood,
        matchDetails: buyer.matchDetails,
        recentPurchases: buyer.recentPurchases,
        purchaseHistory: buyer.purchase_history?.length || 0
      });
    }
  }, [buyer]);

  // Theme colors
  const bgColor = "background.primary";
  const borderColor = "border.primary";
  const textSecondaryColor = "text.secondary";
  const brandColor = "brand.500";

  // Calculate buyer metrics using the utility function
  const buyerMetrics = useMemo(() => {
    if (!buyer?.purchase_history || !subjectPropertyZipCode) {
      return {
        closedDealsTotal: 0,
        lastBuyDate: null,
        avgZipPrice: null,
        subjectZipPurchases: [],
        allPurchases: [],
      };
    }

    return calculateBuyerMetrics(
      buyer.purchase_history as EnhancedPurchaseHistory[],
      subjectPropertyZipCode
    );
  }, [buyer?.purchase_history, subjectPropertyZipCode]);

  // Calculate progress percentage based on buyer's match score
  // Maximum score is 100
  const getScorePercentage = useMemo(() => {
    // Get actual score or default to 0
    const score = safeBuyer.score || 0;

    // Cap the maximum score at 100 for a 100% fill
    const maxPossibleScore = 100;
    // Convert score to percentage (capped at 100%)
    const percentage = Math.min(Math.round((score / maxPossibleScore) * 100), 100);
    
    console.log(`[FRONTEND SCORE] ${safeBuyer.name}: ${score}/${maxPossibleScore} points (${percentage}%)`);
    
    return percentage;
  }, [safeBuyer.score, safeBuyer.name]);

  // Determine likelihood based on score thresholds
  const getLikelihoodInfo = useMemo(() => {
    const score = safeBuyer.score || 0;

    let likelihood;
    if (score > 80) {
      likelihood = {
        text: "Most likely",
        colorScheme: "green",
        gradient: "linear(to-r, #0a3c34, #b6e78d)",
      };
    } else if (score > 60) {
      likelihood = {
        text: "Likely",
        colorScheme: "green",
        gradient: "linear(to-r, #0a3c34, #b6e78d)",
      };
    } else {
      likelihood = {
        text: "Less likely",
        colorScheme: "yellow",
        gradient: "linear(to-r, #f7941e, #ffe459)",
      };
    }
    
    console.log(`[FRONTEND LIKELIHOOD] ${safeBuyer.name}: Score ${score} → ${likelihood.text}`);
    
    return likelihood;
  }, [safeBuyer.score, safeBuyer.name]);

  // Format price for display
  const formatPrice = (amount: number | string | undefined) => {
    if (amount === undefined) return "N/A";
    if (typeof amount === "string") {
      // If it's already a formatted string, return it
      if (amount.startsWith("$")) return amount;
      // Try to parse it as a number
      amount = parseFloat(amount);
      if (isNaN(amount)) return "N/A";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      // Error formatting date
      return "N/A";
    }
  };

  // Extract purchase history from buyer profile if available - show ALL purchases
  const purchaseHistory: FormattedPurchaseHistory[] = useMemo(() => {
    // Processing purchase history data

    // Use all purchases from buyer metrics instead of filtering
    const allPurchases = buyerMetrics.allPurchases;

    if (allPurchases && allPurchases.length > 0) {
      try {
        const formattedHistory = allPurchases.map(
          (purchase: EnhancedPurchaseHistory) => {
            // Processing purchase item

            // Try to access data using different possible property names
            const address =
              purchase.address ||
              (purchase.prop_address_line_txt
                ? `${purchase.prop_address_line_txt}, ${
                    purchase.prop_city_nm || ""
                  }, ${purchase.prop_state_nm || ""} ${
                    purchase.prop_zip_cd || ""
                  }`
                : "");

            const date =
              purchase.date || formatDate(purchase.prop_last_sale_dt);

            const price =
              purchase.price || formatPrice(purchase.prop_last_sale_amt);

            const formattedItem = {
              address: address.trim(),
              date: date,
              price:
                typeof price === "string"
                  ? price
                  : formatPrice(price as number),
            };

            // Formatted purchase item
            return formattedItem;
          }
        );

        // Final formatted purchase history
        return formattedHistory;
      } catch (error) {
        // Error formatting purchase history
        return [];
      }
    }

    return [];
  }, [buyerMetrics.allPurchases]);

  // Filter out invalid purchase history items
  const validPurchaseHistory = useMemo(() => {
    return purchaseHistory.filter(
      (purchase) => purchase.address && purchase.address.trim() !== ""
    );
  }, [purchaseHistory]);

  // Calculate pagination data
  const totalPages = Math.ceil(validPurchaseHistory.length / ITEMS_PER_PAGE);

  // Get current page items
  const currentPageItems = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return validPurchaseHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [validPurchaseHistory, currentPage]);

  // Handle pagination navigation
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Return early if no buyer and dialog not open
  if (!buyer && !isOpen) {
    return null;
  }

  // Check if purchase history exists and has valid data
  const hasPurchaseHistory = validPurchaseHistory.length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="md"
      autoFocus={false}
    >
      <DrawerOverlay backdropFilter="blur(4px)" bg="blackAlpha.300" />
      <DrawerContent
        bg={bgColor}
        boxShadow="dark-lg"
        maxH="100vh"
        onWheel={(e) => e.stopPropagation()} // Consider keeping if needed for event isolation
      >
        <DrawerCloseButton
          size="lg"
          color="brand.500"
          bg="white"
          borderRadius="full"
          zIndex={10}
          top={4}
          right={4}
          _hover={{ bg: "gray.100" }}
        />
        <DrawerHeader
          borderBottomWidth="1px"
          py={6}
          bg={bgColor}
          pr={16} // Add right padding to prevent overlap with close button
        >
          <VStack align="stretch" spacing={4}>
            {/* Header Row with Name and Credits */}
            <Flex alignItems="center" justify="space-between">
              <VStack align="start" spacing={1} flex="1">
                <HStack align="center" spacing={2}>
                  <Heading
                    fontSize={safeBuyer.name.length > 28 ? "19px" : "2xl"}
                    noOfLines={1}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    flex="1"
                    minW={0}
                    fontWeight="bold"
                  >
                    {safeBuyer.name}
                  </Heading>
                </HStack>
                {/* {buyer && isInNetworkBuyer(buyer.name) && (
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    Investor
                  </Text>
                )} */}
              </VStack>

              {/* Skip Trace Credits Display */}
              <Flex align="center" gap={2} flexShrink={0}>
                <Icon as={FaCoins as React.ElementType} color="brand.500" />
                <Text fontSize="13px" fontWeight="medium" color="brand.500">
                  {skipTraceCredits.free + skipTraceCredits.paid} Credits
                </Text>
              </Flex>
            </Flex>

            {/* Buyer Metrics Badges */}

            {/* Separator */}
            <Divider my={1} borderColor="gray.300" />

            {/* Stats row */}
            <HStack spacing={2} fontSize="md" color="gray.700" mb={2}>
              <Text>
                <strong>{buyerMetrics.closedDealsTotal}</strong> Closed
              </Text>
              <Text>|</Text>
              {buyerMetrics.lastBuyDate && (
                <>
                  <Text>
                    <strong>{buyerMetrics.lastBuyDate}</strong> Last Buy
                  </Text>
                  <Text>|</Text>
                </>
              )}
              {buyerMetrics.avgZipPrice && (
                <Text>
                  <strong>{formatCurrency(buyerMetrics.avgZipPrice)}</strong>{" "}
                  Avg Zip Price
                </Text>
              )}
            </HStack>
          </VStack>
        </DrawerHeader>

        <DrawerBody
          py={6}
          overflowY="auto"
          sx={{
            scrollBehavior: "smooth",
            msOverflowStyle: "auto",
            touchAction: "pan-y",
          }}
        >
          <VStack spacing={8} align="stretch" w="100%">
            {/* Contact Information */}
            <Box w="100%">
              <Flex align="center" gap={3} mb={3}>
                <Heading size="sm">Contact Information</Heading>
                {buyer && isInNetworkBuyer(buyer.name) && (
                  <Badge
                    colorScheme="green"
                    variant="solid"
                    bg="green.600"
                    color="white"
                    fontSize="xx-small"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontWeight="bold"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Icon as={FaShieldAlt as React.ElementType} boxSize={3} />
                    VERIFIED BUYER
                  </Badge>
                )}
              </Flex>
              <VStack spacing={3} align="stretch">
                {buyer && isInNetworkBuyer(buyer.name) ? (
                  <VStack spacing={4} align="stretch">
                    {/* Information Box with Lock Icon */}
                    <Box
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                    >
                      <HStack align="start" spacing={3}>
                        <Icon
                          as={FaLock as React.ElementType}
                          color="gray.600"
                          mt={1}
                        />
                        <VStack align="start" spacing={2} flex="1">
                          <Text color="gray.700" fontWeight="semibold" fontSize="sm">
                            Skip the hassle - Rehouzd fetches competing offers
                            from verified buyers.
                          </Text>
                          <Tooltip
                            label="These investors transact only through Rehouzd so you get faster and firm offers — usually within 48 hrs."
                            placement="top"
                            hasArrow
                            bg="gray.700"
                            color="white"
                            fontSize="sm"
                            px={3}
                            py={2}
                            borderRadius="md"
                          >
                            <Link
                              color="blue.500"
                              fontSize="xs"
                              fontWeight="medium"
                              textDecoration="underline"
                              _hover={{ color: "blue.600" }}
                            >
                              Why can't I view their contact info?
                            </Link>
                          </Tooltip>
                        </VStack>
                      </HStack>
                    </Box>

                    {/* Get Offers Button */}
                    <Button
                      colorScheme="green"
                      bg="green.800"
                      size="sm"
                      onClick={() => {
                        onClose(); // Close the drawer first
                        onCloseParentDrawer?.(); // Close parent drawer if provided
                        navigate("/estimate?step=4"); // Navigate to ExecutiveServicesStep
                      }}
                      w="100%"
                      _hover={{
                        bg: "brand.500",
                        transform: "translateY(-2px)",
                        boxShadow: "lg",
                      }}
                    >
                      Get Offers
                    </Button>
                  </VStack>
                ) : (
                  <Button
                    leftIcon={<Icon as={FaInfoCircle as React.ElementType} />}
                    variant="outline"
                    colorScheme="brand"
                    size="md"
                    onClick={onOpenContactDrawer}
                    justifyContent="flex-start"
                    w="100%"
                  >
                    View Buyer Contact Info
                  </Button>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* Buyer Details */}
            <Box w="100%">
              <Heading size="md" mb={4}>
                Buyer Details
              </Heading>
              <SimpleGrid columns={2} spacing={4}>
                <Stat>
                  <StatLabel color={textSecondaryColor}>Price Range</StatLabel>
                  <StatNumber fontSize="lg">{safeBuyer.priceRange}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color={textSecondaryColor}>Score</StatLabel>
                  <StatNumber fontSize="lg">{getScorePercentage}%</StatNumber>
                </Stat>
              </SimpleGrid>

              <Box mt={6}>
                <Text fontWeight="medium" mb={2}>
                  Purchase Likelihood
                </Text>
                <Flex align="center">
                  <Box flex="1" mr={4} position="relative" h="12px">
                    <Box
                      position="absolute"
                      left="0"
                      right="0"
                      h="9px"
                      bg="gray.200"
                      borderRadius="full"
                    />
                    <Box
                      position="absolute"
                      left="0"
                      width={`${getScorePercentage}%`}
                      h="9px"
                      bgGradient={getLikelihoodInfo.gradient}
                      borderRadius="full"
                      transition="width 0.3s ease-in-out"
                    />
                  </Box>
                  <Text fontWeight="bold">{getLikelihoodInfo.text}</Text>
                </Flex>
              </Box>
            </Box>

            <Divider />

            {/* Recent Activity */}
            <Box w="100%">
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md">Recent Purchases</Heading>

                {totalPages > 1 && (
                  <Text fontSize="sm" color={textSecondaryColor}>
                    Page {currentPage + 1} of {totalPages}
                  </Text>
                )}
              </Flex>

              <VStack spacing={4} align="stretch">
                {hasPurchaseHistory ? (
                  <>
                    {currentPageItems.map((purchase, idx) => (
                      <MotionBox
                        key={idx}
                        p={4}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={borderColor}
                        whileHover={{ y: -2, boxShadow: "md" }}
                        transition={{ duration: 0.2 }}
                      >
                        <Flex justify="space-between" mb={2}>
                          <Text fontWeight="bold">
                            {purchase.address || "Unknown Address"}
                          </Text>
                          <Badge colorScheme="green">{purchase.price}</Badge>
                        </Flex>
                        <Flex align="center">
                          <Icon
                            as={FaHistory as React.ElementType}
                            color={textSecondaryColor}
                            mr={2}
                          />
                          <Text fontSize="sm" color={textSecondaryColor}>
                            {purchase.date}
                          </Text>
                        </Flex>
                      </MotionBox>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <HStack spacing={4} justify="center" mt={2}>
                        <Button
                          size="sm"
                          colorScheme="gray"
                          onClick={goToPrevPage}
                          isDisabled={currentPage === 0}
                          leftIcon={
                            <Icon as={FaChevronLeft as React.ElementType} />
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="gray"
                          onClick={goToNextPage}
                          isDisabled={currentPage === totalPages - 1}
                          rightIcon={
                            <Icon as={FaChevronRight as React.ElementType} />
                          }
                        >
                          Next
                        </Button>
                      </HStack>
                    )}
                  </>
                ) : (
                  <Center
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={borderColor}
                  >
                    <Text color={textSecondaryColor}>
                      No purchase history available
                    </Text>
                  </Center>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* Actions */}
            {/* <Flex justify="flex-end" mb={4}>
              <Button leftIcon={<Icon as={FaDownload as React.ElementType} />} colorScheme="brand">
                Download Profile
              </Button>
            </Flex> */}
          </VStack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button onClick={onClose} variant="outline" width="100%">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>

      {/* Contact Info Drawer */}
      {buyer && (
        <ContactInfoDrawer
          isOpen={isContactDrawerOpen}
          onClose={onCloseContactDrawer}
          buyer={buyer}
          skipTraceCredits={skipTraceCredits}
        />
      )}

      {/* Skip Trace Flow Modal */}
      {buyer && (
        <SkipTraceFlowModal
          isOpen={isSkipTraceModalOpen}
          onClose={onCloseSkipTraceModal}
          buyer={buyer}
          skipTraceCredits={skipTraceCredits}
          onSkipTraceComplete={handleSkipTraceComplete}
        />
      )}
    </Drawer>
  );
};

export default BuyerDetailDrawer;
