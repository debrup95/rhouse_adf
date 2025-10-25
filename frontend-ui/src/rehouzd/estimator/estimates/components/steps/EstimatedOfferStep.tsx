import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import ReportModal from "../../../report/ReportModal";
import SellerReportModal from "../../../report/seller/SellerReportModal";
import NeighborhoodCompsSelection from "../NeighborhoodCompsSelection";
import InvestorCompsSelection from "../InvestorCompsSelection";
import {
  Box,
  Heading,
  Image,
  HStack,
  Stack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  Icon,
  Badge,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Flex,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  VStack,
  Tooltip,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Spacer,
  Checkbox,
  Progress,
  useDisclosure,
  Spinner,
  DrawerFooter,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from "@chakra-ui/react";
import {
  FaPhoneAlt,
  FaArrowLeft,
  FaFilter,
  FaCamera,
  FaInfoCircle,
  FaHome,
  FaRuler,
  FaBed,
  FaBath,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaDollarSign,
  FaUser,
  FaHeart,
  FaSave,
  FaStar,
  FaDownload,
  FaCaretDown,
  FaCaretUp,
  FaGripVertical,
  FaBuilding,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes,
  FaThLarge,
  FaTh,
  FaBars,
  FaChevronDown,
  FaChevronUp,
  FaLocationArrow,
  FaClock,
  FaReceipt,
  FaRulerCombined,
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import AddressMap from "../../../address/components/AddressMap";
import { AddressComponents } from "../../../address/components/PlaceAutocompleteInput";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setAddressData } from "../../../store/addressSlice";
import { setProperties } from "../../../store/propertySlice";
import { expandPropertiesIntoSeparateRows } from "../../../utils/propertyExpansion";
import CommonModal from "../../../components/CommonModal";
import RentUnderwriteSliders from "../../components/RentUnderwriteSliders";
import FlipUnderwriteSliders from "../../components/FlipUnderwriteSliders";
import BuyerDetailDrawer from "../../../components/BuyerDetailDrawer";
import BulkSkipTraceModal from "../../../components/BulkSkipTraceModal";
import {
  selectSkipTraceResults,
  addSkipTraceResult,
  setCredits,
} from "../../../store/skipTraceSlice";
import { skipTraceService } from "../../../services/skipTraceService";
import type { Buyer } from "../../../store/buyerSlice";
import BuyerEstimatedPrice from "../BuyerEstimatedPrice";
import PropertyHeaderCard from "../PropertyHeaderCard";
import {
  BackendBuyer,
  transformBuyerData,
  setBuyers as setBuyersRedux,
} from "../../../store/buyerSlice";
import config from "../../../../../config";
import {
  updateOfferRange,
  setActiveStrategy,
  toggleRentHighRehabMode,
  toggleFlipHighRehabMode,
  setRentCustomHighRehab,
  setFlipCustomHighRehab,
  updateRentDefaultHighRehab,
  updateFlipDefaultHighRehab,
  updateRentValues,
  updateFlipValues,
} from "../../../store/underwriteSlice";
import { calculateOfferRange } from "../../../utils/calculateBuyerEstimatedPrice";
import {
  isInNetworkBuyer,
  getInNetworkBuyersCount,
} from "../../../utils/inNetworkBuyers";
import { useNavigate } from "react-router-dom";
import InvestorCompsSection from "../InvestorCompsSection";
import {
  calculateBuyerMetrics,
  formatCurrency,
} from "../../../utils/buyerAnalytics";
import DetailedRehabCalculatorModal from "../DetailedRehabCalculatorModal";
import SqFtRehabCalculatorModal from "../SqFtRehabCalculatorModal";
import rehabCalculatorService from "../../../services/rehabCalculatorService";

// Add necessary interfaces for the underwrite slider values
interface RentUnderwriteValues {
  rent: number;
  expense: number;
  capRate: number;
  highRehab: number;
  afterRepairValue: number;
  defaultHighRehab: number;
  isUsingCustomHighRehab: boolean;
}

interface FlipUnderwriteValues {
  sellingCosts: number;
  holdingCosts: number;
  margin: number;
  highRehab: number;
  afterRepairValue: number;
  estimatedOffer: number;
  defaultHighRehab: number;
  isUsingCustomHighRehab: boolean;
}

interface UnderwriteSliderValues {
  rent: RentUnderwriteValues;
  flip: FlipUnderwriteValues;
}

// Define sort orders
type SortOrder =
  | "Price (Low to High)"
  | "Price (High to Low)"
  | "Distance"
  | "Distance Reverse"
  | "Year Built"
  | "Year Built Reverse"
  | "Square Footage"
  | "Square Footage Reverse"
  | "Listing"
  | "Listing Reverse"
  | "Address"
  | "Address Reverse"
  | "Date"
  | "Date Reverse"
  | "Bed"
  | "Bed Reverse"
  | "Bath"
  | "Bath Reverse";

interface EstimatedOfferStepProps {
  selectedAddress: AddressComponents | null;
  googleApiKey: string;
  addressState: {
    lat: number;
    lng: number;
    formattedAddress: string;
    [key: string]: any;
  };
  handleOpenCallbackModal: () => void;
  handleBackToStep2: () => void;
  onNext: () => void;
  onPropertyUpdate?: (
    isComplete?: boolean,
    expectedDetails?: {
      beds: number;
      baths: number;
      sqft: number;
      year: number;
    }
  ) => void;
  conditionRehabValues?: Record<string, number>;
}

interface RelatedProperty {
  id?: number;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  distance?: string | number;
  status?: string;
  soldDate?: string;
  date?: string; // Legacy date field
  latitude?: number;
  longitude?: number;
  similarityScore?: number;

  // New rental and sale event fields
  lastSalePrice?: number;
  lastSaleDate?: string;
  lastRentalPrice?: number;
  lastRentalDate?: string;
  rentalStatus?: string;
}

// PropertyDetailsModal Component
interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: RelatedProperty | null;
  formatPrice: (price?: number) => string;
  formatDistance: (distance?: number | string) => string;
}

const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  isOpen,
  onClose,
  property,
  formatPrice,
  formatDistance,
}) => {
  // Define theme colors
  const bgColor = "background.secondary";
  const textColor = "text.primary";
  const greenGradient = "green-gradient";
  const yellowGradient = "yellow-gradient";

  if (!property) return null;

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Property Details"
      size="xl"
    >
      <VStack spacing={4} align="stretch">
        <Heading size="md" mb={1} color={textColor}>
          {property.address}
        </Heading>

        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="xl" fontWeight="bold" color="brand.500">
            {formatPrice(property.price)}
          </Text>
          <Badge
            colorScheme={
              property.status === "Sold"
                ? "red"
                : property.status === "Pending"
                ? "yellow"
                : "green"
            }
            p={1}
            px={2}
          >
            {property.status || "Unknown"}
          </Badge>
        </Flex>

        <Box borderWidth="1px" borderRadius="md" p={3} bg={bgColor}>
          <SimpleGrid columns={2} spacing={3}>
            <HStack>
              <Icon as={FaBed as React.ElementType} color="text.secondary" />
              <Text>{property.bedrooms || 0} Bedrooms</Text>
            </HStack>
            <HStack>
              <Icon as={FaBath as React.ElementType} color="text.secondary" />
              <Text>{property.bathrooms || 0} Bathrooms</Text>
            </HStack>
            <HStack>
              <Icon as={FaRuler as React.ElementType} color="text.secondary" />
              <Text>{property.squareFootage || 0} Sq Ft</Text>
            </HStack>
            <HStack>
              <Icon
                as={FaCalendarAlt as React.ElementType}
                color="text.secondary"
              />
              <Text>Built in {property.yearBuilt || "N/A"}</Text>
            </HStack>
          </SimpleGrid>
        </Box>

        <HStack bg="blue.50" p={2} borderRadius="md">
          <Icon as={FaMapMarkerAlt as React.ElementType} color="blue.500" />
          <Text>{formatDistance(property.distance)} from your property</Text>
        </HStack>

        {property.soldDate && (
          <Text fontSize="sm" color="text.secondary">
            {property.status === "Sold" ? "Sold on " : "Listed on "}
            {new Date(property.soldDate).toLocaleDateString()}
          </Text>
        )}

        {property.similarityScore !== undefined && (
          <Box mt={1} p={2} bg={bgColor} borderRadius="md">
            <Text fontWeight="medium">Similarity Score</Text>
            <Slider
              aria-label="similarity-score"
              value={property.similarityScore * 100 || 0}
              isReadOnly
              colorScheme="brand"
              mt={2}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={6} />
            </Slider>
            <Text textAlign="right" fontSize="sm">
              {Math.round((property.similarityScore || 0) * 100)}% match
            </Text>
          </Box>
        )}

        <Button colorScheme="blue" mt={2} onClick={onClose}>
          Close
        </Button>
      </VStack>
    </CommonModal>
  );
};

const EstimatedOfferStep: React.FC<EstimatedOfferStepProps> = ({
  selectedAddress,
  googleApiKey,
  addressState,
  handleOpenCallbackModal,
  handleBackToStep2,
  onNext,
  onPropertyUpdate,
  conditionRehabValues = {},
}) => {
  // Redux hooks
  const dispatch = useAppDispatch();
  const propertyState = useAppSelector((state: any) => state.property);
  const addressReduxState = useAppSelector((state: any) => state.address);
  const underwriteState = useAppSelector((state: any) => state.underwrite);
  const user = useAppSelector((state: any) => state.user);
  const skipTraceResults = useAppSelector(selectSkipTraceResults);
  const navigate = useNavigate();
  const toast = useToast();

  // Define theme colors
  const bgPrimary = "background.primary";
  const bgSecondary = "background.secondary";
  const borderPrimary = "border.primary";
  const textPrimary = "text.primary";
  const textSecondary = "text.secondary";
  const brandColor = "brand.500";
  const brandBorderColor = "brand.100";

  // State for filtering and sorting
  const [sortOrder, setSortOrder] = useState<SortOrder>("Distance");
  const [isSortingActive, setIsSortingActive] = useState(false);
  // Initialize showRentalProperties based on if there are any rental properties
  const [showRentalProperties, setShowRentalProperties] = useState(false);
  const [showSoldOnly, setShowSoldOnly] = useState(true);

  // State for neighborhood comps tabs
  const [activeCompsTab, setActiveCompsTab] = useState(0); // 0 = Suggested Comps, 1 = All Comps

  // State for main comps tabs (Neighborhood vs Investor)
  const [activeMainCompsTab, setActiveMainCompsTab] = useState(0); // 0 = Neighborhood Comps, 1 = Investor Comps

  // Filter states
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [yearBuiltRange, setYearBuiltRange] = useState([1900, 2024]);
  const [sqftRange, setSqftRange] = useState([0, 5000]);
  const [distanceRange, setDistanceRange] = useState([0, 5]);

  // Property details modal state
  const [selectedProperty, setSelectedProperty] =
    useState<RelatedProperty | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

  // Track active investment tab
  const [activeInvestmentTab, setActiveInvestmentTab] = useState(0);

  // Add state for slider values
  const [rentUnderwriteValues, setRentUnderwriteValues] = useState({
    rent: 0,
    expense: 0,
    capRate: 0,
    highRehab: 0,
    afterRepairValue: 0,
    defaultHighRehab: 0,
    isUsingCustomHighRehab: false,
  });

  const [flipUnderwriteValues, setFlipUnderwriteValues] = useState({
    sellingCosts: 0,
    holdingCosts: 0,
    margin: 0,
    highRehab: 0,
    afterRepairValue: 0,
    estimatedOffer: 0,
    defaultHighRehab: 0,
    isUsingCustomHighRehab: false,
  });

  const property = propertyState.properties[0] || null;

  // Get current rehab values based on active tab
  const currentRehabValues = useMemo(() => {
    return activeInvestmentTab === 0
      ? { highRehab: rentUnderwriteValues.highRehab }
      : { highRehab: flipUnderwriteValues.highRehab };
  }, [
    activeInvestmentTab,
    rentUnderwriteValues.highRehab,
    flipUnderwriteValues.highRehab,
  ]);

  // Loading states for sliders
  const [isLoadingSliderValues, setIsLoadingSliderValues] = useState(false);

  // Add state for selected properties
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<
    Array<string | number>
  >([]);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<
    string | number | null
  >(null);

  // State for draggable properties
  const [draggableProperties, setDraggableProperties] = useState<
    RelatedProperty[]
  >([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Track custom order of properties by their IDs
  const [customPropertyOrder, setCustomPropertyOrder] = useState<
    (string | number)[]
  >([]);

  // State for detailed rehab calculator modal
  const [isDetailedRehabModalOpen, setIsDetailedRehabModalOpen] =
    useState(false);

  // State for sq ft rehab calculator modal
  const [isSqFtRehabModalOpen, setIsSqFtRehabModalOpen] = useState(false);

  // State for report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Add state for strategy selection pre-modal
  const [isStrategyPromptOpen, setIsStrategyPromptOpen] = useState(false);
  const [reportStrategy, setReportStrategy] = useState<'rent' | 'flip' | null>(null);
  
  // State for seller report modal
  const [isSellerReportModalOpen, setIsSellerReportModalOpen] = useState(false);
  const [isSellerStrategyPromptOpen, setIsSellerStrategyPromptOpen] = useState(false);
  const [sellerReportStrategy, setSellerReportStrategy] = useState<'rent' | 'flip' | null>(null);
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [resetSellerComps, setResetSellerComps] = useState(false);

  // State for investor report modal
  const [isInvestorStrategyPromptOpen, setIsInvestorStrategyPromptOpen] = useState(false);
  const [selectedNeighborhoodComps, setSelectedNeighborhoodComps] = useState<string[]>([]);
  const [resetNeighborhoodComps, setResetNeighborhoodComps] = useState(false);

  // Reset the resetSellerComps flag after it's been used
  useEffect(() => {
    if (resetSellerComps) {
      setSelectedComps([]); // Clear the parent state as well
      setResetSellerComps(false);
    }
  }, [resetSellerComps]);

  // Reset the resetNeighborhoodComps flag after it's been used
  useEffect(() => {
    if (resetNeighborhoodComps) {
      setSelectedNeighborhoodComps([]); // Clear the parent state as well
      setResetNeighborhoodComps(false);
    }
  }, [resetNeighborhoodComps]);

  // Ref for the property table
  const propertyTableRef = useRef<HTMLTableElement>(null);

  // Get data from Redux store
  const propertyDetails = property?.addressData?.items?.[0] || null;
  const propertyDetailsForHeader = {
    beds: propertyDetails?.bedrooms ?? "Not Found",
    baths: propertyDetails?.bathrooms ?? "Not Found",
    sqft: propertyDetails?.square_footage ?? "Not Found",
    year: propertyDetails?.year_built ?? "Not Found",
  };

  // Get neighborhood properties from Redux store
  const neighborhoodProperties = property?.neighborhoodProperties || [];
  const allProperties = property?.allProperties || [];

  // Get the current properties based on active tab (memoized to prevent circular dependencies)
  const currentProperties = useMemo(() => {
    const properties =
      activeCompsTab === 0 ? neighborhoodProperties : allProperties;

    return properties;
  }, [activeCompsTab, neighborhoodProperties, allProperties]);

  // State for actual homes sold count from database
  const [actualHomesSoldCount, setActualHomesSoldCount] = useState<number>(0);

  // Fetch actual homes sold count from database when zip code is available
  useEffect(() => {
    const fetchHomesSoldCount = async () => {
      try {
        // Get zip code from property details
        const zipCode = propertyDetails?.zip_code;

        if (zipCode) {
          const response = await fetch(
            `${config.apiUrl}/api/property/homes-sold-count/${zipCode}`
          );

          if (response.ok) {
            const data = await response.json();
            setActualHomesSoldCount(data.salesCount);
          } else {
            // Failed to fetch homes sold count
          }
        }
      } catch (error) {
        // Error fetching homes sold count
      }
    };

    fetchHomesSoldCount();
  }, [propertyDetails?.zip_code]);

  // Load all skip trace results for current user to populate CSV data
  useEffect(() => {
    const loadSkipTraceHistory = async () => {
      if (user?.user_id && user.isLoggedIn) {
        try {
          // Loading skip trace history for CSV generation
          const userId = parseInt(user.user_id.toString(), 10);
          const historyResponse = await skipTraceService.getSkipTraceHistory(
            userId,
            100
          ); // Get more results for CSV

          if (historyResponse.success && historyResponse.results) {
            // Skip trace history response processed

            // Add all results to Redux store if not already there
            let addedCount = 0;
            historyResponse.results.forEach((result: any) => {
              // Check if result already exists in Redux store
              const existingResult = skipTraceResults.find(
                (existing) =>
                  existing.lookupId === result.lookupId &&
                  existing.userId === user?.user_id?.toString()
              );

              if (!existingResult) {
                const resultWithUserId = {
                  ...result,
                  userId: user?.user_id?.toString(),
                };
                dispatch(addSkipTraceResult(resultWithUserId));
                addedCount++;
              }
            });
            // Loaded skip trace results to Redux store
          }
        } catch (error) {
          // Failed to load skip trace history for CSV
        }
      }
    };

    // Only load if we have no skip trace results in Redux (e.g., after navigation)
    if (user?.user_id && user.isLoggedIn && skipTraceResults.length === 0) {
      loadSkipTraceHistory();
    }
  }, [user?.user_id, user?.isLoggedIn, dispatch]); // Removed skipTraceResults from dependencies to prevent infinite loops

  // Load underwrite values when address and condition are available
  useEffect(() => {
    const loadUnderwriteValues = async () => {
      setIsLoadingSliderValues(true);
      try {
        // Use the address as the property identifier
        const address = selectedAddress?.formattedAddress || "";
        // Only proceed if address exists
        if (address) {
          // Save condition from address state to Redux store if it exists
          if (addressState.condition) {
            dispatch(
              setAddressData({
                ...addressState,
                condition: addressState.condition,
              })
            );
          } else {
            setIsLoadingSliderValues(false);
            return;
          }

          // Use all neighborhood properties instead of filtering to just rentals
          const currentNeighborhoodProperties =
            propertyState.properties[0]?.neighborhoodProperties || [];

          // Get address data from the property state for market calculations
          const addressData =
            propertyState.properties[0]?.addressData?.items?.[0] || null;

          // Safely extract square_footage from addressData
          const squareFootage = addressData?.square_footage || 0;

          // Add condition from frontend to the addressData
          const enhancedAddressData = addressData
            ? {
                ...addressData,
                condition: addressState.condition, // Add the condition from user selection
              }
            : {
                condition: addressState.condition,
                // If addressData is null, at least provide the condition
                // but we might still lack square_footage which is needed for rehab costs
                square_footage: squareFootage, // Use the extracted square footage or 0
              };

          // Use address as a unique identifier for the property and pass ALL neighborhood properties
          const values = await getPropertyUnderwriteValues(
            address,
            currentNeighborhoodProperties,
            enhancedAddressData
          );

          // Calculate price per sq ft from backend values and recalculate rehab costs
          let adjustedRentHighRehab = values.rent.highRehab;
          let adjustedFlipHighRehab = values.flip.highRehab;

          if (squareFootage > 0) {
            // Calculate price per sq ft from backend estimate and round to nearest dollar
            const pricePerSqFt = Math.ceil(
              values.rent.highRehab / squareFootage
            );

            // Recalculate rehab cost using rounded price per sq ft
            adjustedRentHighRehab = pricePerSqFt * squareFootage;
            adjustedFlipHighRehab = pricePerSqFt * squareFootage;

            // Rehab calculation completed
          }

          // If condition presets are available, compute itemized rehab using the same service as DetailedRehabCalculatorModal
          try {
            const hasPresets =
              conditionRehabValues &&
              Object.keys(conditionRehabValues).length > 0;
            const state = addressData?.state_abbreviation || "";
            const county = addressData?.county || "";
            const bathroomCount = addressData?.bathrooms || 1;

            if (hasPresets && state && county) {
              const calculatorData =
                await rehabCalculatorService.getRehabCalculatorData(
                  state,
                  county,
                  squareFootage
                );
              if (calculatorData) {
                const request = {
                  afterRepairValue:
                    values.rent.afterRepairValue ||
                    values.flip.afterRepairValue ||
                    0,
                  squareFootage: squareFootage || 0,
                  bathrooms: conditionRehabValues.bathrooms ?? 0,
                  windows: conditionRehabValues.windows ?? 0,
                  electrical: conditionRehabValues.electrical ?? 0,
                  plumbing: conditionRehabValues.plumbing ?? 0,
                  interiorPaint: conditionRehabValues.interiorPaint ?? 0,
                  exteriorPaint: conditionRehabValues.exteriorPaint ?? 0,
                  exteriorSiding: conditionRehabValues.exteriorSiding ?? 0,
                  kitchen: conditionRehabValues.kitchen ?? 0,
                  roof: conditionRehabValues.roof ?? 0,
                  hvac: conditionRehabValues.hvac ?? 0,
                  flooring: conditionRehabValues.flooring ?? 0,
                  waterHeater: conditionRehabValues.waterHeater ?? 0,
                  contingency: conditionRehabValues.contingency ?? 0,
                } as any;

                const calc = rehabCalculatorService.calculateRehabCosts(
                  request,
                  calculatorData,
                  bathroomCount
                );
                if (calc) {
                  // Include any previously saved misc amount from Redux
                  const rentMisc =
                    underwriteState?.rent?.detailedMiscAmount || 0;
                  const flipMisc =
                    underwriteState?.flip?.detailedMiscAmount || 0;

                  const rentItemizedHighRehab = Math.round(
                    calc.total + rentMisc
                  );
                  const flipItemizedHighRehab = Math.round(
                    calc.total + flipMisc
                  );

                  // Override both strategies with itemized result for current custom view
                  values.rent.highRehab = rentItemizedHighRehab;
                  values.flip.highRehab = flipItemizedHighRehab;
                  // Keep Sq Ft as default baseline (will be set below)
                  values.rent.defaultHighRehab =
                    values.rent.defaultHighRehab ??
                    (rentItemizedHighRehab as any);
                  values.flip.defaultHighRehab =
                    values.flip.defaultHighRehab ??
                    (flipItemizedHighRehab as any);
                  // Force itemized mode selected by default
                  values.rent.isUsingCustomHighRehab = true as any;
                  values.flip.isUsingCustomHighRehab = true as any;
                  // Update Redux to reflect custom mode and value so toggling doesn't zero out
                  dispatch(setRentCustomHighRehab(rentItemizedHighRehab));
                  dispatch(setFlipCustomHighRehab(flipItemizedHighRehab));
                }
              }
            }
          } catch (e) {
            // Silently ignore; fallback to existing values
          }

          // Set the values in local state with adjusted rehab values as the new baseline
          const finalRentHighRehab = values.rent.isUsingCustomHighRehab
            ? values.rent.highRehab
            : adjustedRentHighRehab;
          const finalFlipHighRehab = values.flip.isUsingCustomHighRehab
            ? values.flip.highRehab
            : adjustedFlipHighRehab;

          setRentUnderwriteValues({
            ...values.rent,
            highRehab: finalRentHighRehab,
            // Default should remain Sq Ft baseline
            defaultHighRehab: adjustedRentHighRehab,
            isUsingCustomHighRehab: values.rent.isUsingCustomHighRehab ?? false,
          });
          setFlipUnderwriteValues({
            ...values.flip,
            highRehab: finalFlipHighRehab,
            // Default should remain Sq Ft baseline
            defaultHighRehab: adjustedFlipHighRehab,
            isUsingCustomHighRehab: values.flip.isUsingCustomHighRehab ?? false,
          });

          // Set the adjusted values as the new defaults in Redux (Sq Ft baseline)
          dispatch(updateRentDefaultHighRehab(adjustedRentHighRehab));
          dispatch(updateFlipDefaultHighRehab(adjustedFlipHighRehab));
        } else {
          // Don't load values if no address is set
          // Skipping underwrite values load: No address available
        }
      } catch (error) {
        // Failed to load underwrite values
        // If there's an error, try to get default values as fallback
        try {
          const values = await getDefaultUnderwriteValues();

          // Set the values in local state with proper default high rehab values
          setRentUnderwriteValues({
            ...values.rent,
            defaultHighRehab: values.rent.highRehab, // Use backend calculated value as default
            isUsingCustomHighRehab: false,
          });
          setFlipUnderwriteValues({
            ...values.flip,
            defaultHighRehab: values.flip.highRehab, // Use backend calculated value as default
            isUsingCustomHighRehab: false,
          });

          // Set the default high rehab values in Redux for fallback case too
          dispatch(updateRentDefaultHighRehab(values.rent.highRehab));
          dispatch(updateFlipDefaultHighRehab(values.flip.highRehab));
        } catch (fallbackError) {
          // Failed to load default underwrite values
          // If we can't even get default values, use the initial state values
        }
      } finally {
        setIsLoadingSliderValues(false);
      }
    };

    // Load underwrite values if address exists
    if (selectedAddress?.formattedAddress) {
      loadUnderwriteValues();
    }
  }, [
    selectedAddress?.formattedAddress,
    addressState.condition,
    propertyState.properties,
    dispatch,
    JSON.stringify(conditionRehabValues),
  ]);

  // Set filter defaults based on active comps tab
  useEffect(() => {
    if (activeCompsTab === 0) {
      // Suggested Comps: Show Rentals OFF, Sold Only ON
      setShowRentalProperties(false);
      setShowSoldOnly(true);
    } else {
      // All Comps: Show Rentals ON, Sold Only ON
      setShowRentalProperties(true);
      setShowSoldOnly(true);
    }
  }, [activeCompsTab]);

  // Use the shared utility function for property expansion

  // Calculate the number of rental and sold properties
  // For All Comps tab, we need to count expanded rows; for Suggested Comps, count unique properties
  const { rentalPropertiesCount, soldPropertiesCount } = useMemo(() => {
    if (activeCompsTab === 1) {
      // All Comps tab: Count expanded rows to match what's displayed in the table
      const expandedProperties =
        expandPropertiesIntoSeparateRows(currentProperties);
      const rentalCount = expandedProperties.filter(
        (p: any) =>
          p.status === "LISTED_RENT" ||
          p.status === "LISTING_REMOVED" ||
          p.status === "RENTAL" ||
          p.status === "PRICE_CHANGE"
      ).length;
      const soldCount = expandedProperties.filter(
        (p: any) => p.status === "SOLD" || p.status === "Sold"
      ).length;
      return {
        rentalPropertiesCount: rentalCount,
        soldPropertiesCount: soldCount,
      };
    } else {
      // Suggested Comps tab: Count unique properties (already expanded from backend)
      const rentalCount = currentProperties.filter(
        (p: any) =>
          p.status === "LISTED_RENT" ||
          p.status === "LISTING_REMOVED" ||
          p.status === "RENTAL" ||
          p.status === "PRICE_CHANGE"
      ).length;
      const soldCount = currentProperties.filter(
        (p: any) => p.status === "SOLD" || p.status === "Sold"
      ).length;
      return {
        rentalPropertiesCount: rentalCount,
        soldPropertiesCount: soldCount,
      };
    }
  }, [currentProperties, activeCompsTab]);

  // Update showRentalProperties when rentalPropertiesCount changes
  useEffect(() => {
    if (rentalPropertiesCount === 0) {
      setShowRentalProperties(false);
    }
  }, [rentalPropertiesCount]);

  // Helper function to always expand properties (regardless of active tab)
  const forceExpandProperties = (properties: RelatedProperty[]) => {
    const expandedProperties: RelatedProperty[] = [];

    properties.forEach((property, index) => {
      // Create a row for sale event if it exists
      if (property.lastSalePrice && property.lastSaleDate) {
        expandedProperties.push({
          ...property,
          id: `${property.id || index}-sale` as any,
          status: "SOLD",
          soldDate: property.lastSaleDate,
          date: property.lastSaleDate,
          price: property.lastSalePrice,
          lastRentalPrice: undefined,
          lastRentalDate: undefined,
          rentalStatus: undefined,
        });
      }

      // Create a row for rental event if it exists
      if (property.lastRentalPrice && property.lastRentalDate) {
        expandedProperties.push({
          ...property,
          id: `${property.id || index}-rental` as any,
          status:
            property.rentalStatus === "PRICE_CHANGE"
              ? "RENTAL"
              : property.rentalStatus || "RENTAL",
          soldDate: property.lastRentalDate,
          date: property.lastRentalDate,
          price: property.lastRentalPrice,
          lastSalePrice: undefined,
          lastSaleDate: undefined,
        });
      }

      // Create a fallback row for properties with no event data
      if (
        !property.lastSalePrice &&
        !property.lastSaleDate &&
        !property.lastRentalPrice &&
        !property.lastRentalDate &&
        (property.price || property.status)
      ) {
        expandedProperties.push({
          ...property,
          id: `${property.id || index}-legacy` as any,
        });
      }
    });

    return expandedProperties;
  };

  // Calculate display counts for tab badges
  const { suggestedCompsDisplayCount, allCompsDisplayCount } = useMemo(() => {
    // Suggested Comps always shows unique properties count
    const suggestedCount = neighborhoodProperties.length;

    // All Comps shows expanded rows count (properties with both sale and rental events count as 2)
    const allCount = forceExpandProperties(allProperties).length;

    return {
      suggestedCompsDisplayCount: suggestedCount,
      allCompsDisplayCount: allCount,
    };
  }, [neighborhoodProperties.length, allProperties]);

  // Use useMemo to compute filtered properties to avoid circular dependencies
  const filteredProperties = useMemo(() => {
    // When both toggles are on, show all properties with separate rows for each event type
    if (showRentalProperties && showSoldOnly) {
      const expandedProperties =
        expandPropertiesIntoSeparateRows(currentProperties);
      return expandedProperties.sort((a, b) => {
        switch (sortOrder) {
          case "Price (Low to High)":
            return (a.price || 0) - (b.price || 0);
          case "Price (High to Low)":
            return (b.price || 0) - (a.price || 0);
          case "Distance":
            return (
              (typeof a.distance === "number" ? a.distance : 0) -
              (typeof b.distance === "number" ? b.distance : 0)
            );
          case "Distance Reverse":
            return (
              (typeof b.distance === "number" ? b.distance : 0) -
              (typeof a.distance === "number" ? a.distance : 0)
            );
          case "Year Built":
            return (b.yearBuilt || 0) - (a.yearBuilt || 0);
          case "Year Built Reverse":
            return (a.yearBuilt || 0) - (b.yearBuilt || 0);
          case "Square Footage":
            return (b.squareFootage || 0) - (a.squareFootage || 0);
          case "Square Footage Reverse":
            return (a.squareFootage || 0) - (b.squareFootage || 0);
          case "Listing":
            return (a.status || "").localeCompare(b.status || "");
          case "Listing Reverse":
            return (b.status || "").localeCompare(a.status || "");
          case "Address":
            return (a.address || "").localeCompare(b.address || "");
          case "Address Reverse":
            return (b.address || "").localeCompare(a.address || "");
          case "Date":
            return (a.soldDate || "").localeCompare(b.soldDate || "");
          case "Date Reverse":
            return (b.soldDate || "").localeCompare(a.soldDate || "");
          case "Bed":
            return (a.bedrooms || 0) - (b.bedrooms || 0);
          case "Bed Reverse":
            return (b.bedrooms || 0) - (a.bedrooms || 0);
          case "Bath":
            return (a.bathrooms || 0) - (b.bathrooms || 0);
          case "Bath Reverse":
            return (b.bathrooms || 0) - (a.bathrooms || 0);
          default:
            return 0;
        }
      });
    }

    // If neither toggle is on, show nothing
    if (!showRentalProperties && !showSoldOnly) {
      return [];
    }

    // Expand properties first, then filter by type
    const expandedProperties =
      expandPropertiesIntoSeparateRows(currentProperties);

    // Filter properties based on toggles
    let propertiesFilteredByType: any[] = [];

    // For suggested comps (activeCompsTab === 0), use status-based filtering like All Comps
    // since eventDetails is not preserved in the mapped data
    if (activeCompsTab === 0) {
      // Filter based on status field (which is mapped from eventDetails.event_name)
      if (showRentalProperties) {
        const rentalProperties = expandedProperties.filter(
          (p: any) =>
            p.status === "LISTED_RENT" ||
            p.status === "LISTING_REMOVED" ||
            p.status === "RENTAL" ||
            p.status === "PRICE_CHANGE"
        );
        propertiesFilteredByType.push(...rentalProperties);
      }

      // Add sold properties if the toggle is on
      if (showSoldOnly) {
        const soldProperties = expandedProperties.filter(
          (p: any) => p.status === "SOLD" || p.status === "Sold"
        );
        propertiesFilteredByType.push(...soldProperties);
      }
    } else {
      // For all comps (activeCompsTab === 1), use the original status-based filtering
      // First filter by rental status if needed
      if (showRentalProperties) {
        const rentalProperties = expandedProperties.filter(
          (p: any) =>
            p.status === "LISTED_RENT" ||
            p.status === "LISTING_REMOVED" ||
            p.status === "RENTAL" ||
            p.status === "PRICE_CHANGE"
        );
        propertiesFilteredByType.push(...rentalProperties);
      }

      // Add sold properties if the toggle is on
      if (showSoldOnly) {
        const soldProperties = expandedProperties.filter(
          (p: any) => p.status === "SOLD" || p.status === "Sold"
        );
        propertiesFilteredByType.push(...soldProperties);
      }
    }

    // Then sort the filtered properties
    return propertiesFilteredByType.sort((a: any, b: any) => {
      switch (sortOrder) {
        case "Price (Low to High)":
          return (a.price || 0) - (b.price || 0);
        case "Price (High to Low)":
          return (b.price || 0) - (a.price || 0);
        case "Distance":
          return (
            (typeof a.distance === "number" ? a.distance : 0) -
            (typeof b.distance === "number" ? b.distance : 0)
          );
        case "Distance Reverse":
          return (
            (typeof b.distance === "number" ? b.distance : 0) -
            (typeof a.distance === "number" ? a.distance : 0)
          );
        case "Year Built":
          return (b.yearBuilt || 0) - (a.yearBuilt || 0);
        case "Year Built Reverse":
          return (a.yearBuilt || 0) - (b.yearBuilt || 0);
        case "Square Footage":
          return (b.squareFootage || 0) - (a.squareFootage || 0);
        case "Square Footage Reverse":
          return (a.squareFootage || 0) - (b.squareFootage || 0);
        case "Listing":
          return (a.status || "").localeCompare(b.status || "");
        case "Listing Reverse":
          return (b.status || "").localeCompare(a.status || "");
        case "Address":
          return (a.address || "").localeCompare(b.address || "");
        case "Address Reverse":
          return (b.address || "").localeCompare(a.address || "");
        case "Date":
          return (a.soldDate || "").localeCompare(b.soldDate || "");
        case "Date Reverse":
          return (b.soldDate || "").localeCompare(a.soldDate || "");
        case "Bed":
          return (a.bedrooms || 0) - (b.bedrooms || 0);
        case "Bed Reverse":
          return (b.bedrooms || 0) - (a.bedrooms || 0);
        case "Bath":
          return (a.bathrooms || 0) - (b.bathrooms || 0);
        case "Bath Reverse":
          return (b.bathrooms || 0) - (a.bathrooms || 0);
        default:
          return 0;
      }
    });
  }, [
    currentProperties,
    sortOrder,
    showRentalProperties,
    showSoldOnly,
    activeCompsTab,
  ]);

  // Function to handle property row click (highlight on map)
  const handlePropertyRowClick = useCallback((property: RelatedProperty) => {
    setHighlightedPropertyId(property.id || null);
    // Logic to highlight on map would go here
    // For now just logging
    // Property row clicked
  }, []);

  // Function to reset highlighted property
  const handleResetHighlight = useCallback(() => {
    setHighlightedPropertyId(null);
  }, []);

  // Function to handle property checkbox selection
  const handlePropertySelect = useCallback(
    (property: RelatedProperty, isChecked: boolean) => {
      const propId = property.id || "";
      if (isChecked) {
        setSelectedPropertyIds((prev) => {
          // Only add if not already present
          if (!prev.includes(propId)) {
            return [...prev, propId];
          }
          return prev;
        });
      } else {
        setSelectedPropertyIds((prev) => prev.filter((id) => id !== propId));
      }
    },
    []
  );

  // Function to handle select all checkbox
  const handleSelectAllProperties = useCallback(
    (isChecked: boolean) => {
      if (isChecked) {
        // Create an array of IDs from the current draggableProperties (which contains filtered data)
        const allIds: (string | number)[] = [];
        draggableProperties.forEach((prop) => {
          if (prop.id) {
            allIds.push(prop.id);
          }
        });
        setSelectedPropertyIds(allIds);
      } else {
        setSelectedPropertyIds([]);
      }
      // Select all properties
    },
    [draggableProperties]
  );

  // Function to handle slider changes for rent underwrite
  const handleRentSliderChange = (key: string, value: number) => {
    // Rent slider changed
  };

  // Function to handle slider changes for flip underwrite
  const handleFlipSliderChange = (key: string, value: number) => {
    // Flip slider changed
  };

  // Function to handle detailed rehab calculator modal
  const handleOpenDetailedRehabCalculator = () => {
    setIsDetailedRehabModalOpen(true);
  };

  const handleCloseDetailedRehabCalculator = () => {
    setIsDetailedRehabModalOpen(false);
  };

  // Function to handle sq ft rehab calculator modal
  const handleOpenSqFtRehabCalculator = () => {
    setIsSqFtRehabModalOpen(true);
  };

  const handleCloseSqFtRehabCalculator = () => {
    setIsSqFtRehabModalOpen(false);
  };

  const handleSqFtRehabResults = (results: any) => {
    // SqFt rehab results
    // Apply the results to the current active strategy sliders
    if (activeInvestmentTab === 0) {
      // Rental strategy - update the high rehab value
      setRentUnderwriteValues((prev) => ({
        ...prev,
        highRehab: results.highRehab || prev.highRehab,
        defaultHighRehab: results.highRehab || prev.defaultHighRehab,
        // Keep in Sq Ft mode (don't switch to custom)
        isUsingCustomHighRehab: false,
      }));
    } else {
      // Flip strategy - update the high rehab value
      setFlipUnderwriteValues((prev) => ({
        ...prev,
        highRehab: results.highRehab || prev.highRehab,
        defaultHighRehab: results.highRehab || prev.defaultHighRehab,
        // Keep in Sq Ft mode (don't switch to custom)
        isUsingCustomHighRehab: false,
      }));
    }
    setIsSqFtRehabModalOpen(false);
  };

  const handleDetailedRehabResults = (results: any) => {
    // Detailed rehab results
    // Apply the results to the current active strategy sliders
    if (activeInvestmentTab === 0) {
      // Rental strategy - update the high rehab value only
      setRentUnderwriteValues((prev) => ({
        ...prev,
        highRehab: results.highRehab || prev.highRehab,
        // Mark as using custom high rehab if we're updating it
        isUsingCustomHighRehab:
          results.highRehab !== undefined ? true : prev.isUsingCustomHighRehab,
      }));

      // Redux store already updated by DetailedRehabCalculatorModal
      // No need to dispatch again here
    } else {
      // Flip strategy - update the high rehab value only
      setFlipUnderwriteValues((prev) => ({
        ...prev,
        highRehab: results.highRehab || prev.highRehab,
        // Mark as using custom high rehab if we're updating it
        isUsingCustomHighRehab:
          results.highRehab !== undefined ? true : prev.isUsingCustomHighRehab,
      }));

      // Redux store already updated by DetailedRehabCalculatorModal
      // No need to dispatch again here
    }
    setIsDetailedRehabModalOpen(false);
  };

  // Create direct API functions for underwrite slider values
  const getDefaultUnderwriteValues =
    useCallback(async (): Promise<UnderwriteSliderValues> => {
      try {
        // Add a timestamp to avoid caching issues
        const cacheBuster = `_=${new Date().getTime()}`;
        const response = await fetch(
          `${config.apiUrl}/api/underwrite-sliders?${cacheBuster}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch default underwrite values");
        }

        const data = await response.json();
        // Received default values
        return data.data;
      } catch (error: unknown) {
        // Error fetching default underwrite values
        // Return fallback values if API call fails
        return {
          rent: {
            rent: 0,
            expense: 0,
            capRate: 0,
            highRehab: 0,
            afterRepairValue: 0,
            defaultHighRehab: 0,
            isUsingCustomHighRehab: false,
          },
          flip: {
            sellingCosts: 0,
            holdingCosts: 0,
            margin: 0,
            highRehab: 0,
            afterRepairValue: 0,
            estimatedOffer: 0,
            defaultHighRehab: 0,
            isUsingCustomHighRehab: false,
          },
        };
      }
    }, []);

  const getPropertyUnderwriteValues = useCallback(
    async (
      propertyId: string,
      neighborhoodProperties: any[] = [],
      addressData: any | null = null
    ): Promise<UnderwriteSliderValues> => {
      try {
        // Use encoded propertyId for the URL and add cache-busting
        const encodedPropertyId = encodeURIComponent(propertyId);
        const cacheBuster = `_=${new Date().getTime()}`;

        // addressData processed

        // Use POST with /calculate endpoint if we have neighborhood properties
        if (neighborhoodProperties && neighborhoodProperties.length > 0) {
          const response = await fetch(
            `${config.apiUrl}/api/underwrite-sliders/${encodedPropertyId}/calculate?${cacheBuster}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ neighborhoodProperties, addressData }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch property underwrite values");
          }

          const data = await response.json();
          // Received values for property
          return data.data;
        } else {
          // Otherwise, use the standard GET endpoint
          const response = await fetch(
            `${config.apiUrl}/api/underwrite-sliders/${encodedPropertyId}?${cacheBuster}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch property underwrite values");
          }

          const data = await response.json();
          // Received values for property
          return data.data;
        }
      } catch (error: unknown) {
        // Error fetching underwrite values for property
        // If API call fails, get default values instead
        return getDefaultUnderwriteValues();
      }
    },
    [getDefaultUnderwriteValues]
  );

  const savePropertyUnderwriteValues = async (
    propertyId: string,
    values: UnderwriteSliderValues
  ): Promise<string> => {
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      const response = await fetch(
        `${config.apiUrl}/api/underwrite-sliders?${cacheBuster}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ propertyId, values }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save underwrite values");
      }

      const data = await response.json();
      // Values saved successfully
      return data.message || "Underwrite values saved successfully";
    } catch (error: unknown) {
      // Error saving underwrite values for property
      throw error;
    }
  };

  // Function to handle all rent underwrite values changing
  // Memoize callbacks to prevent re-creation on each render
  const handleRentValuesChanged = useCallback(
    (values: typeof rentUnderwriteValues) => {
      setRentUnderwriteValues(values);

      // Use the address as the property identifier
      const address = selectedAddress?.formattedAddress;
      if (address) {
        // Use a timeout to avoid too many API calls during slider movement
        const timer = setTimeout(() => {
          savePropertyUnderwriteValues(address, {
            rent: values,
            flip: flipUnderwriteValues,
          }).catch((error: unknown) => {
            // Failed to save rent values
          });
        }, 500);

        return () => clearTimeout(timer);
      }
    },
    [selectedAddress?.formattedAddress, flipUnderwriteValues]
  );

  // Function to handle all flip underwrite values changing
  const handleFlipValuesChanged = useCallback(
    (values: typeof flipUnderwriteValues) => {
      setFlipUnderwriteValues(values);

      // Use the address as the property identifier
      const address = selectedAddress?.formattedAddress;
      if (address) {
        // Use a timeout to avoid too many API calls during slider movement
        const timer = setTimeout(() => {
          savePropertyUnderwriteValues(address, {
            rent: rentUnderwriteValues,
            flip: values,
          }).catch((error: unknown) => {
            // Failed to save flip values
          });
        }, 500);

        return () => clearTimeout(timer);
      }
    },
    [selectedAddress?.formattedAddress, rentUnderwriteValues]
  );

  // State for handling save estimate
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  // Buyers Drawer State
  const {
    isOpen: isBuyersDrawerOpen,
    onOpen: onOpenBuyersDrawer,
    onClose: onCloseBuyersDrawer,
  } = useDisclosure();
  const {
    isOpen: isBulkSkipTraceModalOpen,
    onOpen: onOpenBulkSkipTraceModal,
    onClose: onCloseBulkSkipTraceModal,
  } = useDisclosure();
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);

  // Buyer category filter state
  type BuyerCategory = 'all' | 'active' | 'recent';
  const [selectedBuyerCategory, setSelectedBuyerCategory] = useState<BuyerCategory>('all');

  // Background bulk skip trace state
  const [bulkSkipTraceProgress, setBulkSkipTraceProgress] = useState<{
    isRunning: boolean;
    completed: number;
    total: number;
    successful: number;
    failed: number;
    currentBuyer?: string;
  }>({
    isRunning: false,
    completed: 0,
    total: 0,
    successful: 0,
    failed: 0,
  });

  // Add state for buyers
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [buyersError, setBuyersError] = useState<string | null>(null);
  const [showInNetworkOnly, setShowInNetworkOnly] = useState(false);

  // Get the radius from the API data - conditional based on active tab
  const radiusMiles = useMemo(() => {
    if (activeCompsTab === 1) {
      // All Comps tab - always use 1.0 miles
      return 1.0;
    } else {
      // Suggested Comps tab - use adaptive radius from backend
      return property?.radiusUsed || 0.5;
    }
  }, [activeCompsTab, property?.radiusUsed]);

  // Function to format price
  const formatPrice = (price: number | undefined) => {
    if (!price || price === 0) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Function to format distance
  const formatDistance = (distance: number | string | undefined) => {
    if (distance === undefined || distance === null) return "N/A";
    const numDistance =
      typeof distance === "string" ? parseFloat(distance) : distance;
    return `${numDistance.toFixed(1)} mi`;
  };

  // Helper function to get buyer categories - now uses backend categorization
  const getBuyerCategories = (buyer: Buyer): BuyerCategory[] => {
    const categories: BuyerCategory[] = ['all'];

    // Use the category provided by the backend
    if (buyer.category) {
      categories.push(buyer.category);
    }

    return categories;
  };

  // Filter buyers based on category and in-network status (for display)
  const filteredBuyers = useMemo(() => {
    let filtered = buyers; // All buyers - backend handles distance-based filtering

    // Apply category filter
    if (selectedBuyerCategory !== 'all') {
      filtered = filtered.filter((buyer) => {
        const categories = getBuyerCategories(buyer);
        return categories.includes(selectedBuyerCategory);
      });
    }

    // Apply in-network filter if selected
    if (showInNetworkOnly) {
      filtered = filtered.filter((buyer) => isInNetworkBuyer(buyer.name));
    }

    return filtered;
  }, [buyers, selectedBuyerCategory, showInNetworkOnly, propertyDetails?.zip_code]);

  // Helper functions to get buyer counts for each category
  // This must be consistent with getBuyerCategories function above
  const getBuyerCategoryCount = useCallback((category: BuyerCategory): number => {
    let baseBuyers = buyers; // All buyers - backend handles distance filtering

    // Apply in-network filtering first (same as filteredBuyers)
    if (showInNetworkOnly) {
      baseBuyers = baseBuyers.filter((buyer) => isInNetworkBuyer(buyer.name));
    }

    if (category === 'all') {
      // For 'all', count all buyers (same as filteredBuyers when category is 'all')
      return baseBuyers.length;
    }

    // Count buyers in the specific category
    return baseBuyers.filter((buyer) => {
      const categories = getBuyerCategories(buyer);
      return categories.includes(category);
    }).length;
  }, [buyers, showInNetworkOnly, propertyDetails]);

  // Filter handlers
  const handleShowInNetworkOnly = () => {
    setShowInNetworkOnly(true);
  };

  const handleShowAllBuyers = () => {
    setShowInNetworkOnly(false);
  };

  // Helper function to check if a buyer is already skip traced
  const isBuyerAlreadyTraced = useCallback(
    (buyerName: string) => {
      return skipTraceResults.some(
        (result) =>
          result.buyerName?.toLowerCase().trim() ===
            buyerName?.toLowerCase().trim() &&
          result.userId === user?.user_id?.toString()
      );
    },
    [skipTraceResults, user?.user_id]
  );

  // Calculate the actual number of buyers that would be skip traced (excluding in-network and already traced)
  const skipTraceableBuyersCount = useMemo(() => {
    return selectedBuyers
      .map((buyerId) =>
        filteredBuyers.find((buyer) => (buyer.id || buyer.name) === buyerId)
      )
      .filter((buyer): buyer is Buyer => buyer !== undefined)
      .filter((buyer) => !isInNetworkBuyer(buyer.name))
      .filter((buyer) => !isBuyerAlreadyTraced(buyer.name)).length;
  }, [selectedBuyers, filteredBuyers, isBuyerAlreadyTraced]);

  // Calculate breakdown for bulk skip trace
  const bulkSkipTraceBreakdown = useMemo(() => {
    const selectedBuyerObjects = selectedBuyers
      .map((buyerId) =>
        filteredBuyers.find((buyer) => (buyer.id || buyer.name) === buyerId)
      )
      .filter((buyer): buyer is Buyer => buyer !== undefined);

    const total = selectedBuyerObjects.length;
    const inNetwork = selectedBuyerObjects.filter((buyer) =>
      isInNetworkBuyer(buyer.name)
    ).length;
    const alreadyTraced = selectedBuyerObjects.filter(
      (buyer) =>
        !isInNetworkBuyer(buyer.name) && isBuyerAlreadyTraced(buyer.name)
    ).length;
    const newToTrace = selectedBuyerObjects.filter(
      (buyer) =>
        !isInNetworkBuyer(buyer.name) && !isBuyerAlreadyTraced(buyer.name)
    ).length;

    return {
      total,
      inNetwork,
      alreadyTraced,
      newToTrace,
      selectedBuyerObjects,
    };
  }, [selectedBuyers, filteredBuyers, isBuyerAlreadyTraced]);

  // Background bulk skip trace processing
  const performBackgroundBulkSkipTrace = useCallback(async () => {
    const buyersToTrace = selectedBuyers
      .map((buyerId) =>
        filteredBuyers.find((buyer) => (buyer.id || buyer.name) === buyerId)
      )
      .filter((buyer): buyer is Buyer => buyer !== undefined)
      .filter(
        (buyer) =>
          !isInNetworkBuyer(buyer.name) && !isBuyerAlreadyTraced(buyer.name)
      );

    setBulkSkipTraceProgress({
      isRunning: true,
      completed: 0,
      total: buyersToTrace.length,
      successful: 0,
      failed: 0,
      currentBuyer: undefined,
    });

    let successful = 0;
    let failed = 0;
    const skippedCount =
      bulkSkipTraceBreakdown.inNetwork + bulkSkipTraceBreakdown.alreadyTraced;

    try {
      for (let i = 0; i < buyersToTrace.length; i++) {
        const buyer = buyersToTrace[i];

        setBulkSkipTraceProgress((prev) => ({
          ...prev,
          currentBuyer: buyer.name,
          completed: i,
        }));

        try {
          const request = {
            buyerId: buyer.id || buyer.name,
            buyerName: buyer.name,
            inputData: {
              ownerName: buyer.name,
              address: buyer.address,
            },
            propertyAddresses:
              buyer.purchase_history
                ?.map((purchase) => {
                  const enhancedPurchase = purchase as any;

                  if (enhancedPurchase.prop_address_line_txt) {
                    const street = enhancedPurchase.prop_address_line_txt;
                    const city = enhancedPurchase.prop_city_nm || "";
                    const state = enhancedPurchase.prop_state_nm || "";
                    const zip = enhancedPurchase.prop_zip_cd || "";

                    let fullAddress = street;
                    if (city) fullAddress += `, ${city}`;
                    if (state) fullAddress += `, ${state}`;
                    if (zip) fullAddress += ` ${zip}`;

                    return fullAddress;
                  }

                  return enhancedPurchase.address || "";
                })
                .filter((address) => address.trim() !== "")
                .slice(0, 3) || [],
          };

          const result = await skipTraceService.skipTrace(
            parseInt(user?.user_id?.toString() || "0"),
            request
          );

          if (result.success && result.result) {
            successful++;
            // Add result to Redux store
            const resultWithUserId = {
              ...result.result,
              userId: user?.user_id?.toString(),
              lookupId: result.result.lookupId || `temp-${Date.now()}`,
              buyerId: result.result.buyerId || buyer.id || buyer.name,
              buyerName: result.result.buyerName || buyer.name,
              lookupDate: result.result.lookupDate || new Date().toISOString(),
              creditUsed: result.result.creditUsed || "paid",
              phones: result.result.phones || [],
              emails: result.result.emails || [],
              addresses: result.result.addresses || [],
              compliance: result.result.compliance || {
                dncStatus: "unknown",
                litigatorStatus: "unknown",
              },
              apiResponseStatus: result.result.apiResponseStatus || "success",
            };
            dispatch(addSkipTraceResult(resultWithUserId));
          } else {
            failed++;
          }
        } catch (error) {
          // Skip trace failed for buyer
          failed++;
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update final progress
      setBulkSkipTraceProgress((prev) => ({
        ...prev,
        completed: buyersToTrace.length,
        successful,
        failed,
        isRunning: false,
        currentBuyer: undefined,
      }));

      // Refresh credit balance
      if (user?.user_id) {
        try {
          const creditBalance = await skipTraceService.getCreditBalance(
            parseInt(user.user_id.toString())
          );
          dispatch(
            setCredits({
              free: creditBalance.credits.free,
              paid: creditBalance.credits.paid,
            })
          );
        } catch (error) {
          // Failed to refresh credit balance
        }
      }

      // Show completion toast (simplified approach with built-in close button)
      toast({
        title: "Bulk Skip Trace Complete!",
        description: `${successful} successful${
          failed > 0 ? `, ${failed} failed` : ""
        }${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}`,
        status: successful > 0 ? "success" : "warning",
        duration: 8000,
        isClosable: true,
        position: "top-right",
        variant: "solid",
      });
    } catch (error) {
      // Background bulk skip trace error
      setBulkSkipTraceProgress((prev) => ({
        ...prev,
        isRunning: false,
      }));

      toast({
        title: "Skip Trace Error",
        description: "An error occurred during background processing",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    }
  }, [
    selectedBuyers,
    filteredBuyers,
    isBuyerAlreadyTraced,
    bulkSkipTraceBreakdown,
    user?.user_id,
    dispatch,
    toast,
  ]);

  // Buyers Functions
  const handleBuyerClick = (buyer: Buyer) => {
    // Store the buyer in state and open the drawer
    setSelectedBuyer(buyer);
  };

  const toggleBuyerSelection = (buyerId: string) => {
    setSelectedBuyers((prev) =>
      prev.includes(buyerId)
        ? prev.filter((id) => id !== buyerId)
        : [...prev, buyerId]
    );
  };

  const toggleSelectAll = () => {
    const filteredBuyerIds = filteredBuyers.map(
      (buyer, idx) => buyer.id || idx.toString()
    );
    const allFilteredSelected = filteredBuyerIds.every((id) =>
      selectedBuyers.includes(id)
    );

    if (allFilteredSelected) {
      // Remove all filtered buyers from selection
      setSelectedBuyers((prev) =>
        prev.filter((id) => !filteredBuyerIds.includes(id))
      );
    } else {
      // Add all filtered buyers to selection
      setSelectedBuyers((prev) => [
        ...prev,
        ...filteredBuyerIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  // Utility function to parse address into components
  const parseAddress = (address: string) => {
    // Basic parsing - this could be enhanced
    const parts = address.split(",").map((part) => part.trim());
    const city = parts.length > 1 ? parts[parts.length - 2] : "";
    const stateZip = parts.length > 0 ? parts[parts.length - 1] : "";
    const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);

    return {
      city: city || "N/A",
      state: stateZipMatch ? stateZipMatch[1] : "N/A",
      zip: stateZipMatch ? stateZipMatch[2] : "N/A",
    };
  };

  // Generate CSV content for selected buyers
  const generateBuyersCSV = () => {
    const selectedBuyersList = filteredBuyers.filter((buyer) =>
      selectedBuyers.includes(buyer.id || "unknown")
    );

    if (selectedBuyersList.length === 0)
      return { csvContent: "", propertyStreetAddress: "" };

    // Property street address for filename
    const propertyStreetAddress = selectedAddress?.street1
      ? selectedAddress.street1.replace(/[^a-zA-Z0-9]/g, "_")
      : "property";

    // Pre-scan all selected buyers to find maximum contact counts for dynamic columns
    const maxCounts = selectedBuyersList.reduce(
      (max, buyer) => {
        // Find skip trace result for this buyer (same logic as used below)
        const buyerSkipTraceResult = skipTraceResults.find((result) => {
          const nameMatch =
            result.buyerName?.toLowerCase().trim() ===
            buyer.name?.toLowerCase().trim();
          const idMatch =
            result.buyerId &&
            buyer.id &&
            (result.buyerId === buyer.id ||
              result.buyerId === buyer.id.toString() ||
              result.buyerId.toString() === buyer.id.toString());
          const userMatch = result.userId === user?.user_id?.toString();
          return userMatch && (nameMatch || idMatch);
        });

        if (buyerSkipTraceResult) {
          // Count phones
          const phoneCount = buyerSkipTraceResult.phones?.length || 0;

          // Count emails
          const emailCount = buyerSkipTraceResult.emails?.length || 0;

          // Count owner names (prioritize matchedOwners)
          let ownerCount = 0;
          if (
            buyerSkipTraceResult.matchedOwners &&
            Array.isArray(buyerSkipTraceResult.matchedOwners)
          ) {
            ownerCount = buyerSkipTraceResult.matchedOwners.length;
          } else if (
            (buyerSkipTraceResult as any).ownerNames &&
            Array.isArray((buyerSkipTraceResult as any).ownerNames)
          ) {
            ownerCount = (buyerSkipTraceResult as any).ownerNames.length;
          } else if (
            (buyerSkipTraceResult as any).owner_names &&
            Array.isArray((buyerSkipTraceResult as any).owner_names)
          ) {
            ownerCount = (buyerSkipTraceResult as any).owner_names.length;
          } else if (
            (buyerSkipTraceResult as any).names &&
            Array.isArray((buyerSkipTraceResult as any).names)
          ) {
            ownerCount = (buyerSkipTraceResult as any).names.length;
          }

          return {
            phones: Math.max(max.phones, phoneCount),
            emails: Math.max(max.emails, emailCount),
            owners: Math.max(max.owners, ownerCount),
          };
        }

        return max;
      },
      { phones: 0, emails: 0, owners: 0 }
    );

    // Ensure minimum counts for practical use (at least 1 of each type)
    const finalMaxCounts = {
      phones: Math.max(maxCounts.phones, 1),
      emails: Math.max(maxCounts.emails, 1),
      owners: Math.max(maxCounts.owners, 1),
    };

    // Generate dynamic headers based on actual contact counts
    const baseHeaders = [
      "Subject Property",
      "In-Network Buyer",
      "Buyer Name",
      "Mailing Address",
      "Mailing Unit #",
      "Mailing City",
      "Mailing State",
      "Mailing Zip",
      "Likely Hood To Purchase",
      "Purchase Price Ranges",
      "Recent Purchase Count",
      "Last Buy",
      "Avg Zip Price",
      "Is Skip Traced",
    ];

    // Generate phone number columns with verification status
    const phoneHeaders = [];
    for (let i = 0; i < finalMaxCounts.phones; i++) {
      phoneHeaders.push(`Phone Number ${i + 1}`);
      phoneHeaders.push(`Phone Number ${i + 1} Status`);
    }

    // Generate email address columns with verification status
    const emailHeaders = [];
    for (let i = 0; i < finalMaxCounts.emails; i++) {
      emailHeaders.push(`Email Address ${i + 1}`);
      emailHeaders.push(`Email Address ${i + 1} Status`);
    }

    // Generate owner name columns
    const ownerHeaders = Array.from(
      { length: finalMaxCounts.owners },
      (_, i) => `Owner Name ${i + 1}`
    );

    // Combine all headers
    const headers = [
      ...baseHeaders,
      ...phoneHeaders,
      ...emailHeaders,
      ...ownerHeaders,
    ];

    // Property row (appears once at top with merged cells effect)
    const propertyRow = [
      selectedAddress?.formattedAddress || "N/A",
      ...Array(headers.length - 1).fill(""), // Fill remaining columns with empty strings
    ];

    // Empty row for spacing (like table separator)
    const separatorRow = Array(headers.length).fill("");

    // Buyer rows
    const buyerRows = selectedBuyersList.map((buyer) => {
      const addressComponents = parseAddress(buyer.address);
      const likelihoodText = getLikelihoodFromScore(buyer.score || 0).text;
      const validPurchaseHistory = Array.isArray(buyer.purchase_history)
        ? buyer.purchase_history.filter(
            (p) => p?.address && p.address.trim() !== ""
          )
        : [];

      const recentPurchaseCount = validPurchaseHistory.length.toString();
      const buyerMetrics = calculateBuyerMetrics(
        buyer.purchase_history || [],
        propertyDetails?.zip_code || ""
      );
      const lastBuy = buyerMetrics.lastBuyDate || "N/A";
      const avgZipPrice = buyerMetrics.avgZipPrice
        ? formatCurrency(buyerMetrics.avgZipPrice)
        : "N/A";

      // Find skip trace result for this buyer
      const buyerSkipTraceResult = skipTraceResults.find((result) => {
        // Match by buyer name (most reliable)
        const nameMatch =
          result.buyerName?.toLowerCase().trim() ===
          buyer.name?.toLowerCase().trim();

        // Match by buyer ID if both exist
        const idMatch =
          result.buyerId &&
          buyer.id &&
          (result.buyerId === buyer.id ||
            result.buyerId === buyer.id.toString() ||
            result.buyerId.toString() === buyer.id.toString());

        // Must be for current user
        const userMatch = result.userId === user?.user_id?.toString();

        return userMatch && (nameMatch || idMatch);
      });

      // Extract skip trace data
      const isSkipTraced = buyerSkipTraceResult ? "Yes" : "No";

      // Extract phone numbers and verification status dynamically
      const phones = buyerSkipTraceResult?.phones || [];
      const phoneValues = [];
      for (let i = 0; i < finalMaxCounts.phones; i++) {
        const phone = phones[i];
        const phoneNumber = phone?.number || phone || "";

        // Safe access to verification property using bracket notation
        const verification =
          typeof phone === "object" && phone && "verification" in phone
            ? (phone as any)["verification"]
            : null;
        const status = verification?.status || "unverified";

        phoneValues.push(phoneNumber);
        phoneValues.push(status);
      }

      // Extract email addresses and verification status dynamically
      const emails = buyerSkipTraceResult?.emails || [];
      const emailValues = [];
      for (let i = 0; i < finalMaxCounts.emails; i++) {
        const email = emails[i];
        const emailAddress = email?.email || email || "";

        // Safe access to verification property using bracket notation
        const verification =
          typeof email === "object" && email && "verification" in email
            ? (email as any)["verification"]
            : null;
        const status = verification?.status || "unverified";

        emailValues.push(emailAddress);
        emailValues.push(status);
      }

      // Handle owner names - check multiple possible structures and extract dynamically
      let ownerNamesArray: string[] = [];
      if (buyerSkipTraceResult) {
        // Priority 1: Use standardized matchedOwners array (preferred format)
        if (
          buyerSkipTraceResult.matchedOwners &&
          Array.isArray(buyerSkipTraceResult.matchedOwners) &&
          buyerSkipTraceResult.matchedOwners.length > 0
        ) {
          ownerNamesArray = buyerSkipTraceResult.matchedOwners
            .map((o) => {
              // Try different name extraction methods
              let name = "";
              if (o.name) {
                name = o.name;
              } else if (o.owner?.person_name) {
                const first = o.owner.person_name.first_name || "";
                const last = o.owner.person_name.last_name || "";
                name = `${first} ${last}`.trim();
              } else if ((o as any).first_name || (o as any).last_name) {
                const first = (o as any).first_name || "";
                const last = (o as any).last_name || "";
                name = `${first} ${last}`.trim();
              }
              return name;
            })
            .filter((name) => name && name.trim().length > 0);
        }
        // Priority 2: Legacy formats (fallback)
        else if (
          (buyerSkipTraceResult as any).ownerNames &&
          Array.isArray((buyerSkipTraceResult as any).ownerNames)
        ) {
          ownerNamesArray = (buyerSkipTraceResult as any).ownerNames.filter(
            (name: any) => name && typeof name === "string"
          );
        } else if (
          (buyerSkipTraceResult as any).owner_names &&
          Array.isArray((buyerSkipTraceResult as any).owner_names)
        ) {
          ownerNamesArray = (buyerSkipTraceResult as any).owner_names.filter(
            (name: any) => name && typeof name === "string"
          );
        } else if (
          (buyerSkipTraceResult as any).names &&
          Array.isArray((buyerSkipTraceResult as any).names)
        ) {
          ownerNamesArray = (buyerSkipTraceResult as any).names.filter(
            (name: any) => name && typeof name === "string"
          );
        } else {
          // Last resort: search for any array property that might contain names
          const result = buyerSkipTraceResult as any;
          for (const [key, value] of Object.entries(result)) {
            if (
              Array.isArray(value) &&
              value.length > 0 &&
              typeof value[0] === "string" &&
              key.toLowerCase().includes("name")
            ) {
              ownerNamesArray = value.filter(
                (name: any) => name && typeof name === "string"
              );

              break;
            }
          }
        }
      }

      // Extract owner names dynamically
      const ownerValues = Array.from(
        { length: finalMaxCounts.owners },
        (_, i) => ownerNamesArray[i] || ""
      );

      return [
        "", // Subject property only on first row
        isInNetworkBuyer(buyer.name) ? "Yes" : "No",
        buyer.name || "N/A",
        buyer.address || "N/A",
        "N/A", // Mailing Unit # - placeholder
        addressComponents.city,
        addressComponents.state,
        addressComponents.zip,
        likelihoodText,
        buyer.priceRange || "N/A",
        recentPurchaseCount,
        lastBuy,
        avgZipPrice,
        isSkipTraced,
        ...phoneValues, // Spread phone numbers dynamically
        ...emailValues, // Spread email addresses dynamically
        ...ownerValues, // Spread owner names dynamically
      ];
    });

    // Combine all rows with proper structure
    const allRows = [headers, propertyRow, separatorRow, ...buyerRows];

    // Convert to CSV string
    const csvContent = allRows
      .map((row) =>
        row
          .map((field) => `"${field.toString().replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    return { csvContent, propertyStreetAddress };
  };

  // Download CSV file
  const handleDownloadBuyersList = async () => {
    // If Redux store is empty or has very few results, load fresh data first
    if (skipTraceResults.length === 0 && user?.user_id && user.isLoggedIn) {
      try {
        const userId = parseInt(user.user_id.toString(), 10);
        const historyResponse = await skipTraceService.getSkipTraceHistory(
          userId,
          100
        );

        if (historyResponse.success && historyResponse.results) {
          // Add results to Redux store
          historyResponse.results.forEach((result: any) => {
            const resultWithUserId = {
              ...result,
              userId: user?.user_id?.toString(),
            };
            dispatch(addSkipTraceResult(resultWithUserId));
          });
          // Wait a moment for Redux to update
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        // Continue with CSV generation even if loading fails
      }
    }

    const result = generateBuyersCSV();

    if (!result.csvContent) {
      alert("Please select buyers to download.");
      return;
    }

    // Create filename with current date
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const filename = `rehouzd_buyers_list_for_${result.propertyStreetAddress}_${currentDate}.csv`;

    // Create and trigger download
    const blob = new Blob([result.csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveEstimate = async () => {
    // Only logged-in users can save estimates
    if (!user.isLoggedIn) {
      setSaveErrorMessage("Please log in to save estimates.");
      setTimeout(() => {
        setSaveErrorMessage(null);
      }, 5000);
      return;
    }

    // Validate user_id
    const userId = parseInt(user.user_id, 10);
    if (!user.user_id || isNaN(userId)) {
      setSaveErrorMessage("User information is invalid. Please log in again.");
      setTimeout(() => {
        setSaveErrorMessage(null);
      }, 5000);
      return;
    }

    setIsSaving(true);

    try {
      // Get the current property data and address
      const property = propertyState.properties[0] || {};
      const address = selectedAddress?.formattedAddress || "";

      if (!address) {
        throw new Error("Property address not found");
      }

      // Get offer range values from Redux (preferred method)
      let offerRangeLow = underwriteState.offerRange.low;
      let offerRangeHigh = underwriteState.offerRange.high;

      // If offer range is not set in Redux, calculate it using the utility function
      if (offerRangeLow === 0 || offerRangeHigh === 0) {
        // Determine property condition
        const isFixerProperty =
          addressState.condition?.toLowerCase() === "outdated" ||
          addressState.condition?.toLowerCase() === "fixer";

        // Determine if property is standard based on condition
        const isStandardProperty =
          addressState.condition?.toLowerCase() === "standard";

        // Prepare data for the utility function
        const strategy = activeInvestmentTab === 0 ? "rent" : "flip";

        const rentData = {
          afterRepairValue: underwriteState.rent.afterRepairValue,

          highRehab: rentUnderwriteValues.highRehab,
        };

        const flipData = {
          estimatedOffer: underwriteState.flip.estimatedOffer,

          highRehab: flipUnderwriteValues.highRehab,
          holdingCosts: flipUnderwriteValues.holdingCosts,
        };

        // Use the utility function to calculate offer range
        const offerRange = calculateOfferRange(
          strategy,
          isFixerProperty,
          isStandardProperty,
          rentData,
          flipData
        );

        offerRangeLow = offerRange.low;
        offerRangeHigh = offerRange.high;

        // Update the offer range in Redux
        dispatch(
          updateOfferRange({
            low: offerRangeLow,
            high: offerRangeHigh,
          })
        );
      }

      // Prepare optimized property data (exclude large neighborhood data)
      const optimizedProperty = property
        ? {
            addressData: property.addressData,
            radiusUsed: property.radiusUsed,
            usedFallbackCriteria: property.usedFallbackCriteria,
            neighborhoodPropertiesCount: property.neighborhoodProperties,
            // Only save count of properties, not the full data
            allPropertiesCount: property.allProperties?.length || 0,
          }
        : null;

      // Prepare estimate data with all fields inside the estimate_data object
      const estimateData = {
        user_id: userId, // Use the validated number
        property_address: address,
        estimate_data: {
          property: optimizedProperty,
          address: selectedAddress,
          addressState: addressState,
          timestamp: new Date().toISOString(),
          offer_range_low: offerRangeLow,
          offer_range_high: offerRangeHigh,
          rent_underwrite_values: rentUnderwriteValues,
          flip_underwrite_values: flipUnderwriteValues,
          active_investment_strategy:
            activeInvestmentTab === 0 ? "rent" : "flip",
          notes: "",
        },
      };

      // Send the request to save the estimate
      const response = await fetch(`${config.apiUrl}/api/saved-estimates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to save estimate (${response.status})`
        );
      }

      setSaveSuccessMessage("Your estimate has been saved successfully.");
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);

      // Removed automatic navigation to saved estimates page
      // Users will stay on the current page after saving
    } catch (error) {
      console.error("Error saving estimate:", error);

      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save estimate. Please try again."
      );
      setTimeout(() => {
        setSaveErrorMessage(null);
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize custom order if needed
  useEffect(() => {
    // Only initialize custom order if it's empty and we're not actively sorting
    if (
      customPropertyOrder.length === 0 &&
      neighborhoodProperties.length > 0 &&
      !isSortingActive
    ) {
      const initialOrder = neighborhoodProperties
        .map((p: any) => p.id || "")
        .filter((id: any) => id !== "");
      setCustomPropertyOrder(initialOrder);
    }
  }, [neighborhoodProperties, customPropertyOrder.length, isSortingActive]);

  // Apply custom ordering to filtered properties
  const applyCustomOrder = useCallback(
    (properties: RelatedProperty[]) => {
      if (customPropertyOrder.length === 0) {
        return properties;
      }

      // Create a map of property IDs to properties for fast lookup
      const propertyMap = new Map<string | number, RelatedProperty>(
        properties.map((p) => [p.id || "", p])
      );

      // First, get properties in custom order that exist in filtered properties
      const orderedProperties = customPropertyOrder
        .map((id) => propertyMap.get(id))
        .filter((p) => p !== undefined) as RelatedProperty[];

      // Add any new properties that don't have an order yet
      const orderedIds = new Set(customPropertyOrder);
      const newProperties = properties.filter(
        (p) => p.id && !orderedIds.has(p.id)
      );

      return [...orderedProperties, ...newProperties];
    },
    [customPropertyOrder]
  );

  // Handle drag start
  const handleDragStart =
    (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
      setDraggedItemIndex(index);
      // Set the drag image to be the row
      const row = propertyTableRef.current?.querySelectorAll("tbody tr")[index];
      if (row) {
        // Make semi-transparent during drag
        const rowClone = row.cloneNode(true) as HTMLElement;
        rowClone.style.opacity = "0.5";
        document.body.appendChild(rowClone);
        e.dataTransfer.setDragImage(rowClone, 0, 0);
        setTimeout(() => {
          document.body.removeChild(rowClone);
        }, 0);
      }
      e.dataTransfer.setData("text/plain", index.toString());
    };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault(); // Allow drop
    e.currentTarget.style.borderBottom = "2px solid green";
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.borderBottom = "";
  };

  // Handle drop
  const handleDrop =
    (targetIndex: number) => (e: React.DragEvent<HTMLTableRowElement>) => {
      e.preventDefault();
      e.currentTarget.style.borderBottom = "";

      if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
        return;
      }

      // Create a new array with the items reordered
      const newProperties = [...draggableProperties];
      const [movedItem] = newProperties.splice(draggedItemIndex, 1);
      newProperties.splice(targetIndex, 0, movedItem);

      // Update the draggable properties
      setDraggableProperties(newProperties);

      // Update the custom order to persist across filter changes
      const newOrder = newProperties
        .map((p) => p.id || "")
        .filter((id) => id !== "");
      setCustomPropertyOrder(newOrder);

      // Turn off active sorting when manual reordering is used
      setIsSortingActive(false);

      setDraggedItemIndex(null);
    };

  // Debounced buyer ranking to prevent excessive API calls
  const [rankingTimeout, setRankingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const rankBuyersRef = useRef<(() => Promise<void>) | null>(null);

  // Function to rank buyers using the API with already fetched buyers
  const rankBuyersLocally = useCallback(async () => {
    // Clear any existing timeout
    if (rankingTimeout) {
      clearTimeout(rankingTimeout);
    }

    // Set a new timeout to debounce the ranking
    const timeout = setTimeout(async () => {
      // Early exit if sliders are still loading
      if (isLoadingSliderValues) {
        return;
      }

      // Get the estimated price (allow $0 offers)
      const estimatedPrice = underwriteState?.buyerEstimatedPrice?.buyerEstimatedOffer;
      if (
        estimatedPrice === undefined ||
        estimatedPrice === null ||
        estimatedPrice < 0
      ) {
        return;
      }

      setBuyersLoading(true);
      setBuyersError(null);
      try {
        // Get the current property data for matching
        const property = propertyState.properties[0] || null;
        const matchingPropertyDetails = property?.addressData?.items?.[0] || null;

        // Extract property attributes needed for matching
        const propertyBedrooms = matchingPropertyDetails?.bedrooms || 0;
        const propertyBathrooms = matchingPropertyDetails?.bathrooms || 0;
        const propertySqFt = matchingPropertyDetails?.square_footage || 0;
        const propertyYear = matchingPropertyDetails?.year_built || 0;
        const propertyZipCode = matchingPropertyDetails?.zip_code || "";
        const propertyCity = matchingPropertyDetails?.city || "";
        const propertyCounty = matchingPropertyDetails?.county || "";

        // Prepare property data for ranking API
        const propertyData = {
          bedrooms: propertyBedrooms,
          bathrooms: propertyBathrooms,
          square_footage: propertySqFt,
          year_built: propertyYear,
          zip_code: propertyZipCode,
          city: propertyCity,
          county: propertyCounty,
          estimated_price: estimatedPrice,
          latitude: matchingPropertyDetails?.latitude,
          longitude: matchingPropertyDetails?.longitude,
        };

        // Use the existing ranked endpoint which fetches and ranks buyers on the backend
        const response = await fetch(
          `${config.apiUrl}/api/buyer-matching/ranked`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(propertyData),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ranked buyers: ${response.status}`);
        }

        const responseData = await response.json();

        if (!responseData.success) {
          throw new Error(
            responseData.message || "Failed to fetch ranked buyers"
          );
        }

        // Update buyers with ranked results
        const rankedBuyers = responseData.data;

        // Sort by score in descending order
        const sortedBuyers = [...rankedBuyers].sort(
          (a, b) => b.score - a.score
        );

        setBuyers(sortedBuyers);

        // Also dispatch to Redux store so other components can access
        dispatch(setBuyersRedux(sortedBuyers));
      } catch (error) {
        console.error("[rankBuyersLocally] Error fetching buyers:", error);
        setBuyersError("Failed to load buyers. Please try again.");

        // Clear buyers in Redux store on error
        dispatch(setBuyersRedux([]));
      } finally {
        setBuyersLoading(false);
      }
    }, 500); // 500ms debounce delay

    setRankingTimeout(timeout);
  }, [propertyState, underwriteState, isLoadingSliderValues]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (rankingTimeout) {
        clearTimeout(rankingTimeout);
      }
    };
  }, [rankingTimeout]);

  // Clear buyers in Redux when the selected address changes or component mounts
  useEffect(() => {
    // Clear buyers when address changes to prevent showing old data
    setBuyers([]);
    setBuyersError(null);
    setSelectedBuyers([]);
    dispatch(setBuyersRedux([]));

    // Cleanup function to clear buyers when component unmounts
    return () => {
      dispatch(setBuyersRedux([]));
    };
  }, [selectedAddress?.formattedAddress, dispatch]);

  // Enhanced onOpenBuyersDrawer that fetches data when drawer opens
  const onOpenBuyersDrawerWithFetch = useCallback(() => {
    // Fetch buyers if data is loaded (including $0 offers)
    const hasValidData =
      !isLoadingSliderValues && underwriteState.offerRange.low >= 0;
    if (hasValidData) {
      rankBuyersLocally();
    } else {
    }
    onOpenBuyersDrawer();
  }, [
    onOpenBuyersDrawer,
    isLoadingSliderValues,
    underwriteState.offerRange.low,
  ]);

  // Rank buyers when offer range changes, but only after sliders are loaded
  useEffect(() => {
    // Rank buyers when offer range is available (including $0) AND sliders are fully loaded
    const hasOfferRange = underwriteState.offerRange.low >= 0;
    const slidersAreLoaded = !isLoadingSliderValues;

    // Also check that we have actual calculated values, not just defaults
    const hasActualValues =
      (activeInvestmentTab === 0 &&
        underwriteState.rent.afterRepairValue > 0) ||
      (activeInvestmentTab === 1 && underwriteState.flip.afterRepairValue > 0);

    if (
      hasOfferRange &&
      slidersAreLoaded &&
      hasActualValues &&
      propertyState.properties.length > 0
    ) {
      rankBuyersLocally();
    } else {
    }
  }, [
    underwriteState.offerRange.low,
    underwriteState.offerRange.high,
    isLoadingSliderValues,
    underwriteState.rent.afterRepairValue,
    underwriteState.flip.afterRepairValue,
    activeInvestmentTab,
    propertyState.properties,
  ]);

  const getLikelihoodFromScore = (score: number) => {
    if (score > 90) {
      return {
        text: "Most likely",
        colorScheme: "green",
        gradient: "linear(to-r, #0a3c34, #b6e78d)",
      };
    } else if (score > 60) {
      return {
        text: "Likely",
        colorScheme: "green",
        gradient: "linear(to-r, #0a3c34, #b6e78d)",
      };
    } else {
      return {
        text: "Less likely",
        colorScheme: "yellow",
        gradient: "linear(to-r, #f7941e, #ffe459)",
      };
    }
  };

  // Handle tab change and update Redux active strategy
  const handleInvestmentTabChange = (index: number) => {
    setActiveInvestmentTab(index);
    const strategy = index === 0 ? "rent" : "flip";
    dispatch(setActiveStrategy(strategy));
  };

  // 1. Add filter state at the top of the component (after hooks, before logic)
  const [filterPriceMin, setFilterPriceMin] = useState<number | "">("");
  const [filterPriceMax, setFilterPriceMax] = useState<number | "">("");
  const [filterSqftMin, setFilterSqftMin] = useState<number | "">("");
  const [filterSqftMax, setFilterSqftMax] = useState<number | "">("");
  const [filterYearMin, setFilterYearMin] = useState<number | "">("");
  const [filterYearMax, setFilterYearMax] = useState<number | "">("");
  const [filterBedrooms, setFilterBedrooms] = useState<number[]>([]);
  const [filterBathrooms, setFilterBathrooms] = useState<number[]>([]);
  const [filterDistanceMin, setFilterDistanceMin] = useState<number | "">("");
  const [filterDistanceMax, setFilterDistanceMax] = useState<number | "">("");
  const [filterSoldStart, setFilterSoldStart] = useState<string>("today");
  const [filterSoldEnd, setFilterSoldEnd] = useState<string>("12_month");

  // 2. Add filter logic for Neighborhood Comps
  const getSoldDateRange = () => {
    const now = new Date();
    const parseMonths = (val: string) => {
      if (val === "today") return 0;
      const match = val.match(/^([0-9]+)_month/);
      return match ? parseInt(match[1], 10) : 0;
    };
    const startMonths = parseMonths(filterSoldStart);
    const endMonths = parseMonths(filterSoldEnd);

    // If start and end are the same, create a range for the entire month
    if (startMonths === endMonths) {
      const targetMonth = new Date(now);
      targetMonth.setMonth(now.getMonth() - startMonths);

      // Start of the target month
      const startDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        1
      );

      // End of the target month
      const endDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      return { startDate, endDate };
    } else {
      // Different months - use the original logic
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - endMonths);
      const endDate = new Date(now);
      endDate.setMonth(now.getMonth() - startMonths);
      return { startDate, endDate };
    }
  };
  const filteredNeighborhoodProperties = useMemo(() => {
    if (activeMainCompsTab !== 0) return filteredProperties;
    const { startDate, endDate } = getSoldDateRange();

    const filtered = filteredProperties.filter((p: any) => {
      if (
        filterPriceMin !== "" &&
        (p.price ?? 0) < parseFloat(String(filterPriceMin))
      )
        return false;
      if (
        filterPriceMax !== "" &&
        (p.price ?? 0) > parseFloat(String(filterPriceMax))
      )
        return false;
      if (
        filterSqftMin !== "" &&
        (p.squareFootage ?? 0) < parseFloat(String(filterSqftMin))
      )
        return false;
      if (
        filterSqftMax !== "" &&
        (p.squareFootage ?? 0) > parseFloat(String(filterSqftMax))
      )
        return false;
      if (
        filterYearMin !== "" &&
        (p.yearBuilt ?? 0) < parseFloat(String(filterYearMin))
      )
        return false;
      if (
        filterYearMax !== "" &&
        (p.yearBuilt ?? 0) > parseFloat(String(filterYearMax))
      )
        return false;
      if (
        filterBedrooms.length > 0 &&
        !filterBedrooms.some((b) => (p.bedrooms ?? 0) >= b)
      )
        return false;
      if (
        filterBathrooms.length > 0 &&
        !filterBathrooms.some((b) => (p.bathrooms ?? 0) >= b)
      )
        return false;
      if (
        filterDistanceMin !== "" &&
        Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10 <
          parseFloat(String(filterDistanceMin))
      ) {
        return false;
      }
      if (
        filterDistanceMax !== "" &&
        Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10 >
          parseFloat(String(filterDistanceMax))
      ) {
        return false;
      }
      // Handle exact distance match when min and max are the same
      if (
        filterDistanceMin !== "" &&
        filterDistanceMax !== "" &&
        filterDistanceMin === filterDistanceMax
      ) {
        const propertyDistance =
          Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10;
        const filterDistance = parseFloat(String(filterDistanceMin));
        // Use rounded values for exact matches to match UI display
        if (propertyDistance !== filterDistance) {
          return false;
        }
      }
      if (p.soldDate) {
        const sold = new Date(p.soldDate);
        if (sold < startDate || sold > endDate) {
          return false;
        }
      }
      return true;
    });

    return filtered;
  }, [
    filteredProperties,
    filterPriceMin,
    filterPriceMax,
    filterSqftMin,
    filterSqftMax,
    filterYearMin,
    filterYearMax,
    filterBedrooms,
    filterBathrooms,
    filterDistanceMin,
    filterDistanceMax,
    filterSoldStart,
    filterSoldEnd,
    activeMainCompsTab,
  ]);

  // Generate unique options for beds and baths from filteredNeighborhoodProperties
  const uniqueBedrooms = useMemo(() => {
    const set = new Set(
      filteredNeighborhoodProperties
        .map((p: any) => p.bedrooms)
        .filter((b: any) => b !== undefined && b !== null)
    );
    return Array.from(set).sort((a: any, b: any) => a - b) as number[];
  }, [filteredNeighborhoodProperties]);
  const uniqueBathrooms = useMemo(() => {
    const set = new Set(
      filteredNeighborhoodProperties
        .map((p: any) => p.bathrooms)
        .filter((b: any) => b !== undefined && b !== null)
    );
    return Array.from(set).sort((a: any, b: any) => a - b) as number[];
  }, [filteredNeighborhoodProperties]);

  // Update draggable properties when filtered properties change
  useEffect(() => {
    // Use filteredNeighborhoodProperties when on Neighborhood Comps tab (activeMainCompsTab === 0)
    // Otherwise use the original filteredProperties
    const propertiesToUse =
      activeMainCompsTab === 0
        ? filteredNeighborhoodProperties
        : filteredProperties;
    const orderedProperties = applyCustomOrder(propertiesToUse);
    setDraggableProperties(orderedProperties);
  }, [
    filteredProperties,
    filteredNeighborhoodProperties,
    applyCustomOrder,
    sortOrder,
    activeMainCompsTab,
  ]);

  // Add this inside the EstimatedOfferStep component, above the JSX return
  const triggerRecalculation = async () => {
    setIsLoadingSliderValues(true);
    try {
      const address = selectedAddress?.formattedAddress || "";
      if (address && addressState.condition) {
        const currentNeighborhoodProperties =
          propertyState.properties[0]?.neighborhoodProperties || [];
        const addressData =
          propertyState.properties[0]?.addressData?.items?.[0] || null;
        const squareFootage = addressData?.square_footage || 0;

        const enhancedAddressData = addressData
          ? {
              ...addressData,
              condition: addressState.condition,
            }
          : {
              condition: addressState.condition,
              square_footage: squareFootage,
            };

        const values = await getPropertyUnderwriteValues(
          address,
          currentNeighborhoodProperties,
          enhancedAddressData
        );

        setRentUnderwriteValues({
          ...values.rent,
          defaultHighRehab: values.rent.highRehab,
          isUsingCustomHighRehab: false,
        });
        setFlipUnderwriteValues({
          ...values.flip,
          defaultHighRehab: values.flip.highRehab,
          isUsingCustomHighRehab: false,
        });

        // Update Redux store with new underwrite values
        dispatch(updateRentDefaultHighRehab(values.rent.highRehab));
        dispatch(updateFlipDefaultHighRehab(values.flip.highRehab));
        dispatch(
          setActiveStrategy(activeInvestmentTab === 0 ? "rent" : "flip")
        );
        dispatch(
          updateRentValues({
            rent: values.rent.rent,
            expense: values.rent.expense,
            capRate: values.rent.capRate,

            highRehab: values.rent.highRehab,
            afterRepairValue: values.rent.afterRepairValue,
            defaultHighRehab: values.rent.highRehab,
            customHighRehab: 0,
            isUsingCustomHighRehab: false,
          })
        );
        dispatch(
          updateFlipValues({
            sellingCosts: values.flip.sellingCosts,
            holdingCosts: values.flip.holdingCosts,
            margin: values.flip.margin,

            highRehab: values.flip.highRehab,
            afterRepairValue: values.flip.afterRepairValue,
            estimatedOffer: values.flip.estimatedOffer,
            defaultHighRehab: values.flip.highRehab,
            customHighRehab: 0,
            isUsingCustomHighRehab: false,
          })
        );
      }
    } catch (error) {
      console.error("Failed to reload underwrite values:", error);
    } finally {
      setIsLoadingSliderValues(false);
    }
  };

  return (
    <Box w="100%">
      {/* Heading Box */}
      <Box mb={4} p={4} pt={0} mt={0}>
        <Heading size="lg" color={textPrimary}>
          Estimated Offer
        </Heading>
        <Text color={textSecondary} mt={1}>
          Valuation and market comparison for your property
        </Text>
      </Box>

      {/* Property details card */}
      <PropertyHeaderCard
        selectedAddress={selectedAddress}
        googleApiKey={googleApiKey}
        propertyDetails={propertyDetailsForHeader}
        homesSoldCount={actualHomesSoldCount || soldPropertiesCount}
        interestedBuyersCount={buyers.length}
        selectedCondition={addressState.condition}
        onPropertyUpdate={async (isComplete = false, expectedDetails) => {
          if (onPropertyUpdate) {
            onPropertyUpdate(isComplete, expectedDetails);
          }
          if (!isComplete) {
            // Make API call to update property data with new details
            try {
              const address = selectedAddress?.formattedAddress || "";
              if (address && addressState.condition) {
                // Use the expected details passed from PropertyHeaderCard instead of Redux
                const updatedPropertyDetails = expectedDetails
                  ? {
                      bedrooms: expectedDetails.beds,
                      bathrooms: expectedDetails.baths,
                      square_footage: expectedDetails.sqft,
                      year_built: expectedDetails.year,
                    }
                  : addressReduxState.updatedPropertyDetails;

                if (updatedPropertyDetails) {
                  // Make API call to update property data
                  const response = await fetch(
                    `${config.apiUrl}/api/property/property-data`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        address: selectedAddress,
                        updatedPropertyDetails: updatedPropertyDetails,
                        condition: addressState.condition,
                      }),
                    }
                  );

                  if (response.ok) {
                    const apiData = await response.json();

                    // Map the comparable properties with proper event details
                    const mappedComparableProperties = (
                      apiData.comparableProperties || []
                    ).map((prop: any) => {
                      const price =
                        prop.price ||
                        (prop.eventDetails && prop.eventDetails.price) ||
                        prop.list_price ||
                        prop.sale_price ||
                        0;

                      let listingStatus = "Unknown";
                      if (prop.eventDetails && prop.eventDetails.event_name) {
                        listingStatus = prop.eventDetails.event_name;
                        if (listingStatus === "PRICE_CHANGE") {
                          listingStatus = "RENTAL";
                        }
                      } else if (prop.status) {
                        listingStatus = prop.status;
                      }

                      return {
                        id: prop.id || prop.parcl_property_id || Math.random(),
                        address: prop.address || "Unknown Address",
                        city: prop.city || selectedAddress?.city,
                        state:
                          prop.state_abbreviation ||
                          prop.state ||
                          selectedAddress?.state,
                        zipCode:
                          prop.zip_code || prop.zipCode || selectedAddress?.zip,
                        price: price,
                        squareFootage:
                          prop.square_footage || prop.squareFootage || 0,
                        bedrooms: prop.bedrooms || 0,
                        bathrooms: prop.bathrooms || 0,
                        yearBuilt: prop.year_built || prop.yearBuilt || 0,
                        distance: prop.distance || 0,
                        status: listingStatus,
                        soldDate: prop.eventDetails?.event_date || "",
                        latitude: prop.latitude || 0,
                        longitude: prop.longitude || 0,
                        similarityScore: prop.similarityScore || 0,
                        isOutlier: prop.isOutlier || false,
                        eventDetails: prop.eventDetails || null,
                      };
                    });

                    const mappedAllProperties = (
                      apiData.allProperties || []
                    ).map((prop: any) => {
                      const price =
                        prop.price ||
                        (prop.eventDetails && prop.eventDetails.price) ||
                        prop.list_price ||
                        prop.sale_price ||
                        0;

                      let listingStatus = "Unknown";
                      if (prop.eventDetails && prop.eventDetails.event_name) {
                        listingStatus = prop.eventDetails.event_name;
                        if (listingStatus === "PRICE_CHANGE") {
                          listingStatus = "RENTAL";
                        }
                      } else if (prop.status) {
                        listingStatus = prop.status;
                      }

                      return {
                        id: prop.id || prop.parcl_property_id || Math.random(),
                        address: prop.address || "Unknown Address",
                        city: prop.city || selectedAddress?.city,
                        state:
                          prop.state_abbreviation ||
                          prop.state ||
                          selectedAddress?.state,
                        zipCode:
                          prop.zip_code || prop.zipCode || selectedAddress?.zip,
                        price: price,
                        squareFootage:
                          prop.square_footage || prop.squareFootage || 0,
                        bedrooms: prop.bedrooms || 0,
                        bathrooms: prop.bathrooms || 0,
                        yearBuilt: prop.year_built || prop.yearBuilt || 0,
                        distance: prop.distance || 0,
                        status: listingStatus,
                        soldDate:
                          (prop.eventDetails && prop.eventDetails.event_date) ||
                          prop.soldDate ||
                          "",
                        latitude: prop.latitude || 0,
                        longitude: prop.longitude || 0,
                        similarityScore: prop.similarityScore || 0,
                        isOutlier: prop.isOutlier || false,
                        eventDetails: prop.eventDetails || null,
                        // Add new fields for both sale and rental events
                        lastSalePrice: prop.lastSalePrice || null,
                        lastSaleDate: prop.lastSaleDate || null,
                        lastRentalPrice: prop.lastRentalPrice || null,
                        lastRentalDate: prop.lastRentalDate || null,
                        rentalStatus: prop.rentalStatus || null,
                      };
                    });

                    const propertyData = {
                      address: {
                        street1: selectedAddress?.street1 || "",
                        street2: selectedAddress?.street2 || "",
                        city: selectedAddress?.city || "",
                        state: selectedAddress?.state || "",
                        zip: selectedAddress?.zip || "",
                        formattedAddress:
                          selectedAddress?.formattedAddress || "",
                        lat: selectedAddress?.lat || 0,
                        lng: selectedAddress?.lng || 0,
                      },
                      addressData: { items: [apiData.targetProperty] },
                      neighborhoodProperties: mappedComparableProperties,
                      allProperties: mappedAllProperties,
                      radiusUsed: apiData.radiusUsed || 0,
                      monthsUsed: apiData.monthsUsed || 0,
                      usedFallbackCriteria:
                        apiData.usedFallbackCriteria || false,
                    };

                    // Update Redux with new property data
                    dispatch(setProperties([propertyData]));

                    // Hide loading overlay immediately after Redux update
                    if (onPropertyUpdate) {
                      onPropertyUpdate(true);
                    }
                  } else {
                    console.error(
                      "Failed to update property data:",
                      response.status
                    );
                  }
                }
              }
            } catch (error) {
              console.error("Error updating property data:", error);
            }

            // Now trigger recalculation with updated data
            await triggerRecalculation();

            // Note: Loading overlay is automatically hidden by EstimatePage
            // when the update process is complete
          }
        }}
      />

      {/* Save Error Message */}
      {saveErrorMessage && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle mr={2}>Save Failed!</AlertTitle>
            <AlertDescription>{saveErrorMessage}</AlertDescription>
          </Box>
          <CloseButton
            alignSelf="flex-start"
            position="relative"
            right={-1}
            top={-1}
            onClick={() => setSaveErrorMessage(null)}
          />
        </Alert>
      )}

      {/* Save Success Message */}
      {saveSuccessMessage && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle mr={2}>Success!</AlertTitle>
            <AlertDescription>{saveSuccessMessage}</AlertDescription>
          </Box>
          <CloseButton
            alignSelf="flex-start"
            position="relative"
            right={-1}
            top={-1}
            onClick={() => setSaveSuccessMessage(null)}
          />
        </Alert>
      )}

      {/* Fallback Criteria Banner */}
      {property?.usedFallbackCriteria && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon flexShrink={0} />
          <Text fontSize={{ base: "sm", md: "md" }} lineHeight="1.4">
            We expanded the search criteria (bed/bath ±1, square footage ±500,
            radius 1.0 miles) to find comparable properties for your area. This
            estimate is based on properties with broader matching criteria.
          </Text>
        </Alert>
      )}

      {/* Limited Data Warning Banner */}
      {((showRentalProperties && rentalPropertiesCount < 5) ||
        (showSoldOnly && soldPropertiesCount < 5)) && (
        <Alert status="warning" mb={4} borderRadius="md">
          <AlertIcon flexShrink={0} />
          <Text fontSize={{ base: "sm", md: "md" }} lineHeight="1.4">
            {showRentalProperties && showSoldOnly
              ? `This estimate is based on limited data (${rentalPropertiesCount} rental comps, ${soldPropertiesCount} sold comps). For a more accurate valuation, contact Rehouzd support.`
              : showRentalProperties && rentalPropertiesCount < 5
              ? `This estimate is based on limited rental data (${rentalPropertiesCount} comps). For a more accurate valuation, contact Rehouzd support.`
              : `This estimate is based on limited sales data (${soldPropertiesCount} comps). For a more accurate valuation, contact Rehouzd support.`}
          </Text>
        </Alert>
      )}

      {/* Buyer Estimated Purchase Price */}
      <BuyerEstimatedPrice
        strategy={activeInvestmentTab === 0 ? "rent" : "flip"}
      />

      <Box mt={3} mb={6}>
        {/* Action Buttons */}
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={{ base: 3, md: 2 }}
          mb={5}
          width="100%"
        >
          <Button
            variant="outline"
            borderWidth="1px"
            borderRadius="md"
            colorScheme="green"
            size="md"
            width={{ base: "100%", md: "auto" }}
            flex={{ base: "none", md: "1" }}
            py={4}
            onClick={() => handleOpenCallbackModal()}
          >
            Speak with Analyst
          </Button>
          <Button
            variant="outline"
            borderWidth="1px"
            borderRadius="md"
            colorScheme="gray"
            size="md"
            width={{ base: "100%", md: "auto" }}
            flex={{ base: "none", md: "1" }}
            py={4}
            onClick={() => handleSaveEstimate()}
            isLoading={isSaving}
          >
            Save Estimate
          </Button>
          <Button
            variant="outline"
            borderWidth="1px"
            borderRadius="md"
            colorScheme="gray"
            size="md"
            width={{ base: "100%", md: "auto" }}
            flex={{ base: "none", md: "1" }}
            py={4}
            onClick={onOpenBuyersDrawerWithFetch}
          >
            See Buyers
          </Button>
          <Button
            bg="green.800"
            color="white"
            borderRadius="md"
            size="md"
            width={{ base: "100%", md: "auto" }}
            flex={{ base: "none", md: "1" }}
            py={4}
            _hover={{ bg: "green.700" }}
            onClick={onNext}
          >
            Get Offers
          </Button>
        </Flex>
      </Box>

      <Box mt={2} mb={4}>
        <Heading
          color={textPrimary}
          as="h3"
          size={{ base: "sm", md: "md" }}
          mb={2}
        >
          Underwrite
        </Heading>
        <Tabs
          variant="unstyled"
          align="end"
          colorScheme="green"
          index={activeInvestmentTab}
          onChange={handleInvestmentTabChange}
          size={{ base: "sm", md: "md" }}
        >
          <TabList bg="transparent">
            <HStack
              spacing={0}
              borderRadius="md"
              overflow="hidden"
              borderTop="1px solid"
              borderLeft="1px solid"
              borderRight="1px solid"
              borderColor="gray.200"
              bg="white"
              pt={1}
              pl={1}
              pr={1}
            >
              <Tab
                bg={activeInvestmentTab === 0 ? "gray.50" : "transparent"}
                color={activeInvestmentTab === 0 ? "green.800" : "gray.600"}
                border="none"
                borderRadius="md"
                fontWeight="semibold"
                px={4}
                _hover={{
                  bg: activeInvestmentTab === 0 ? "gray.100" : "gray.50",
                  color: activeInvestmentTab === 0 ? "green.800" : "gray.700",
                }}
                _selected={{
                  bg: "gray.50",
                  color: "green.800",
                }}
              >
                Rental
              </Tab>
              <Tab
                bg={activeInvestmentTab === 1 ? "gray.50" : "transparent"}
                color={activeInvestmentTab === 1 ? "green.800" : "gray.600"}
                border="none"
                borderRadius="md"
                fontWeight="semibold"
                px={4}
                _hover={{
                  bg: activeInvestmentTab === 1 ? "gray.100" : "gray.50",
                  color: activeInvestmentTab === 1 ? "green.800" : "gray.700",
                }}
                _selected={{
                  bg: "gray.50",
                  color: "green.800",
                }}
              >
                Flip
              </Tab>
            </HStack>
          </TabList>
          <TabPanels
            p={0}
            m={0}
            borderRadius="md"
            overflow="hidden"
            border="1px solid"
            borderColor="gray.200"
          >
            <TabPanel p={0} m={0}>
              {isLoadingSliderValues ? (
                <Center py={10}>
                  <Spinner size="xl" color="green.500" />
                </Center>
              ) : (
                <RentUnderwriteSliders
                  initialValues={rentUnderwriteValues}
                  onSliderChange={handleRentSliderChange}
                  onValuesChanged={handleRentValuesChanged}
                  onDetailedCalculatorClick={handleOpenDetailedRehabCalculator}
                  onSqFtCalculatorClick={handleOpenSqFtRehabCalculator}
                />
              )}
            </TabPanel>
            <TabPanel p={0} m={0}>
              {isLoadingSliderValues ? (
                <Center py={10}>
                  <Spinner size="xl" color="green.500" />
                </Center>
              ) : (
                <FlipUnderwriteSliders
                  initialValues={flipUnderwriteValues}
                  onSliderChange={handleFlipSliderChange}
                  onValuesChanged={handleFlipValuesChanged}
                  onDetailedCalculatorClick={handleOpenDetailedRehabCalculator}
                  onSqFtCalculatorClick={handleOpenSqFtRehabCalculator}
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Main Comps Section with Tabs */}
      <Box mb={4}>
        {/* <Heading color={textPrimary} as="h3" size={{ base: "sm", md: "md" }} mb={4}>
                    Market Analysis
                </Heading> */}

        <Tabs
          variant="unstyled"
          colorScheme="green"
          index={activeMainCompsTab}
          onChange={(index) => setActiveMainCompsTab(index)}
          size={{ base: "sm", md: "md" }}
        >
          <Box bg="gray.50" borderRadius="sm" p={1} mb={3} width="100%">
            <TabList
              border="none"
              display="flex"
              width="100%"
              bg="transparent"
              p={0}
              m={0}
            >
              <Tab
                flex="1"
                fontWeight="semibold"
                borderRadius="md"
                bg="transparent"
                color="gray.600"
                _selected={{
                  bg: "brand.500",
                  color: "white",
                  fontWeight: "bold",
                  boxShadow: "none",
                  borderRadius: "lg",
                }}
                _focus={{ boxShadow: "none" }}
                _active={{ bg: "brand.500" }}
                fontSize={{ base: "lg", md: "xl" }}
                py={3}
                transition="background 0.2s"
              >
                Neighborhood Comps
              </Tab>
              <Tab
                flex="1"
                fontWeight="semibold"
                borderRadius="lg"
                bg="transparent"
                color="gray.600"
                _selected={{
                  bg: "brand.500",
                  color: "white",
                  fontWeight: "bold",
                  boxShadow: "none",
                  borderRadius: "lg",
                }}
                _focus={{ boxShadow: "none" }}
                _active={{ bg: "brand.500" }}
                fontSize={{ base: "lg", md: "xl" }}
                py={3}
                transition="background 0.2s"
              >
                Investor Comps
              </Tab>
            </TabList>
          </Box>
          <TabPanels>
            {/* Neighborhood Comps Panel */}
            <TabPanel p={0} pt={3}>
              {/* Neighborhood Comps Filters - always visible */}
              <Box
                borderWidth="1px"
                borderRadius="md"
                p={3}
                bg="white"
                mb={3}
                boxShadow="sm"
              >
                {/* First Row: Price Range, Square Footage, Year Built */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={2}>
                  {/* Price Range */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Price Range
                    </Text>
                    <Flex gap={2}>
                      <Input
                        placeholder="Min"
                        size="sm"
                        value={filterPriceMin}
                        onChange={(e) =>
                          setFilterPriceMin(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                      <Input
                        placeholder="Max"
                        size="sm"
                        value={filterPriceMax}
                        onChange={(e) =>
                          setFilterPriceMax(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </Flex>
                  </Box>
                  {/* Square Footage */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Square Footage
                    </Text>
                    <Flex gap={2}>
                      <Input
                        placeholder="Min"
                        size="sm"
                        value={filterSqftMin}
                        onChange={(e) =>
                          setFilterSqftMin(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                      <Input
                        placeholder="Max"
                        size="sm"
                        value={filterSqftMax}
                        onChange={(e) =>
                          setFilterSqftMax(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </Flex>
                  </Box>
                  {/* Year Built */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Year Built
                    </Text>
                    <Flex gap={2}>
                      <Input
                        placeholder="Min"
                        size="sm"
                        value={filterYearMin}
                        onChange={(e) =>
                          setFilterYearMin(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                      <Input
                        placeholder="Max"
                        size="sm"
                        value={filterYearMax}
                        onChange={(e) =>
                          setFilterYearMax(
                            e.target.value ? parseInt(e.target.value) : ""
                          )
                        }
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </Flex>
                  </Box>
                </SimpleGrid>

                {/* Second Row: Beds, Baths, Distance */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={2}>
                  {/* Beds */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Beds
                    </Text>
                    <Menu closeOnSelect={false}>
                      <MenuButton
                        as={Button}
                        rightIcon={
                          <Icon as={FaChevronDown as React.ElementType} />
                        }
                        size="sm"
                        variant="outline"
                        width="100%"
                        textAlign="left"
                        fontWeight="normal"
                        color="gray.600"
                        borderColor="gray.200"
                        _hover={{ borderColor: "gray.300" }}
                        _focus={{
                          borderColor: "blue.500",
                          boxShadow: "0 0 0 1px #3182ce",
                        }}
                      >
                        {filterBedrooms.length === 0
                          ? "All Bedrooms"
                          : `${filterBedrooms.length} selected`}
                      </MenuButton>
                      <MenuList maxHeight="200px" overflowY="auto">
                        {/* All Bedrooms option */}
                        <Box
                          px={3}
                          py={1}
                          borderBottom="1px solid"
                          borderColor="gray.200"
                        >
                          <Checkbox
                            isChecked={
                              filterBedrooms.length === uniqueBedrooms.length &&
                              uniqueBedrooms.length > 0
                            }
                            isIndeterminate={
                              filterBedrooms.length > 0 &&
                              filterBedrooms.length < uniqueBedrooms.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterBedrooms(uniqueBedrooms);
                              } else {
                                setFilterBedrooms([]);
                              }
                            }}
                            colorScheme="green"
                            fontWeight="bold"
                          >
                            All Bedrooms
                          </Checkbox>
                        </Box>
                        {uniqueBedrooms.length > 0 &&
                          uniqueBedrooms.map((n) => (
                            <Box key={n} px={3} py={1}>
                              <Checkbox
                                isChecked={filterBedrooms.includes(n)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilterBedrooms((prev) => [...prev, n]);
                                  } else {
                                    setFilterBedrooms((prev) =>
                                      prev.filter((b) => b !== n)
                                    );
                                  }
                                }}
                                colorScheme="green"
                              >
                                {n}
                              </Checkbox>
                            </Box>
                          ))}
                      </MenuList>
                    </Menu>
                  </Box>
                  {/* Baths */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Baths
                    </Text>
                    <Menu closeOnSelect={false}>
                      <MenuButton
                        as={Button}
                        rightIcon={
                          <Icon as={FaChevronDown as React.ElementType} />
                        }
                        size="sm"
                        variant="outline"
                        width="100%"
                        textAlign="left"
                        fontWeight="normal"
                        color="gray.600"
                        borderColor="gray.200"
                        _hover={{ borderColor: "gray.300" }}
                        _focus={{
                          borderColor: "blue.500",
                          boxShadow: "0 0 0 1px #3182ce",
                        }}
                      >
                        {filterBathrooms.length === 0
                          ? "All Bathrooms"
                          : `${filterBathrooms.length} selected`}
                      </MenuButton>
                      <MenuList maxHeight="200px" overflowY="auto">
                        {/* All Bathrooms option */}
                        <Box
                          px={3}
                          py={1}
                          borderBottom="1px solid"
                          borderColor="gray.200"
                        >
                          <Checkbox
                            isChecked={
                              filterBathrooms.length ===
                                uniqueBathrooms.length &&
                              uniqueBathrooms.length > 0
                            }
                            isIndeterminate={
                              filterBathrooms.length > 0 &&
                              filterBathrooms.length < uniqueBathrooms.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterBathrooms(uniqueBathrooms);
                              } else {
                                setFilterBathrooms([]);
                              }
                            }}
                            colorScheme="green"
                            fontWeight="bold"
                          >
                            All Bathrooms
                          </Checkbox>
                        </Box>
                        {uniqueBathrooms.length > 0 &&
                          uniqueBathrooms.map((n) => (
                            <Box key={n} px={3} py={1}>
                              <Checkbox
                                isChecked={filterBathrooms.includes(n)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilterBathrooms((prev) => [...prev, n]);
                                  } else {
                                    setFilterBathrooms((prev) =>
                                      prev.filter((b) => b !== n)
                                    );
                                  }
                                }}
                                colorScheme="green"
                              >
                                {n}
                              </Checkbox>
                            </Box>
                          ))}
                      </MenuList>
                    </Menu>
                  </Box>
                  {/* Distance */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Distance
                    </Text>
                    <Flex gap={2}>
                      {/* Min Distance Dropdown */}
                      <Menu closeOnSelect={true}>
                        <MenuButton
                          as={Button}
                          rightIcon={
                            <Icon as={FaChevronDown as React.ElementType} />
                          }
                          size="sm"
                          variant="outline"
                          width="100%"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{
                            borderColor: "blue.500",
                            boxShadow: "0 0 0 1px #3182ce",
                          }}
                        >
                          {filterDistanceMin !== ""
                            ? `${filterDistanceMin} mi`
                            : "0.0 mi"}
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          {Array.from({ length: 11 }, (_, i) => i * 0.1).map(
                            (distance) => (
                              <MenuItem
                                key={distance}
                                onClick={() =>
                                  setFilterDistanceMin(
                                    parseFloat(distance.toFixed(1))
                                  )
                                }
                                bg={
                                  filterDistanceMin === distance.toFixed(1)
                                    ? "blue.50"
                                    : "transparent"
                                }
                                color={
                                  filterDistanceMin === distance.toFixed(1)
                                    ? "blue.600"
                                    : "inherit"
                                }
                              >
                                {distance.toFixed(1)} mi
                              </MenuItem>
                            )
                          )}
                        </MenuList>
                      </Menu>

                      {/* Max Distance Dropdown */}
                      <Menu closeOnSelect={true}>
                        <MenuButton
                          as={Button}
                          rightIcon={
                            <Icon as={FaChevronDown as React.ElementType} />
                          }
                          size="sm"
                          variant="outline"
                          width="100%"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{
                            borderColor: "blue.500",
                            boxShadow: "0 0 0 1px #3182ce",
                          }}
                        >
                          {filterDistanceMax !== ""
                            ? `${filterDistanceMax} mi`
                            : "1.0 mi"}
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          {Array.from({ length: 11 }, (_, i) => i * 0.1).map(
                            (distance) => (
                              <MenuItem
                                key={distance}
                                onClick={() =>
                                  setFilterDistanceMax(
                                    parseFloat(distance.toFixed(1))
                                  )
                                }
                                bg={
                                  filterDistanceMax === distance.toFixed(1)
                                    ? "blue.50"
                                    : "transparent"
                                }
                                color={
                                  filterDistanceMax === distance.toFixed(1)
                                    ? "blue.600"
                                    : "inherit"
                                }
                              >
                                {distance.toFixed(1)} mi
                              </MenuItem>
                            )
                          )}
                        </MenuList>
                      </Menu>
                    </Flex>
                  </Box>
                </SimpleGrid>

                {/* Third Row: Sold Timeframe */}
                <Flex align="center" justify="space-between" mt={2} mb={2}>
                  {/* Sold Timeframe */}
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Sold Timeframe
                    </Text>
                    <Flex gap={2}>
                      {/* Min Sold Timeframe Dropdown */}
                      <Menu>
                        <MenuButton
                          as={Button}
                          rightIcon={
                            <Icon as={FaChevronDown as React.ElementType} />
                          }
                          size="sm"
                          variant="outline"
                          width="120px"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{
                            borderColor: "blue.500",
                            boxShadow: "0 0 0 1px #3182ce",
                          }}
                        >
                          {filterSoldStart === "today"
                            ? "Today"
                            : filterSoldStart.replace("_month", " Month")}
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          <MenuItem onClick={() => setFilterSoldStart("today")}>
                            Today
                          </MenuItem>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <MenuItem
                                key={month}
                                onClick={() =>
                                  setFilterSoldStart(`${month}_month`)
                                }
                              >
                                {month} Month{month === 1 ? "" : "s"}
                              </MenuItem>
                            )
                          )}
                        </MenuList>
                      </Menu>
                      {/* Max Sold Timeframe Dropdown */}
                      <Menu>
                        <MenuButton
                          as={Button}
                          rightIcon={
                            <Icon as={FaChevronDown as React.ElementType} />
                          }
                          size="sm"
                          variant="outline"
                          width="130px"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{
                            borderColor: "blue.500",
                            boxShadow: "0 0 0 1px #3182ce",
                          }}
                        >
                          {filterSoldEnd === "today"
                            ? "Today"
                            : filterSoldEnd.replace("_month", " Month")}
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          <MenuItem onClick={() => setFilterSoldEnd("today")}>
                            Today
                          </MenuItem>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <MenuItem
                                key={month}
                                onClick={() =>
                                  setFilterSoldEnd(`${month}_month`)
                                }
                              >
                                {month} Month{month === 1 ? "" : "s"}
                              </MenuItem>
                            )
                          )}
                        </MenuList>
                      </Menu>
                    </Flex>
                  </Box>
                  {/* Clear Filters Button */}
                  <Button
                    size="md"
                    variant="outline"
                    colorScheme="green"
                    ml={4}
                    alignSelf="flex-end"
                    onClick={() => {
                      setFilterPriceMin("");
                      setFilterPriceMax("");
                      setFilterSqftMin("");
                      setFilterSqftMax("");
                      setFilterYearMin("");
                      setFilterYearMax("");
                      setFilterBedrooms([]);
                      setFilterBathrooms([]);
                      setFilterDistanceMin("");
                      setFilterDistanceMax("");
                      setFilterSoldStart("today");
                      setFilterSoldEnd("12_month");
                    }}
                  >
                    Clear Filters
                  </Button>
                </Flex>
              </Box>
              {/* Comparable Properties Box (use filteredNeighborhoodProperties instead of filteredProperties) */}
              <Box
                p={{ base: 3, md: 5 }}
                borderRadius="md"
                bg={bgPrimary}
                borderWidth="1px"
                borderColor={borderPrimary}
                boxShadow="md"
                overflow="hidden"
              >
                {/* Property Map */}
                <Box
                  h={{ base: "250px", md: "300px" }}
                  mb={{ base: 4, md: 6 }}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor={borderPrimary}
                  position="relative"
                >
                  {/* Top right control box with tabs and toggles */}
                  <Box
                    position="absolute"
                    top={2}
                    right={2}
                    zIndex={5}
                    bg="white"
                    borderRadius="md"
                    boxShadow="md"
                    minW={{ base: "150px", md: "200px" }}
                    fontSize={{ base: "xs", md: "sm" }}
                  >
                    {/* Neighborhood Comps Tabs */}
                    <Tabs
                      variant="enclosed"
                      colorScheme="green"
                      index={activeCompsTab}
                      onChange={(index) => setActiveCompsTab(index)}
                      size="sm"
                    >
                      <TabList borderBottom="none">
                        <Tab
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderTopRadius="md"
                          borderBottomRadius={0}
                          fontWeight="semibold"
                          _selected={{
                            bg: "brand.500",
                            color: "white",
                            borderColor: "brand.500",
                          }}
                        >
                          Suggested Comps
                          <Badge
                            ml={1}
                            colorScheme={
                              activeCompsTab === 0 ? "white" : "green"
                            }
                            variant={activeCompsTab === 0 ? "solid" : "subtle"}
                            borderRadius="full"
                            fontSize="xx-small"
                          >
                            {suggestedCompsDisplayCount}
                          </Badge>
                        </Tab>
                        <Tab
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderTopRadius="md"
                          borderBottomRadius={0}
                          fontWeight="semibold"
                          _selected={{
                            bg: "brand.500",
                            color: "white",
                            borderColor: "brand.500",
                          }}
                        >
                          All Comps
                          <Badge
                            ml={1}
                            colorScheme={
                              activeCompsTab === 1 ? "white" : "blue"
                            }
                            variant={activeCompsTab === 1 ? "solid" : "subtle"}
                            borderRadius="full"
                            fontSize="xx-small"
                          >
                            {allCompsDisplayCount}
                          </Badge>
                        </Tab>
                      </TabList>
                    </Tabs>

                    {/* Toggle controls */}
                    <VStack
                      p={2}
                      spacing={2}
                      align="stretch"
                      bg="gray.50"
                      borderBottomRadius="md"
                    >
                      <FormControl
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        w="100%"
                        size="sm"
                      >
                        <FormLabel
                          htmlFor="show-rentals"
                          mb="0"
                          fontSize="sm"
                          fontWeight="medium"
                        >
                          Show Rentals
                        </FormLabel>
                        <Flex alignItems="center">
                          <Badge
                            ml={1}
                            mr={2}
                            colorScheme="blue"
                            borderRadius="full"
                            fontSize="xs"
                          >
                            {rentalPropertiesCount}
                          </Badge>
                          <Switch
                            id="show-rentals"
                            colorScheme="brand"
                            size="sm"
                            isChecked={showRentalProperties}
                            onChange={(e) => {
                              setShowRentalProperties(e.target.checked);
                            }}
                            isDisabled={rentalPropertiesCount === 0}
                          />
                        </Flex>
                      </FormControl>

                      {/* Sold properties only toggle */}
                      <FormControl
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        w="100%"
                        size="sm"
                      >
                        <FormLabel
                          htmlFor="show-sold-only"
                          mb="0"
                          fontSize="sm"
                          fontWeight="medium"
                        >
                          Sold Only
                        </FormLabel>
                        <Flex alignItems="center">
                          <Badge
                            ml={1}
                            mr={2}
                            colorScheme="red"
                            borderRadius="full"
                            fontSize="xs"
                          >
                            {soldPropertiesCount}
                          </Badge>
                          <Switch
                            id="show-sold-only"
                            colorScheme="brand"
                            size="sm"
                            isChecked={showSoldOnly}
                            onChange={(e) => {
                              setShowSoldOnly(e.target.checked);
                            }}
                          />
                        </Flex>
                      </FormControl>
                    </VStack>
                  </Box>

                  <AddressMap
                    key="property-map"
                    latitude={addressState.lat}
                    longitude={addressState.lng}
                    address={addressState.formattedAddress}
                    forceEmptyProperties={currentProperties.length === 0}
                    properties={filteredNeighborhoodProperties.map(
                      (p) => ({ ...p, id: String(p.id || "") } as any)
                    )}
                    radiusMiles={radiusMiles}
                    showProperties={true}
                    height="300px"
                    highlightedPropertyId={highlightedPropertyId}
                    selectedPropertyIds={selectedPropertyIds}
                    onInfoWindowClose={handleResetHighlight}
                  />
                </Box>

                {/* Properties Table */}
                <Box overflowX="auto">
                  <Table size="sm" variant="simple" ref={propertyTableRef}>
                    <Thead bg={bgSecondary}>
                      <Tr>
                        <Th width="40px">
                          <Checkbox
                            colorScheme="green"
                            onChange={(e) => {
                              handleSelectAllProperties(e.target.checked);
                            }}
                            isChecked={
                              selectedPropertyIds.length > 0 &&
                              selectedPropertyIds.length ===
                                draggableProperties.length &&
                              draggableProperties.length > 0
                            }
                            isIndeterminate={
                              selectedPropertyIds.length > 0 &&
                              selectedPropertyIds.length <
                                draggableProperties.length
                            }
                          />
                        </Th>
                        <Th width="40px"></Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Listing"
                                ? "Listing Reverse"
                                : "Listing"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Listing{" "}
                          {sortOrder.includes("Listing") && (
                            <Icon
                              as={
                                sortOrder === "Listing"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Address"
                                ? "Address Reverse"
                                : "Address"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Address{" "}
                          {sortOrder.includes("Address") && (
                            <Icon
                              as={
                                sortOrder === "Address"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Date" ? "Date Reverse" : "Date"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Date{" "}
                          {sortOrder.includes("Date") && (
                            <Icon
                              as={
                                sortOrder === "Date"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Price (Low to High)"
                                ? "Price (High to Low)"
                                : "Price (Low to High)"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Price{" "}
                          {sortOrder.includes("Price") && (
                            <Icon
                              as={
                                sortOrder === "Price (Low to High)"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Distance"
                                ? "Distance Reverse"
                                : "Distance"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Distance{" "}
                          {sortOrder.includes("Distance") && (
                            <Icon
                              as={
                                sortOrder === "Distance"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Bed" ? "Bed Reverse" : "Bed"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Bed{" "}
                          {sortOrder.includes("Bed") && (
                            <Icon
                              as={
                                sortOrder === "Bed"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Bath" ? "Bath Reverse" : "Bath"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Bath{" "}
                          {sortOrder.includes("Bath") && (
                            <Icon
                              as={
                                sortOrder === "Bath"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Square Footage"
                                ? "Square Footage Reverse"
                                : "Square Footage"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Sqft{" "}
                          {sortOrder.includes("Square Footage") && (
                            <Icon
                              as={
                                sortOrder === "Square Footage"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                        <Th
                          fontSize="sm"
                          px={1}
                          whiteSpace="nowrap"
                          _hover={{ cursor: "pointer" }}
                          onClick={() => {
                            setIsSortingActive(true);
                            setSortOrder(
                              sortOrder === "Year Built"
                                ? "Year Built Reverse"
                                : "Year Built"
                            );
                            // Reset custom order when sorting
                            setCustomPropertyOrder([]);
                          }}
                        >
                          Year{" "}
                          {sortOrder.includes("Year Built") && (
                            <Icon
                              as={
                                sortOrder === "Year Built"
                                  ? (FaCaretDown as React.ElementType)
                                  : (FaCaretUp as React.ElementType)
                              }
                              ml={1}
                            />
                          )}
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {draggableProperties.length === 0 ? (
                        <Tr>
                          <Td colSpan={11} textAlign="center" py={4}>
                            <Flex direction="column" align="center" py={4}>
                              <Icon
                                as={FaInfoCircle as React.ElementType}
                                color="blue.400"
                                boxSize={6}
                                mb={2}
                              />
                              <Text>
                                No properties found matching your filters
                              </Text>
                            </Flex>
                          </Td>
                        </Tr>
                      ) : (
                        // Map through properties with proper sorting
                        draggableProperties.map((property, index) => (
                          <Tr
                            key={property.id || index}
                            _hover={{
                              bg: "rgba(0, 128, 0, 0.1)",
                              cursor: "pointer",
                            }}
                            onClick={() => handlePropertyRowClick(property)}
                            bg={
                              highlightedPropertyId === property.id
                                ? "rgba(229, 62, 62, 0.1)" // Highlighted in red
                                : property.id &&
                                  selectedPropertyIds.includes(property.id)
                                ? "rgba(49, 151, 149, 0.1)" // Selected in teal
                                : undefined
                            }
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop(index)}
                            data-index={index}
                          >
                            <Td onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                colorScheme="green"
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handlePropertySelect(
                                    property,
                                    e.target.checked
                                  );
                                }}
                                isChecked={
                                  property.id
                                    ? selectedPropertyIds.indexOf(
                                        property.id
                                      ) >= 0
                                    : false
                                }
                                sx={{
                                  ".chakra-checkbox__control": {
                                    borderColor: "#b3c5dd",
                                  },
                                }}
                              />
                            </Td>
                            <Td>
                              <Box
                                as="div"
                                cursor="grab"
                                className="drag-handle"
                                onClick={(e) => e.stopPropagation()}
                                _hover={{ color: "gray.600" }}
                                draggable
                                onDragStart={handleDragStart(index)}
                              >
                                <Icon
                                  as={FaGripVertical as React.ElementType}
                                  color="gray.400"
                                />
                              </Box>
                            </Td>
                            <Td fontSize="xs" px={1} textAlign="center">
                              <Badge
                                colorScheme={
                                  property.status === "SOLD" ||
                                  property.status === "Sold"
                                    ? "red"
                                    : property.status === "LISTED_RENT" ||
                                      property.status === "LISTING_REMOVED" ||
                                      property.status === "RENTAL" ||
                                      property.status === "PRICE_CHANGE"
                                    ? "blue"
                                    : "gray"
                                }
                                fontSize="xs"
                                textTransform="uppercase"
                              >
                                {property.status === "LISTED_RENT" ||
                                property.status === "RENTAL" ||
                                property.status === "PRICE_CHANGE"
                                  ? "RENTAL"
                                  : property.status || "UNKNOWN"}
                              </Badge>
                            </Td>
                            <Td
                              maxW="220px"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              fontSize="xs"
                              px={1}
                            >
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(
                                  `${property.address || ""} ${
                                    property.city || ""
                                  } ${property.state || ""} ${
                                    property.zipCode || ""
                                  } Zillow Redfin Realtor`
                                ).replace(/%20/g, "+")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#3182ce",
                                  textDecoration: "underline",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {property.address}
                                <ExternalLinkIcon ml="1" />
                              </a>
                            </Td>
                            <Td whiteSpace="nowrap" fontSize="xs" px={1}>
                              {(property.soldDate || property.date) && (
                                <Text fontSize="xs">
                                  {new Date(
                                    property.soldDate || property.date || ""
                                  ).toLocaleDateString("en-US", {
                                    year: "2-digit",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })}
                                </Text>
                              )}
                            </Td>
                            <Td fontSize="xs" px={1}>
                              {property.price && (
                                <Text fontSize="xs" fontWeight="medium">
                                  {formatPrice(property.price)}
                                  {property.status === "RENTAL" ||
                                    property.status === "LISTED_RENT"}
                                </Text>
                              )}
                            </Td>
                            <Td fontSize="xs" px={1} textAlign="center">
                              {formatDistance(property.distance)}
                            </Td>
                            <Td fontSize="xs" px={1} textAlign="center">
                              {property.bedrooms || "-"}
                            </Td>
                            <Td fontSize="xs" px={1} textAlign="center">
                              {property.bathrooms || "-"}
                            </Td>
                            <Td fontSize="xs" px={1}>
                              {property.squareFootage || "-"}
                            </Td>
                            <Td fontSize="xs" px={1}>
                              {property.yearBuilt || "-"}
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>

            {/* Investor Comps Panel */}
            <TabPanel p={0} pt={3}>
              <InvestorCompsSection
                buyers={buyers}
                currentZipCode={propertyDetails?.zip_code || ""}
                propertyLatLng={{
                  lat: addressState.lat,
                  lng: addressState.lng,
                }}
                isVisible={buyers.length > 0}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Back/Verify Buttons Box */}
      <Box>
        <Stack w="100%" spacing={4} direction={{ base: "column", md: "row" }}>
          <Button
            leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
            variant="outline"
            onClick={handleBackToStep2}
            flex={{ base: "none", md: "1" }}
            width={{ base: "100%", md: "auto" }}
            size={{ base: "md", md: "md" }}
          >
            Back
          </Button>
          <Button
            colorScheme="brand"
            flex={{ base: "none", md: "2" }}
            width={{ base: "100%", md: "auto" }}
            size={{ base: "md", md: "md" }}
            onClick={onNext}
            _hover={{ bg: "brand.600" }}
          >
            Get Offers
          </Button>
        </Stack>
      </Box>

      {/* Interested Buyers Drawer */}
      <Drawer
        isOpen={isBuyersDrawerOpen}
        placement="right"
        onClose={onCloseBuyersDrawer}
        size="md"
      >
        <DrawerOverlay
          backdropFilter="blur(4px)"
          bg="blackAlpha.300"
          onClick={(e) => {
            // Prevent propagation to avoid closing nested drawers
            e.stopPropagation();
          }}
        />
        <DrawerContent bg={bgPrimary} boxShadow="dark-lg">
          <DrawerCloseButton size="lg" />
          <DrawerHeader borderBottomWidth="1px" py={4}>
            <VStack spacing={4} align="stretch">
              {/* Header with Buyers title and In-Network toggle */}
              <Flex justifyContent="space-between" alignItems="center">
                <Heading size="md" color="brand.500">
                  Buyers
                </Heading>
                <Box mr={8}>
                  <Badge
                    colorScheme="brand"
                    fontSize="sm"
                    borderRadius="md"
                    bg={showInNetworkOnly ? "brand.500" : "gray.100"}
                    color={showInNetworkOnly ? "white" : "gray.600"}
                    cursor="pointer"
                    onClick={showInNetworkOnly ? handleShowAllBuyers : handleShowInNetworkOnly}
                    _hover={{
                      bg: showInNetworkOnly ? "brand.600" : "gray.200",
                      transform: "scale(1.02)",
                    }}
                    transition="all 0.2s"
                    fontWeight="bold"
                    px={2}
                    py={0.5}
                  >
                    {buyersLoading ? (
                      <Spinner size="xs" />
                    ) : (
                      getInNetworkBuyersCount(filteredBuyers)
                    )}{" "}
                    IN-NETWORK
                  </Badge>
                </Box>
              </Flex>

              {/* Buyer Category Tabs */}
              <Tabs
                index={selectedBuyerCategory === 'all' ? 0 : selectedBuyerCategory === 'active' ? 1 : 2}
                onChange={(index) => {
                  const categories: BuyerCategory[] = ['all', 'active', 'recent'];
                  setSelectedBuyerCategory(categories[index]);
                }}
                variant="soft-rounded"
                colorScheme="brand"
                size="sm"
              >
                <TabList>
                  <Tab 
                    fontSize="sm" 
                    px={4}
                    _selected={{
                      bg: "brand.500",
                      color: "white",
                      borderRadius: "md",
                      _hover: {
                        bg: "brand.600",
                        color: "white"
                      }
                    }}
                    _hover={{
                      bg: "brand.100",
                      color: "brand.500"
                    }}
                  >
                    All Buyers ({getBuyerCategoryCount('all')})
                  </Tab>
                  <Tab 
                    fontSize="sm" 
                    px={4}
                    _selected={{
                      bg: "brand.500",
                      color: "white",
                      borderRadius: "md",
                      _hover: {
                        bg: "brand.600",
                        color: "white"
                      }
                    }}
                    _hover={{
                      bg: "brand.100",
                      color: "brand.500"
                    }}
                  >
                    Active Buyers ({getBuyerCategoryCount('active')})
                  </Tab>
                  <Tab 
                    fontSize="sm" 
                    px={4}
                    _selected={{
                      bg: "brand.500",
                      color: "white",
                      borderRadius: "md",
                      _hover: {
                        bg: "brand.600",
                        color: "white"
                      }
                    }}
                    _hover={{
                      bg: "brand.100",
                      color: "brand.500"
                    }}
                  >
                    Recent Buyers ({getBuyerCategoryCount('recent')})
                  </Tab>
                </TabList>
              </Tabs>
            </VStack>
          </DrawerHeader>

          {/* Sticky Button Bar */}
          {!buyersLoading && !buyersError && filteredBuyers.length > 0 && (
            <Box
              position="sticky"
              top="0"
              zIndex={10}
              bg={bgPrimary}
              borderBottomWidth="1px"
              borderColor="gray.200"
              px={6}
              py={3}
              mb={0}
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <Checkbox
                  colorScheme="brand"
                  fontSize="sm"
                  whiteSpace="nowrap"
                  isChecked={
                    filteredBuyers.length > 0 &&
                    filteredBuyers.every((buyer) =>
                      selectedBuyers.includes(buyer.id || "unknown")
                    )
                  }
                  onChange={toggleSelectAll}
                >
                  Select All {showInNetworkOnly ? "In-Network" : ""} {
                    selectedBuyerCategory === 'all' ? '' :
                    selectedBuyerCategory === 'active' ? 'Active' : 'Recent'
                  } Buyers
                </Checkbox>
                <HStack spacing={2} flexWrap="wrap">
                  <Button
                    colorScheme="brand"
                    variant="solid"
                    size="sm"
                    fontSize="sm"
                    title="Finalize your offer"
                    onClick={() => {
                      onCloseBuyersDrawer();
                      onNext();
                    }}
                  >
                    Get Offers
                  </Button>
                  <Button
                    rightIcon={<Icon as={FaDownload as React.ElementType} />}
                    colorScheme="brand"
                    variant={selectedBuyers.length > 0 ? "solid" : "outline"}
                    size="sm"
                    fontSize="sm"
                    isDisabled={selectedBuyers.length === 0}
                    onClick={handleDownloadBuyersList}
                    _disabled={{
                      opacity: 0.5,
                      cursor: "not-allowed",
                      _hover: {
                        bg: "transparent",
                        transform: "none",
                      },
                    }}
                    title={
                      selectedBuyers.length === 0
                        ? "Select buyers to enable download"
                        : "Download selected buyers"
                    }
                  >
                    Download ({selectedBuyers.length})
                  </Button>
                  <Button
                    rightIcon={<Icon as={FaEye as React.ElementType} />}
                    colorScheme="purple"
                    variant={
                      selectedBuyers.length > 0 &&
                      !showInNetworkOnly &&
                      skipTraceableBuyersCount > 0
                        ? "solid"
                        : "outline"
                    }
                    size="sm"
                    fontSize="sm"
                    isDisabled={
                      selectedBuyers.length === 0 ||
                      showInNetworkOnly ||
                      skipTraceableBuyersCount === 0
                    }
                    onClick={onOpenBulkSkipTraceModal}
                    _disabled={{
                      opacity: 0.5,
                      cursor: "not-allowed",
                      _hover: {
                        bg: "transparent",
                        transform: "none",
                      },
                    }}
                    title={
                      showInNetworkOnly
                        ? "Skip trace not available for in-network buyers"
                        : selectedBuyers.length === 0
                        ? "Select buyers to enable skip trace"
                        : skipTraceableBuyersCount === 0
                        ? "All selected buyers are in-network (skip trace not needed)"
                        : "Skip trace selected buyers"
                    }
                  >
                    Skip Trace ({skipTraceableBuyersCount})
                  </Button>
                </HStack>
              </Flex>
            </Box>
          )}

          <DrawerBody py={6}>
            {buyersLoading ? (
              <Flex justify="center" align="center" py={10}>
                <Spinner size="xl" color="brand.500" />
              </Flex>
            ) : buyersError ? (
              <Box p={4} bg="red.50" color="red.600" borderRadius="md">
                <Heading size="sm">Error loading buyers</Heading>
                <Text mt={2}>{buyersError}</Text>
                <Button
                  mt={4}
                  colorScheme="red"
                  size="sm"
                  onClick={onOpenBuyersDrawerWithFetch}
                >
                  Retry
                </Button>
              </Box>
            ) : filteredBuyers.length === 0 ? (
              <Box p={4} textAlign="center">
                <Heading size="sm" color="gray.500">
                  No active buyers found
                </Heading>
                <Text mt={2} fontSize="sm" color="gray.500">
                  There are no active buyers matching this property's criteria
                  in the database.
                </Text>
              </Box>
            ) : (
              <VStack spacing={4} align="stretch">
                {filteredBuyers.map((buyer, idx) => {
                  // Calculate buyer metrics for badges
                  const buyerMetrics = calculateBuyerMetrics(
                    buyer.purchase_history || [],
                    propertyDetails?.zip_code || ""
                  );

                  return (
                    <Box
                      key={buyer.id || idx}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="lg"
                      p={3}
                      bg="white"
                      boxShadow="sm"
                      _hover={{ boxShadow: "md", borderColor: "brand.500" }}
                      transition="all 0.2s"
                      onClick={() => handleBuyerClick(buyer)}
                    >
                      <Flex direction="column">
                        {/* First row: checkbox + buyer name | badges + button */}
                        <Flex justify="space-between" align="center" mb={1}>
                          <Flex
                            align="center"
                            onClick={(e) => e.stopPropagation()} // safety for checkbox & name
                          >
                            <Checkbox
                              mr={2}
                              isChecked={selectedBuyers.includes(buyer.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleBuyerSelection(
                                  buyer.id || idx.toString()
                                );
                              }}
                            />
                            <Heading
                              size="xs"
                              title={buyer.name}
                              maxW="200px"
                              fontSize={
                                buyer.name.length > 30 ? "0.85rem" : "0.95rem"
                              }
                              whiteSpace="nowrap"
                              color="gray.800"
                            >
                              {buyer.name}
                            </Heading>
                          </Flex>

                          {/* Badges + Contact info */}
                          <HStack spacing={2} align="center">
                            {isInNetworkBuyer(buyer.name) && (
                              <Badge
                                colorScheme="green"
                                variant="subtle"
                                fontSize="0.55rem"
                                px={1}
                                py={0}
                              >
                                IN-NETWORK
                              </Badge>
                            )}
                            {(() => {
                              const buyerSkipTraceResult =
                                skipTraceResults.find((result) => {
                                  const nameMatch =
                                    result.buyerName?.toLowerCase().trim() ===
                                    buyer.name?.toLowerCase().trim();
                                  const idMatch =
                                    result.buyerId &&
                                    buyer.id &&
                                    (result.buyerId === buyer.id ||
                                      result.buyerId === buyer.id.toString() ||
                                      result.buyerId.toString() ===
                                        buyer.id.toString());
                                  const userMatch =
                                    result.userId === user?.user_id?.toString();
                                  return userMatch && (nameMatch || idMatch);
                                });
                              if (buyerSkipTraceResult) {
                                return (
                                  <Badge
                                    colorScheme="purple"
                                    variant="subtle"
                                    fontSize="0.55rem"
                                    px={1}
                                    py={0}
                                  >
                                    SKIP TRACED
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                            <Button
                              size="2xs"
                              variant="outline"
                              colorScheme="gray"
                              height="1rem"
                              fontSize="0.6rem"
                              px={2}
                            >
                              Contact info
                            </Button>
                          </HStack>
                        </Flex>

                        {/* Second row: address */}
                        {/* <Text
                          fontSize="xx-small"
                          color="gray.600"
                          isTruncated
                          title={buyer.address}
                        >
                          {buyer.address}
                        </Text> */}

                        {/* Separator */}
                        <Divider my={2} borderColor="gray.300" />

                        {/* Stats row */}
                        <HStack
                          spacing={2}
                          fontSize="xs"
                          color="gray.700"
                          mb={2}
                        >
                          <Text>
                            <strong>{buyerMetrics.closedDealsTotal}</strong>{" "}
                            Closed
                          </Text>
                          <Text>|</Text>
                          {buyerMetrics.lastBuyDate && (
                            <>
                              <Text>
                                <strong>{buyerMetrics.lastBuyDate}</strong> Last
                                Buy
                              </Text>
                              <Text>|</Text>
                            </>
                          )}
                          {buyerMetrics.avgZipPrice && (
                            <Text>
                              <strong>
                                {formatCurrency(buyerMetrics.avgZipPrice)}
                              </strong>{" "}
                              Avg Zip Price
                            </Text>
                          )}
                        </HStack>

                        {/* Buy Likelihood */}
                        <Text fontSize="xs" fontWeight="medium" mb={1}>
                          Buy Likelihood
                        </Text>
                        <Flex align="center">
                          <Progress
                            value={buyer.score || 0}
                            size="xs"
                            colorScheme={
                              getLikelihoodFromScore(buyer.score || 0).text ===
                              "Most Likely" || "Likely"
                                ? "green"
                                : "yellow"
                            }
                            flex="1"
                            borderRadius="full"
                          />
                          <Text
                            ml={2}
                            fontSize="xs"
                            fontWeight="bold"
                            whiteSpace="nowrap"
                          >
                            {getLikelihoodFromScore(buyer.score || 0).text}
                          </Text>
                        </Flex>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onCloseBuyersDrawer}>
              Close
            </Button>
            {/* <Button colorScheme="blue" onClick={() => navigate('/saved-estimates')}>
                            Save and Exit
                        </Button> */}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Detailed Rehab Calculator Modal */}
      <DetailedRehabCalculatorModal
        isOpen={isDetailedRehabModalOpen}
        onClose={handleCloseDetailedRehabCalculator}
        onCalculationComplete={(calculation) => {
          // Only update highRehab
          const results = {
            highRehab: calculation.highRehab,
          };
          handleDetailedRehabResults(results);
        }}
        propertyData={{
          squareFootage: propertyDetails?.square_footage || 0,
          marketName: propertyDetails?.city
            ? `${propertyDetails.city}, ${
                propertyDetails.state_abbreviation || "TN"
              }`
            : "Memphis, TN",
          afterRepairValue:
            activeInvestmentTab === 0
              ? underwriteState.rent.afterRepairValue || 0
              : underwriteState.flip.afterRepairValue || 0,
          state: propertyDetails?.state_abbreviation || "TN",
          county: propertyDetails?.county || "Shelby",
        }}
        presetValues={conditionRehabValues}
      />

      {/* Sq Ft Rehab Calculator Modal */}
      <SqFtRehabCalculatorModal
        isOpen={isSqFtRehabModalOpen}
        onClose={handleCloseSqFtRehabCalculator}
        onCalculationComplete={(calculation) => {
          // Update highRehab with SqFt calculation
          const results = {
            highRehab: calculation.highRehab,
          };
          handleSqFtRehabResults(results);
        }}
        propertyData={{
          squareFootage: propertyDetails?.square_footage || 0,
          marketName: propertyDetails?.city
            ? `${propertyDetails.city}, ${
                propertyDetails.state_abbreviation || "TN"
              }`
            : "Memphis, TN",
        }}
      />

      {/* BuyerDetailDrawer for displaying details of a selected buyer */}
      {selectedBuyer && (
        <BuyerDetailDrawer
          isOpen={selectedBuyer !== null}
          onClose={() => setSelectedBuyer(null)}
          buyer={selectedBuyer}
          subjectPropertyZipCode={propertyDetails?.zip_code || ""}
          onCloseParentDrawer={onCloseBuyersDrawer}
        />
      )}

      {/* BulkSkipTraceModal for skip tracing multiple buyers */}
      <BulkSkipTraceModal
        isOpen={isBulkSkipTraceModalOpen}
        onClose={onCloseBulkSkipTraceModal}
        selectedBuyers={selectedBuyers
          .map((buyerId) =>
            filteredBuyers.find((buyer) => (buyer.id || buyer.name) === buyerId)
          )
          .filter((buyer): buyer is Buyer => buyer !== undefined)
          .filter(
            (buyer) =>
              !isInNetworkBuyer(buyer.name) && !isBuyerAlreadyTraced(buyer.name)
          )}
        breakdown={{
          total: bulkSkipTraceBreakdown.total,
          inNetwork: bulkSkipTraceBreakdown.inNetwork,
          alreadyTraced: bulkSkipTraceBreakdown.alreadyTraced,
          newToTrace: bulkSkipTraceBreakdown.newToTrace,
        }}
        onStartBackgroundProcessing={performBackgroundBulkSkipTrace}
        onComplete={(results) => {
          // The BulkSkipTraceModal already handles updating the Redux store
          // Results can be accessed through the skip trace history/state
          onCloseBulkSkipTraceModal();
        }}
      />

      {/* Sticky Bottom Action Bar (Step 3) */}
      <Box
        position="fixed"
        left={0}
        right={0}
        bottom={0}
        width="100%"
        zIndex={1200}
        bg={bgPrimary}
        borderTopWidth="1px"
        borderColor="gray.200"
        boxShadow="md"
        px={{ base: 4, md: 6 }}
        py={{ base: 2, md: 3 }}
        pb={{ base: "calc(env(safe-area-inset-bottom) + 8px)", md: 3 }}
      >
        <Flex
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap={{ base: 2, md: 4 }}
        >
          <Box flex={1} minW={0}>
            <Text
              fontWeight="semibold"
              color={textSecondary}
              isTruncated
              title={
                (selectedAddress?.formattedAddress ||
                  addressState?.formattedAddress ||
                  underwriteState?.currentAddress ||
                  "") as string
              }
            >
              {selectedAddress?.formattedAddress ||
                addressState?.formattedAddress ||
                underwriteState?.currentAddress ||
                ""}
            </Text>
            <Text fontSize="sm" color={textPrimary} fontWeight="bold">
              Buyer Est. Offer{" "}
                {formatCurrency(
                  (underwriteState?.buyerEstimatedPrice?.buyerEstimatedOffer ||
                    0) as number
                )}
            </Text>
          </Box>

          <HStack
            spacing={2}
            justify={{ base: "flex-start", md: "flex-end" }}
            wrap="wrap"
          >
            <Menu>
              <MenuButton
                as={Button}
                leftIcon={<Icon as={FaDownload as React.ElementType} />}
                colorScheme="gray"
                size="sm"
                variant="outline"
              >
                Create Report
              </MenuButton>
              <MenuList
                minW="auto"
                w="fit-content"
                borderColor="green.800"
                borderWidth="1px"
                boxShadow="lg"
              >
                <MenuItem 
                  onClick={() => {
                    setResetNeighborhoodComps(true); // Reset neighborhood comps when opening investor report modal
                    setIsStrategyPromptOpen(true);
                  }}
                  color="green.800"
                  fontWeight="bold"
                  _hover={{ bg: "green.100", color: "green.700" }}
                >
                  Investor Report
                </MenuItem>
                <MenuItem 
                  onClick={() => {
                    setResetSellerComps(true); // Reset seller comps when opening seller report modal
                    setIsSellerStrategyPromptOpen(true);
                  }}
                  color="green.800"
                  fontWeight="bold"
                  _hover={{ bg: "green.100", color: "green.700" }}
                >
                  Seller Report
                </MenuItem>
              </MenuList>
            </Menu>
            <Button
              leftIcon={<Icon as={FaUser as React.ElementType} />}
              colorScheme="brand"
              size="sm"
              variant="solid"
              onClick={onOpenBuyersDrawerWithFetch}
            >
              See Buyers
            </Button>
            <Button
              leftIcon={<Icon as={FaLocationArrow as React.ElementType} />}
              colorScheme="brand"
              size="sm"
              onClick={onNext}
            >
              Get Offers
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Strategy Selection Modal */}
      <CommonModal
        isOpen={isStrategyPromptOpen}
        onClose={() => setIsStrategyPromptOpen(false)}
        title="Select Strategy & Comparables"
        size="xl"
      >
        <VStack spacing={6} align="stretch" maxH="85vh" overflowY="auto">
          {/* Strategy Selection */}
          <Box>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              Choose Investment Strategy *
            </Text>
            <Text fontSize="sm" color="text.secondary" mb={3}>
              Select either Rent or Flip strategy for the investor report.
            </Text>
            <HStack spacing={3}>
              <Button
                colorScheme="brand"
                variant={reportStrategy === 'rent' ? 'solid' : 'outline'}
                onClick={() => setReportStrategy('rent')}
                flex={1}
              >
                Rent
              </Button>
              <Button
                colorScheme="brand"
                variant={reportStrategy === 'flip' ? 'solid' : 'outline'}
                onClick={() => setReportStrategy('flip')}
                flex={1}
              >
                Flip
              </Button>
            </HStack>
          </Box>

          {/* Neighborhood Comparables Selection */}
          <Box>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              Select Neighborhood Comparables (Optional)
            </Text>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Choose up to 2 rental and 2 sold comparables to include in the investor report. If none are selected, the system will automatically choose the best comparables.
            </Text>
            <NeighborhoodCompsSelection
              properties={allProperties as any}
              onSelectionChange={setSelectedNeighborhoodComps}
              maxRentalSelections={2}
              maxSoldSelections={2}
              showSelectionCount={true}
              propertyLatLng={{
                lat: addressState.lat,
                lng: addressState.lng,
              }}
              address={addressState.formattedAddress}
              radiusMiles={2}
              resetSelection={resetNeighborhoodComps}
              hideFilters={false}
            />
          </Box>

          <Box position="sticky" bottom={0} bg="white" pt={4} borderTop="1px" borderColor="gray.200" mt={4}>
            <HStack justify="flex-end">
              <Button variant="outline" onClick={() => setIsStrategyPromptOpen(false)}>Cancel</Button>
              <Button
                colorScheme="brand"
                isDisabled={!reportStrategy}
                onClick={() => {
                  // For now, only store locally and open the existing report modal
                  try {
                    // Log current Redux snapshot at the moment of opening the report
                    console.log('[EstimatedOfferStep] Redux snapshot at report open:', {
                      activeStrategy: underwriteState?.activeStrategy,
                      rent: {
                        highRehab: underwriteState?.rent?.highRehab,
                        detailedContingency: underwriteState?.rent?.detailedContingency,
                        detailedMiscAmount: underwriteState?.rent?.detailedMiscAmount,
                        detailedCategories: underwriteState?.rent?.detailedCategories,
                      },
                      flip: {
                        highRehab: underwriteState?.flip?.highRehab,
                        detailedContingency: underwriteState?.flip?.detailedContingency,
                        detailedMiscAmount: underwriteState?.flip?.detailedMiscAmount,
                        detailedCategories: underwriteState?.flip?.detailedCategories,
                      },
                    });
                  } catch (e) {}
                  setIsStrategyPromptOpen(false);
                  setIsReportModalOpen(true);
                }}
              >
                Generate Report
              </Button>
            </HStack>
          </Box>
        </VStack>
      </CommonModal>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onResetComps={() => setResetNeighborhoodComps(true)}
        reportStrategy={(reportStrategy as 'rent' | 'flip') || underwriteState?.activeStrategy}
        presetValues={conditionRehabValues}
        selectedNeighborhoodComps={selectedNeighborhoodComps}
        estimateData={{
          selectedAddress,
          addressState,
          property,
          rentUnderwriteValues: underwriteState?.rent,
          flipUnderwriteValues: underwriteState?.flip,
          offerRangeLow: underwriteState?.rent?.offerRangeLow || underwriteState?.flip?.offerRangeLow,
          offerRangeHigh: underwriteState?.rent?.offerRangeHigh || underwriteState?.flip?.offerRangeHigh,
        }}
      />

      {/* Seller Strategy Selection Modal */}
      <CommonModal
        isOpen={isSellerStrategyPromptOpen}
        onClose={() => setIsSellerStrategyPromptOpen(false)}
        title="Select Strategy & Comparables"
        size="xl"
      >
        <VStack spacing={6} align="stretch" maxH="85vh" overflowY="auto">
          {/* Strategy Selection */}
          <Box>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              Choose Investment Strategy *
            </Text>
            <Text fontSize="sm" color="text.secondary" mb={3}>
              Select either Rent or Flip strategy for the seller report.
            </Text>
            <HStack spacing={3}>
              <Button
                colorScheme="brand"
                variant={sellerReportStrategy === 'rent' ? 'solid' : 'outline'}
                onClick={() => setSellerReportStrategy('rent')}
                flex={1}
              >
                Rent
              </Button>
              <Button
                colorScheme="brand"
                variant={sellerReportStrategy === 'flip' ? 'solid' : 'outline'}
                onClick={() => setSellerReportStrategy('flip')}
                flex={1}
              >
                Flip
              </Button>
            </HStack>
          </Box>

          {/* Comparables Selection */}
          <Box>
            <Text fontSize="md" fontWeight="semibold" mb={3}>
              Select Comparables (Optional)
            </Text>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Choose up to 4 comparables to include in the seller report. If none are selected, the system will automatically choose the best 4 based on proximity and price similarity.
            </Text>
            <InvestorCompsSelection
              buyers={buyers}
              currentZipCode={propertyDetails?.zip_code || ""}
              propertyLatLng={{
                lat: addressState.lat,
                lng: addressState.lng,
              }}
              isVisible={buyers.length > 0}
              onSelectionChange={setSelectedComps}
              maxSelections={4}
              showSelectionCount={true}
              hideFilters={false}
              resetSelection={resetSellerComps}
            />
          </Box>

          <Box position="sticky" bottom={0} bg="white" pt={4} borderTop="1px" borderColor="gray.200" mt={4}>
            <HStack justify="flex-end">
              <Button variant="outline" onClick={() => setIsSellerStrategyPromptOpen(false)}>Cancel</Button>
              <Button
                colorScheme="brand"
                isDisabled={!sellerReportStrategy}
                onClick={() => {
                  setIsSellerStrategyPromptOpen(false);
                  setIsSellerReportModalOpen(true);
                }}
              >
                Generate Report
              </Button>
            </HStack>
          </Box>
        </VStack>
      </CommonModal>

      {/* Seller Report Modal */}
      <SellerReportModal
        isOpen={isSellerReportModalOpen}
        onClose={() => setIsSellerReportModalOpen(false)}
        onResetComps={() => setResetSellerComps(true)}
        reportStrategy={sellerReportStrategy || 'flip'}
        presetValues={conditionRehabValues}
        selectedComps={selectedComps}
        estimateData={{
          selectedAddress,
          addressState,
          property,
          rentUnderwriteValues: underwriteState?.rent,
          flipUnderwriteValues: underwriteState?.flip,
          offerRangeLow: underwriteState?.rent?.offerRangeLow || underwriteState?.flip?.offerRangeLow,
          offerRangeHigh: underwriteState?.rent?.offerRangeHigh || underwriteState?.flip?.offerRangeHigh,
        }}
      />
    </Box>
  );
};

export default EstimatedOfferStep;
