import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Checkbox,
    Text,
    VStack,
    HStack,
    Button,
    Flex,
    Input,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    SimpleGrid,
    Icon,
    useColorModeValue,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { FaChevronDown, FaCaretUp, FaCaretDown, FaChevronRight, FaFilter } from 'react-icons/fa';
import AddressMap from '../../address/components/AddressMap';
import type { Buyer } from '../../store/buyerSlice';

// Types aligned with existing usage in EstimatedOfferStep (to avoid changing callers)
interface InvestorCompsSelectionProps {
  buyers: Buyer[];
  currentZipCode: string; // not used for filtering here, but preserved for signature parity
  propertyLatLng: { lat: number; lng: number };
  isVisible: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  maxSelections?: number; // Neighborhood component handles separate caps; we'll map to 4 total
  showSelectionCount?: boolean;
  hideFilters?: boolean; // Neighborhood view has no investor filters; preserved for parity
  address?: string;
  radiusMiles?: number;
  resetSelection?: boolean; // New prop to trigger selection reset
}

// Minimal RelatedProperty shape expected by NeighborhoodCompsSelection
interface RelatedProperty {
  id?: string | number;
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
  date?: string;
  latitude?: number;
  longitude?: number;
  investor?: string;
}

// Define sort orders
type InvestorSortOrder = 
  | 'Investor' 
  | 'Investor Reverse'
  | 'Address'
  | 'Address Reverse'
  | 'Date'
  | 'Date Reverse'
  | 'Price (Low to High)'
  | 'Price (High to Low)'
  | 'Distance'
  | 'Distance Reverse'
  | 'Bed'
  | 'Bed Reverse'
  | 'Bath'
  | 'Bath Reverse'
  | 'Sqft'
  | 'Sqft Reverse'
  | 'Year'
  | 'Year Reverse';

const haversineMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const InvestorCompsSelection: React.FC<InvestorCompsSelectionProps> = ({
  buyers,
  currentZipCode,
  propertyLatLng,
  isVisible,
  onSelectionChange,
  maxSelections = 4,
  showSelectionCount = true,
  hideFilters,
  address = '',
  radiusMiles = 2,
  resetSelection = false,
}) => {
  // State for property selection
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // State for sorting
  const [sortOrder, setSortOrder] = useState<InvestorSortOrder>('Date Reverse');
  
  // State for filtering
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number[]>([]);
  const [selectedBathrooms, setSelectedBathrooms] = useState<number[]>([]);
  const [sqftMin, setSqftMin] = useState<string>('');
  const [sqftMax, setSqftMax] = useState<string>('');
  const [yearMin, setYearMin] = useState<string>('');
  const [yearMax, setYearMax] = useState<string>('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [distanceMin, setDistanceMin] = useState('0.0');
  const [distanceMax, setDistanceMax] = useState('2.0');
  
  // State for sold timeframe filter
  const [soldStartMonths, setSoldStartMonths] = useState('');
  const [soldEndMonths, setSoldEndMonths] = useState('18');
  
  // State for filter expansion
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Reset selection when resetSelection prop changes
  useEffect(() => {
    if (resetSelection) {
      setSelectedPropertyIds([]);
      onSelectionChange?.([]);
    }
  }, [resetSelection, onSelectionChange]);

  // Theme colors
  const bgSecondary = useColorModeValue('gray.50', 'gray.700');
  const borderPrimary = useColorModeValue('gray.200', 'gray.600');

  const properties: RelatedProperty[] = useMemo(() => {
    if (!isVisible || !buyers || buyers.length === 0) return [];

    const out: RelatedProperty[] = [];
    buyers.forEach((buyer) => {
      if (!buyer.purchase_history || buyer.purchase_history.length === 0) return;

      buyer.purchase_history.forEach((purchase: any, idx: number) => {
        // Prefer enhanced fields if present; fallback to legacy
        const addressStr =
          purchase.prop_address_line_txt || purchase.address || '';
        const city = purchase.prop_city_nm || '';
        const state = purchase.prop_state_nm || '';
        const zip = purchase.prop_zip_cd || '';
        const latitude = purchase.prop_latitude;
        const longitude = purchase.prop_longitude;

        // Only include valid coordinates
        if (
          latitude === undefined ||
          longitude === undefined ||
          isNaN(Number(latitude)) ||
          isNaN(Number(longitude))
        ) {
          return;
        }

        // Price
        let price: number | undefined = undefined;
        if (typeof purchase.prop_last_sale_amt === 'number') {
          price = purchase.prop_last_sale_amt;
        } else if (typeof purchase.price === 'number') {
          price = purchase.price;
        } else if (typeof purchase.price === 'string') {
          price = parseFloat(purchase.price.replace(/[^0-9.-]+/g, '') || '0');
        }

        // Date
        const soldDate: string = purchase.prop_last_sale_dt || purchase.date || '';

        // Calculate distance
        const distance = haversineMiles(
          propertyLatLng.lat,
          propertyLatLng.lng,
          Number(latitude),
          Number(longitude)
        );

        out.push({
          id: `${buyer.id || buyer.name || 'unknown'}-${idx}`,
          address: addressStr,
          city,
          state,
          zipCode: zip,
          price,
          squareFootage: purchase.prop_attr_sqft_nr,
          bedrooms: purchase.prop_attr_br_cnt,
          bathrooms: purchase.prop_attr_bth_cnt,
          yearBuilt: purchase.prop_yr_blt_nr,
          distance,
          status: 'SOLD',
          soldDate,
          latitude: Number(latitude),
          longitude: Number(longitude),
          investor: buyer.name,
        });
      });
    });

    // Filter to radius (default 2 miles) and sort by nearest
    const withinRadius = out.filter((p) =>
      typeof p.distance === 'number' ? (p.distance as number) <= radiusMiles : true
    );
    return withinRadius.sort(
      (a, b) => (Number(a.distance) || 0) - (Number(b.distance) || 0)
    );
  }, [buyers, isVisible, propertyLatLng, radiusMiles]);

  // Get unique values for filter dropdowns
  const uniqueInvestors = useMemo(() => {
    const investorSet = new Set(properties.map(p => p.investor || ''));
    const investors = Array.from(investorSet).filter(Boolean);
    return investors.sort();
  }, [properties]);

  const uniqueBedrooms = useMemo(() => {
    const bedroomSet = new Set(properties
      .map(p => p.bedrooms)
      .filter(b => b !== undefined && b !== null)
    );
    return Array.from(bedroomSet).sort((a, b) => a! - b!);
  }, [properties]);

  const uniqueBathrooms = useMemo(() => {
    const bathroomSet = new Set(properties
      .map(p => p.bathrooms)
      .filter(b => b !== undefined && b !== null)
    );
    return Array.from(bathroomSet).sort((a, b) => a! - b!);
  }, [properties]);

  // Filter properties by all criteria
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Apply investor filter
    if (selectedInvestors.length > 0) {
      filtered = filtered.filter(p => selectedInvestors.includes(p.investor || ''));
    }

    // Apply bedroom filter
    if (selectedBedrooms.length > 0) {
      filtered = filtered.filter(p => 
        p.bedrooms !== undefined && p.bedrooms !== null && 
        selectedBedrooms.includes(p.bedrooms)
      );
    }

    // Apply bathroom filter
    if (selectedBathrooms.length > 0) {
      filtered = filtered.filter(p => 
        p.bathrooms !== undefined && p.bathrooms !== null && 
        selectedBathrooms.includes(p.bathrooms)
      );
    }

    // Apply square footage filter
    const sqftMinNum = sqftMin ? parseInt(sqftMin) : null;
    const sqftMaxNum = sqftMax ? parseInt(sqftMax) : null;
    if (sqftMinNum !== null || sqftMaxNum !== null) {
      filtered = filtered.filter(p => {
        if (!p.squareFootage) return false;
        if (sqftMinNum !== null && p.squareFootage < sqftMinNum) return false;
        if (sqftMaxNum !== null && p.squareFootage > sqftMaxNum) return false;
        return true;
      });
    }

    // Apply year built filter
    const yearMinNum = yearMin ? parseInt(yearMin) : null;
    const yearMaxNum = yearMax ? parseInt(yearMax) : null;
    if (yearMinNum !== null || yearMaxNum !== null) {
      filtered = filtered.filter(p => {
        if (!p.yearBuilt) return false;
        if (yearMinNum !== null && p.yearBuilt < yearMinNum) return false;
        if (yearMaxNum !== null && p.yearBuilt > yearMaxNum) return false;
        return true;
      });
    }

    // Apply price filter
    const priceMinNum = priceMin ? parseFloat(priceMin) : null;
    const priceMaxNum = priceMax ? parseFloat(priceMax) : null;
    if (priceMinNum !== null || priceMaxNum !== null) {
      filtered = filtered.filter(p => {
        if (p.price === undefined || p.price === null) return false;
        if (priceMinNum !== null && p.price < priceMinNum) return false;
        if (priceMaxNum !== null && p.price > priceMaxNum) return false;
        return true;
      });
    }

    // Apply distance filter
    const distanceMinNum = distanceMin ? parseFloat(distanceMin) : null;
    const distanceMaxNum = distanceMax ? parseFloat(distanceMax) : null;
    if (distanceMinNum !== null || distanceMaxNum !== null) {
      filtered = filtered.filter(p => {
        if (p.distance === undefined || p.distance === null) return false;
        const numDistance = typeof p.distance === 'string' ? parseFloat(p.distance) : p.distance;
        if (distanceMinNum !== null && numDistance < distanceMinNum) return false;
        if (distanceMaxNum !== null && numDistance > distanceMaxNum) return false;
        return true;
      });
    }

    // Apply sold timeframe filter (months ago)
    const now = new Date();
    const soldStart = soldStartMonths ? parseInt(soldStartMonths) : null;
    const soldEnd = soldEndMonths ? parseInt(soldEndMonths) : null;
    if (soldStart !== null || soldEnd !== null) {
      filtered = filtered.filter(p => {
        if (!p.soldDate) return false;
        const soldDate = new Date(p.soldDate);
        const monthsAgo = (now.getFullYear() - soldDate.getFullYear()) * 12 + (now.getMonth() - soldDate.getMonth());
        if (soldStart !== null && monthsAgo < soldStart) return false;
        if (soldEnd !== null && monthsAgo > soldEnd) return false;
        return true;
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch(sortOrder) {
        case 'Investor':
          return (a.investor || '').localeCompare(b.investor || '');
        case 'Investor Reverse':
          return (b.investor || '').localeCompare(a.investor || '');
        case 'Address':
          return a.address.localeCompare(b.address);
        case 'Address Reverse':
          return b.address.localeCompare(a.address);
        case 'Date':
          return new Date(a.soldDate || '').getTime() - new Date(b.soldDate || '').getTime();
        case 'Date Reverse':
          return new Date(b.soldDate || '').getTime() - new Date(a.soldDate || '').getTime();
        case 'Price (Low to High)':
          return (a.price || 0) - (b.price || 0);
        case 'Price (High to Low)':
          return (b.price || 0) - (a.price || 0);
        case 'Distance':
          return (Number(a.distance) || 0) - (Number(b.distance) || 0);
        case 'Distance Reverse':
          return (Number(b.distance) || 0) - (Number(a.distance) || 0);
        case 'Bed':
          return (a.bedrooms || 0) - (b.bedrooms || 0);
        case 'Bed Reverse':
          return (b.bedrooms || 0) - (a.bedrooms || 0);
        case 'Bath':
          return (a.bathrooms || 0) - (b.bathrooms || 0);
        case 'Bath Reverse':
          return (b.bathrooms || 0) - (a.bathrooms || 0);
        case 'Sqft':
          return (a.squareFootage || 0) - (b.squareFootage || 0);
        case 'Sqft Reverse':
          return (b.squareFootage || 0) - (a.squareFootage || 0);
        case 'Year':
          return (a.yearBuilt || 0) - (b.yearBuilt || 0);
        case 'Year Reverse':
          return (b.yearBuilt || 0) - (a.yearBuilt || 0);
        default:
          return 0;
      }
    });
  }, [
    properties,
    selectedInvestors,
    selectedBedrooms,
    selectedBathrooms,
    sqftMin,
    sqftMax,
    yearMin,
    yearMax,
    priceMin,
    priceMax,
    distanceMin,
    distanceMax,
    soldStartMonths,
    soldEndMonths,
    sortOrder
  ]);

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format distance
  const formatDistance = (distance?: string | number) => {
    if (distance === undefined || distance === null) return 'N/A';
    const numDistance = typeof distance === 'string' ? parseFloat(distance) : distance;
    if (isNaN(numDistance)) return 'N/A';
    return `${numDistance.toFixed(1)} mi`;
  };

  // Handle individual property selection
  const handlePropertySelect = useCallback((property: RelatedProperty, isChecked: boolean) => {
    if (!property.id) return;
    
    const propertyId = property.id.toString();
    
    if (isChecked) {
      if (selectedPropertyIds.length >= maxSelections) {
        return; // Don't allow selection if at max
      }
      const newSelection = [...selectedPropertyIds, propertyId];
      setSelectedPropertyIds(newSelection);
      onSelectionChange?.(newSelection);
    } else {
      const newSelection = selectedPropertyIds.filter(id => id !== propertyId);
      setSelectedPropertyIds(newSelection);
      onSelectionChange?.(newSelection);
    }
  }, [selectedPropertyIds, maxSelections, onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((isChecked: boolean) => {
    if (isChecked) {
      // Only select up to maxSelections
      const limitedSelection = filteredProperties.slice(0, maxSelections).map(p => p.id?.toString()).filter(Boolean) as string[];
      setSelectedPropertyIds(limitedSelection);
      onSelectionChange?.(limitedSelection);
    } else {
      setSelectedPropertyIds([]);
      onSelectionChange?.([]);
    }
  }, [filteredProperties, maxSelections, onSelectionChange]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setSelectedPropertyIds([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  if (!isVisible) return null;

  return (
    <Box w="100%">
      <VStack spacing={4} align="stretch">
        {/* Map and Properties Section */}
        <Box
          p={{ base: 3, md: 5 }}
          borderRadius="md"
          bg="white"
          borderWidth="1px"
          borderColor={borderPrimary}
          boxShadow="md"
          overflow="hidden"
        >
          {/* Property Map */}
          {propertyLatLng && (
            <Box
              h={{ base: "250px", md: "300px" }}
              mb={{ base: 4, md: 6 }}
              borderRadius="md"
              overflow="hidden"
              borderWidth="1px"
              borderColor={borderPrimary}
              position="relative"
            >
              <AddressMap
                key="investor-property-map"
                latitude={propertyLatLng.lat}
                longitude={propertyLatLng.lng}
                address={address}
                forceEmptyProperties={filteredProperties.length === 0}
                properties={filteredProperties.map(
                  (p) => ({ ...p, id: String(p.id || "") } as any)
                )}
                radiusMiles={radiusMiles}
                showProperties={true}
                height="300px"
                highlightedPropertyId={undefined}
                selectedPropertyIds={selectedPropertyIds}
              />
            </Box>
          )}

          {/* Filters */}
          {!hideFilters && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={4}
              bg="white"
              mb={4}
              boxShadow="sm"
            >
              {/* First Row: Filter Button and Property Count */}
              <Flex justify="space-between" align="center" mb={2}>
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  leftIcon={<Icon as={FaFilter as React.ElementType} />}
                  rightIcon={<Icon as={isFiltersExpanded ? FaChevronDown as React.ElementType : FaChevronRight as React.ElementType} />}
                  color="white"
                  bg="green.800"
                  _hover={{ 
                    bg: "white",
                    color:"green.800"  
                  }}
                  _active={{
                    bg: "white",
                    color:"green.800"
                  }}
                  fontWeight="bold"
                  borderRadius="md"
                  px={4}
                  py={1}
                >
                  Filters
                </Button>
                <Flex align="center">
                  <Text fontWeight="bold" fontSize="md" mr={2}>Total Properties:</Text>
                  <Badge
                    bg="green.800"
                    color="white"
                    fontWeight="bold"
                    fontSize="md"
                    px={4}
                    py={1}
                    borderRadius="md"
                  >
                    {filteredProperties.length}
                  </Badge>
                </Flex>
              </Flex>

              {/* Collapsible Filter Content */}
              {isFiltersExpanded && (
                <>
                  {/* Investor Dropdown */}
                  <Menu closeOnSelect={false} matchWidth>
                    <MenuButton
                      as={Button}
                      rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                      size="md"
                      variant="outline"
                      width="100%"
                      textAlign="left"
                      fontWeight="normal"
                      color="gray.600"
                      borderColor="gray.200"
                      mb={4}
                      _hover={{ borderColor: "gray.300" }}
                      _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                    >
                      {selectedInvestors.length === 0
                        ? "All Investors"
                        : `${selectedInvestors.length} selected`
                      }
                    </MenuButton>
                    <Box width="100%">
                      <MenuList maxHeight="300px" overflowY="auto" minW="unset" w="100%" p={0}>
                        {/* All Investors option */}
                        <Box px={3} py={1} borderBottom="1px solid" borderColor="gray.200">
                          <Checkbox
                            isChecked={selectedInvestors.length === uniqueInvestors.length && uniqueInvestors.length > 0}
                            isIndeterminate={selectedInvestors.length > 0 && selectedInvestors.length < uniqueInvestors.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInvestors(uniqueInvestors);
                              } else {
                                setSelectedInvestors([]);
                              }
                            }}
                            colorScheme="green"
                            fontWeight="bold"
                          >
                            All Investors
                          </Checkbox>
                        </Box>
                        {uniqueInvestors.map(investor => (
                          <Box key={investor} px={3} py={1}>
                            <Checkbox
                              isChecked={selectedInvestors.includes(investor)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInvestors(prev => [...prev, investor]);
                                } else {
                                  setSelectedInvestors(prev => prev.filter(i => i !== investor));
                                }
                              }}
                              colorScheme="green"
                            >
                              {investor}
                            </Checkbox>
                          </Box>
                        ))}
                      </MenuList>
                    </Box>
                  </Menu>

                  {/* First Row: Price Range, Square Footage, Year Built */}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={2}>
                    {/* Price Range */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Price Range</Text>
                      <Flex gap={2}>
                        <Input
                          placeholder="Min"
                          size="md"
                          value={priceMin}
                          onChange={e => setPriceMin(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                        <Input
                          placeholder="Max"
                          size="md"
                          value={priceMax}
                          onChange={e => setPriceMax(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </Flex>
                    </Box>
                    {/* Square Footage */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Square Footage</Text>
                      <Flex gap={2}>
                        <Input
                          placeholder="Min"
                          size="md"
                          value={sqftMin}
                          onChange={e => setSqftMin(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                        <Input
                          placeholder="Max"
                          size="md"
                          value={sqftMax}
                          onChange={e => setSqftMax(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </Flex>
                    </Box>
                    {/* Year Built */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Year Built</Text>
                      <Flex gap={2}>
                        <Input
                          placeholder="Min"
                          size="md"
                          value={yearMin}
                          onChange={e => setYearMin(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                        <Input
                          placeholder="Max"
                          size="md"
                          value={yearMax}
                          onChange={e => setYearMax(e.target.value)}
                          type="number"
                          onWheel={e => e.currentTarget.blur()}
                          onKeyDown={e => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </Flex>
                    </Box>
                  </SimpleGrid>

                  {/* Second Row: Beds, Baths, Distance */}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={2}>
                    {/* Beds */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Beds</Text>
                      <Menu closeOnSelect={false}>
                        <MenuButton
                          as={Button}
                          rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                          size="md"
                          variant="outline"
                          width="100%"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                        >
                          {selectedBedrooms.length === 0
                            ? "All Bedrooms"
                            : `${selectedBedrooms.length} selected`
                          }
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          {/* All Bedrooms option */}
                          <Box px={3} py={1} borderBottom="1px solid" borderColor="gray.200">
                            <Checkbox
                              isChecked={selectedBedrooms.length === uniqueBedrooms.length && uniqueBedrooms.length > 0}
                              isIndeterminate={selectedBedrooms.length > 0 && selectedBedrooms.length < uniqueBedrooms.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBedrooms(uniqueBedrooms.map(b => b!));
                                } else {
                                  setSelectedBedrooms([]);
                                }
                              }}
                              colorScheme="green"
                              fontWeight="bold"
                            >
                              All Bedrooms
                            </Checkbox>
                          </Box>
                          {uniqueBedrooms.map(bed => (
                            <Box key={bed} px={3} py={1}>
                              <Checkbox
                                isChecked={selectedBedrooms.includes(bed!)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBedrooms(prev => [...prev, bed!]);
                                  } else {
                                    setSelectedBedrooms(prev => prev.filter(b => b !== bed));
                                  }
                                }}
                                colorScheme="green"
                              >
                                {bed} bed{bed !== 1 ? 's' : ''}
                              </Checkbox>
                            </Box>
                          ))}
                        </MenuList>
                      </Menu>
                    </Box>
                    {/* Baths */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Baths</Text>
                      <Menu closeOnSelect={false}>
                        <MenuButton
                          as={Button}
                          rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                          size="md"
                          variant="outline"
                          width="100%"
                          textAlign="left"
                          fontWeight="normal"
                          color="gray.600"
                          borderColor="gray.200"
                          _hover={{ borderColor: "gray.300" }}
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                        >
                          {selectedBathrooms.length === 0
                            ? "All Bathrooms"
                            : `${selectedBathrooms.length} selected`
                          }
                        </MenuButton>
                        <MenuList maxHeight="200px" overflowY="auto">
                          {/* All Bathrooms option */}
                          <Box px={3} py={1} borderBottom="1px solid" borderColor="gray.200">
                            <Checkbox
                              isChecked={selectedBathrooms.length === uniqueBathrooms.length && uniqueBathrooms.length > 0}
                              isIndeterminate={selectedBathrooms.length > 0 && selectedBathrooms.length < uniqueBathrooms.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBathrooms(uniqueBathrooms.map(b => b!));
                                } else {
                                  setSelectedBathrooms([]);
                                }
                              }}
                              colorScheme="green"
                              fontWeight="bold"
                            >
                              All Bathrooms
                            </Checkbox>
                          </Box>
                          {uniqueBathrooms.map(bath => (
                            <Box key={bath} px={3} py={1}>
                              <Checkbox
                                isChecked={selectedBathrooms.includes(bath!)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBathrooms(prev => [...prev, bath!]);
                                  } else {
                                    setSelectedBathrooms(prev => prev.filter(b => b !== bath));
                                  }
                                }}
                                colorScheme="green"
                              >
                                {bath} bath{bath !== 1 ? 's' : ''}
                              </Checkbox>
                            </Box>
                          ))}
                        </MenuList>
                      </Menu>
                    </Box>
                    {/* Distance */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Distance</Text>
                      <Flex gap={2}>
                        {/* Min Distance Dropdown */}
                        <Menu closeOnSelect={true}>
                          <MenuButton
                            as={Button}
                            rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                            size="md"
                            variant="outline"
                            width="100%"
                            textAlign="left"
                            fontWeight="normal"
                            color="gray.600"
                            borderColor="gray.200"
                            _hover={{ borderColor: "gray.300" }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                          >
                            {distanceMin ? `${distanceMin} mi` : "0.0 mi"}
                          </MenuButton>
                          <MenuList maxHeight="200px" overflowY="auto">
                            {Array.from({ length: 5 }, (_, i) => i * 0.5).map(distance => (
                              <MenuItem 
                                key={distance}
                                onClick={() => setDistanceMin(distance.toFixed(1))}
                                bg={distanceMin === distance.toFixed(1) ? "blue.50" : "transparent"}
                                color={distanceMin === distance.toFixed(1) ? "blue.600" : "inherit"}
                              >
                                {distance.toFixed(1)} mi
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                        
                        {/* Max Distance Dropdown */}
                        <Menu closeOnSelect={true}>
                          <MenuButton
                            as={Button}
                            rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                            size="md"
                            variant="outline"
                            width="100%"
                            textAlign="left"
                            fontWeight="normal"
                            color="gray.600"
                            borderColor="gray.200"
                            _hover={{ borderColor: "gray.300" }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                          >
                            {distanceMax ? `${distanceMax} mi` : "2.0 mi"}
                          </MenuButton>
                          <MenuList maxHeight="200px" overflowY="auto">
                            {Array.from({ length: 5 }, (_, i) => i * 0.5).map(distance => (
                              <MenuItem 
                                key={distance}
                                onClick={() => setDistanceMax(distance.toFixed(1))}
                                bg={distanceMax === distance.toFixed(1) ? "blue.50" : "transparent"}
                                color={distanceMax === distance.toFixed(1) ? "blue.600" : "inherit"}
                              >
                                {distance.toFixed(1)} mi
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                      </Flex>
                    </Box>
                  </SimpleGrid>

                  {/* Third Row: Sold Timeframe */}
                  <Flex align="center" justify="space-between" mt={2} mb={2}>
                    {/* Sold Timeframe */}
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" mb={1}>Sold Timeframe</Text>
                      <Flex gap={2}>
                        {/* Min Sold Timeframe Dropdown */}
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                            size="md"
                            variant="outline"
                            width="120px"
                            textAlign="left"
                            fontWeight="normal"
                            color="gray.600"
                            borderColor="gray.200"
                            _hover={{ borderColor: "gray.300" }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                          >
                            {soldStartMonths === '' || soldStartMonths === '0' ? 'Today' : `${soldStartMonths} Month${soldStartMonths === '1' ? '' : 's'}`}
                          </MenuButton>
                          <MenuList maxHeight="200px" overflowY="auto">
                            <MenuItem onClick={() => setSoldStartMonths('0')}>Today</MenuItem>
                            {Array.from({ length: 18 }, (_, i) => i + 1).map(month => (
                              <MenuItem key={month} onClick={() => setSoldStartMonths(month.toString())}>
                                {month} Month{month === 1 ? '' : 's'}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                        {/* Max Sold Timeframe Dropdown */}
                        <Menu>
                          <MenuButton
                            as={Button}
                            rightIcon={<Icon as={FaChevronDown as React.ElementType} />}
                            size="md"
                            variant="outline"
                            width="130px"
                            textAlign="left"
                            fontWeight="normal"
                            color="gray.600"
                            borderColor="gray.200"
                            _hover={{ borderColor: "gray.300" }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                          >
                            {soldEndMonths === '' || soldEndMonths === '0' ? 'Today' : `${soldEndMonths} Month${soldEndMonths === '1' ? '' : 's'}`}
                          </MenuButton>
                          <MenuList maxHeight="200px" overflowY="auto">
                            <MenuItem onClick={() => setSoldEndMonths('0')}>Today</MenuItem>
                            {Array.from({ length: 18 }, (_, i) => i + 1).map(month => (
                              <MenuItem key={month} onClick={() => setSoldEndMonths(month.toString())}>
                                {month} Month{month === 1 ? '' : 's'}
                              </MenuItem>
                            ))}
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
                        setSelectedInvestors([]);
                        setSelectedBedrooms([]);
                        setSelectedBathrooms([]);
                        setSqftMin('');
                        setSqftMax('');
                        setYearMin('');
                        setYearMax('');
                        setPriceMin('');
                        setPriceMax('');
                        setDistanceMin('0.0');
                        setDistanceMax('2.0');
                        setSoldStartMonths('');
                        setSoldEndMonths('18');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </Flex>
                </>
              )}
            </Box>
          )}

          {/* Selection Count Display */}
          {showSelectionCount && (
            <Box 
              borderWidth="1px" 
              borderColor="blue.200"
              borderRadius="md"
              p={3}
              bg="blue.50"
              mb={4}
            >
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                  Selected: {selectedPropertyIds.length} / {maxSelections}
                </Text>
                {selectedPropertyIds.length > 0 && (
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="blue"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </Button>
                )}
              </Flex>
            </Box>
          )}

          {/* Properties Table */}
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead bg={bgSecondary} top={0} zIndex={1}>
                <Tr>
                  <Th width="40px">
                    <Checkbox 
                      colorScheme="green" 
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      isChecked={selectedPropertyIds.length > 0 && 
                        selectedPropertyIds.length === Math.min(filteredProperties.length, maxSelections) && 
                        filteredProperties.length > 0}
                      isIndeterminate={selectedPropertyIds.length > 0 && 
                        selectedPropertyIds.length < Math.min(filteredProperties.length, maxSelections)}
                    />
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Investor' ? 'Investor Reverse' : 'Investor')}>
                    Investor {sortOrder.includes('Investor') && (
                      <Icon as={sortOrder === 'Investor' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Address' ? 'Address Reverse' : 'Address')}>
                    Address {sortOrder.includes('Address') && (
                      <Icon as={sortOrder === 'Address' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Date' ? 'Date Reverse' : 'Date')}>
                    Date {sortOrder.includes('Date') && (
                      <Icon as={sortOrder === 'Date' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Price (Low to High)' ? 'Price (High to Low)' : 'Price (Low to High)')}>
                    Price {sortOrder.includes('Price') && (
                      <Icon as={sortOrder === 'Price (Low to High)' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Distance' ? 'Distance Reverse' : 'Distance')}>
                    Distance {sortOrder.includes('Distance') && (
                      <Icon as={sortOrder === 'Distance' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Bed' ? 'Bed Reverse' : 'Bed')}>
                    Bed {sortOrder.includes('Bed') && (
                      <Icon as={sortOrder === 'Bed' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Bath' ? 'Bath Reverse' : 'Bath')}>
                    Bath {sortOrder.includes('Bath') && (
                      <Icon as={sortOrder === 'Bath' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Sqft' ? 'Sqft Reverse' : 'Sqft')}>
                    Sqft {sortOrder.includes('Sqft') && (
                      <Icon as={sortOrder === 'Sqft' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                  <Th fontSize="sm" px={1} whiteSpace="nowrap" cursor="pointer"
                      onClick={() => setSortOrder(sortOrder === 'Year' ? 'Year Reverse' : 'Year')}>
                    Year {sortOrder.includes('Year') && (
                      <Icon as={sortOrder === 'Year' ? FaCaretDown as React.ElementType : FaCaretUp as React.ElementType} ml={1} />
                    )}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredProperties.length === 0 ? (
                  <Tr>
                    <Td colSpan={10} textAlign="center" py={4}>
                      <Text>No investor properties available</Text>
                    </Td>
                  </Tr>
                ) : (
                  filteredProperties.map((property) => {
                    const propertyId = property.id?.toString();
                    if (!propertyId) return null;
                    
                    return (
                      <Tr
                        key={propertyId}
                        _hover={{ bg: "rgba(0, 128, 0, 0.1)", cursor: 'pointer' }}
                        bg={selectedPropertyIds.includes(propertyId) ? "rgba(49, 151, 149, 0.1)" : undefined}
                      >
                        <Td onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            colorScheme="green"
                            onChange={(e) => {
                              e.stopPropagation();
                              handlePropertySelect(property, e.target.checked);
                            }}
                            isChecked={selectedPropertyIds.includes(propertyId)}
                            isDisabled={
                              !selectedPropertyIds.includes(propertyId) && selectedPropertyIds.length >= maxSelections
                            }
                          />
                        </Td>
                        <Td fontSize="xs" px={1} maxW="120px" overflow="hidden" textOverflow="ellipsis">
                          <Text fontSize="xs" fontWeight="medium">
                            {property.investor}
                          </Text>
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
                    );
                  }).filter(Boolean)
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
};

export default InvestorCompsSelection;


