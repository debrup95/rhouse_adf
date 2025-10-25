import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Icon,
    Checkbox,
    Text,
    Flex,
    HStack,
    VStack,
    Button,
    Input,
    Menu,
    MenuButton,
    MenuList,
    SimpleGrid,
    MenuItem,
} from '@chakra-ui/react';
import {
    FaCaretDown,
    FaCaretUp,
    FaInfoCircle,
    FaChevronDown,
} from 'react-icons/fa';
import AddressMap from '../../address/components/AddressMap';
import type { Buyer } from '../../store/buyerSlice';
import { extractZipCode, type EnhancedPurchaseHistory } from '../../utils/buyerAnalytics';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { calculateDistancesForProperties } from '../../utils/distanceCalculator';

// Using EnhancedPurchaseHistory from utility

// Enhanced Buyer interface for this component
interface EnhancedBuyer extends Omit<Buyer, 'purchase_history'> {
    purchase_history?: EnhancedPurchaseHistory[];
}

// Types for investor properties
interface InvestorProperty {
    id: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    price?: number;
    squareFootage?: number;
    bedrooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
    distance?: number;
    status: string;
    soldDate?: string;
    investor: string;
    latitude?: number;
    longitude?: number;
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

interface InvestorCompsSectionProps {
    buyers: EnhancedBuyer[];
    currentZipCode: string;
    propertyLatLng: { lat: number; lng: number };
    isVisible: boolean;
    onSelectionChange?: (selectedIds: string[]) => void;
    maxSelections?: number;
    showSelectionCount?: boolean;
    hideFilters?: boolean;
}



/**
 * Investor Comps Section Component
 * 
 * Displays investor properties with real distance calculations using Haversine formula.
 * Properties are filtered to show only those within 15 miles of the subject property
 * and in the same ZIP code, with actual calculated distances instead of simulated values.
 */
const InvestorCompsSection: React.FC<InvestorCompsSectionProps> = ({
    buyers,
    currentZipCode,
    propertyLatLng,
    isVisible,
    onSelectionChange,
    maxSelections = 4,
    showSelectionCount = false,
    hideFilters = false
}) => {
    // Theme colors
    const bgSecondary = 'background.secondary';
    const borderPrimary = 'border.primary';
    const textPrimary = 'text.primary';


    
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
    
    // State for property selection
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);
    
    // New state variables for modern filter
    const [soldStartMonths, setSoldStartMonths] = useState('');
    const [soldEndMonths, setSoldEndMonths] = useState('18');


    // Transform buyer purchase history to investor properties
    const investorProperties = useMemo(() => {
        if (!isVisible || !buyers || buyers.length === 0 || !currentZipCode) {
            return [];
        }

        const properties: InvestorProperty[] = [];

        buyers.forEach(buyer => {
            if (buyer.purchase_history && buyer.purchase_history.length > 0) {

                buyer.purchase_history.forEach((purchase, index) => {
                    // Use the utility function to extract zip code
                    const purchaseZip = extractZipCode(purchase);
                    let address = '';
                    let price: number | undefined;
                    let soldDate = '';
                    
                    // Prefer enhanced backend fields if available
                    if (purchase.prop_zip_cd) {
                        address = purchase.prop_address_line_txt || purchase.address || '';
                        price = purchase.prop_last_sale_amt;
                        soldDate = purchase.prop_last_sale_dt || purchase.date || '';
                    } else {
                        // Fallback to legacy fields
                        address = purchase.address || '';
                        
                        // Parse legacy price
                        if (typeof purchase.price === 'number') {
                            price = purchase.price;
                        } else if (typeof purchase.price === 'string') {
                            price = parseFloat(purchase.price.replace(/[^0-9.-]+/g, '') || '0');
                        }
                        soldDate = purchase.date || '';
                    }
                    
                    // Get coordinates for the property
                    const latitude = purchase.prop_latitude;
                    const longitude = purchase.prop_longitude;
                    
                    // Only include properties with valid coordinates
                    if (latitude !== undefined && longitude !== undefined && 
                        !isNaN(latitude) && !isNaN(longitude)) {
                        
                        properties.push({
                            id: `${buyer.id || buyer.name}-${index}`,
                            address: address,
                            city: purchase.prop_city_nm,
                            state: purchase.prop_state_nm,
                            zipCode: purchaseZip,
                            price: price,
                            squareFootage: purchase.prop_attr_sqft_nr,
                            bedrooms: purchase.prop_attr_br_cnt,
                            bathrooms: purchase.prop_attr_bth_cnt,
                            yearBuilt: purchase.prop_yr_blt_nr,
                            distance: 0, // Will be calculated below
                            status: 'SOLD',
                            soldDate: soldDate,
                            investor: buyer.name,
                            latitude: latitude,
                            longitude: longitude
                        });
                    }
                });
            }
        });

        // Calculate actual distances for all properties using Haversine formula
        const propertiesWithDistances = calculateDistancesForProperties(
            propertyLatLng.lat,
            propertyLatLng.lng,
            properties
        );

        // Filter properties to include only those within 15 miles and in the same ZIP code
        // This ensures we show relevant nearby properties while maintaining ZIP code relevance
        const filteredProperties = propertiesWithDistances.filter(property => {
            const isWithinDistance = property.distance <= 15.0;
            // const isSameZipCode = property.zipCode === currentZipCode;
            return isWithinDistance; // && isSameZipCode;
        });

        return filteredProperties;
    }, [isVisible, buyers, currentZipCode, propertyLatLng]);

    // Get unique values for filter dropdowns
    const uniqueInvestors = useMemo(() => {
        const investorSet = new Set(investorProperties.map(p => p.investor));
        const investors = Array.from(investorSet);
        return investors.sort();
    }, [investorProperties]);

    const uniqueBedrooms = useMemo(() => {
        const bedroomSet = new Set(investorProperties
            .map(p => p.bedrooms)
            .filter(b => b !== undefined && b !== null)
        );
        return Array.from(bedroomSet).sort((a, b) => a! - b!);
    }, [investorProperties]);

    const uniqueBathrooms = useMemo(() => {
        const bathroomSet = new Set(investorProperties
            .map(p => p.bathrooms)
            .filter(b => b !== undefined && b !== null)
        );
        return Array.from(bathroomSet).sort((a, b) => a! - b!);
    }, [investorProperties]);

    // Filter properties by all criteria
    const filteredProperties = useMemo(() => {
        let filtered = investorProperties;

        // Apply investor filter
        if (selectedInvestors.length > 0) {
            filtered = filtered.filter(p => selectedInvestors.includes(p.investor));
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
                if (distanceMinNum !== null && p.distance < distanceMinNum) return false;
                if (distanceMaxNum !== null && p.distance > distanceMaxNum) return false;
                return true;
            });
        }

        // Apply sold timeframe filter (months ago)
        const now = new Date();
        const soldStart = soldStartMonths ? parseInt(soldStartMonths) : null; // e.g. 0 = today
        const soldEnd = soldEndMonths ? parseInt(soldEndMonths) : null; // e.g. 18 = 18 months ago
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
                    return a.investor.localeCompare(b.investor);
                case 'Investor Reverse':
                    return b.investor.localeCompare(a.investor);
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
                    return (a.distance || 0) - (b.distance || 0);
                case 'Distance Reverse':
                    return (b.distance || 0) - (a.distance || 0);
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
        investorProperties,
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



    // Utility functions
    const formatPrice = (price: number | undefined) => {
        if (!price) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(price);
    };

    const formatDistance = (distance: number | undefined) => {
        if (distance === undefined) return 'N/A';
        return `${distance.toFixed(1)} mi`;
    };

    // Event handlers
    const handlePropertyRowClick = useCallback((property: InvestorProperty) => {
        setHighlightedPropertyId(property.id);
    }, []);

    const handlePropertySelect = useCallback((property: InvestorProperty, isChecked: boolean) => {
        if (isChecked) {
            // Check if we're at max selections
            if (selectedPropertyIds.length >= maxSelections) {
                return; // Don't allow selection if at max
            }
            const newSelection = [...selectedPropertyIds, property.id];
            setSelectedPropertyIds(newSelection);
            onSelectionChange?.(newSelection);
        } else {
            const newSelection = selectedPropertyIds.filter(id => id !== property.id);
            setSelectedPropertyIds(newSelection);
            onSelectionChange?.(newSelection);
        }
    }, [selectedPropertyIds, maxSelections, onSelectionChange]);

    const handleSelectAll = useCallback((isChecked: boolean) => {
        if (isChecked) {
            // Only select up to maxSelections
            const limitedSelection = filteredProperties.slice(0, maxSelections).map(p => p.id);
            setSelectedPropertyIds(limitedSelection);
            onSelectionChange?.(limitedSelection);
        } else {
            setSelectedPropertyIds([]);
            onSelectionChange?.([]);
        }
    }, [filteredProperties, maxSelections, onSelectionChange]);

    // Don't render if not visible
    if (!isVisible) {
        return null;
    }

    return (
        <Box w="100%">
            <VStack spacing={4} align="stretch">
                {/* <Heading color={textPrimary} as="h3" size={{ base: "sm", md: "md" }}>
                    Investor Comps
                </Heading> */}

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
                    {/* First Row: Title and Property Count */}
                    <Flex justify="space-between" align="center" mb={2}>
                        <Text fontWeight="bold" fontSize="md">Filter By Investor</Text>
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
                                        {Array.from({ length: 31 }, (_, i) => i * 0.5).map(distance => (
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
                                        {Array.from({ length: 31 }, (_, i) => i * 0.5).map(distance => (
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
                </Box>
                )}

                {/* Map */}
                <Box
                    h={{ base: "250px", md: "300px" }}
                    borderRadius="md"
                    overflow="hidden"
                    borderWidth="1px"
                    borderColor={borderPrimary}
                >
                    <AddressMap
                        latitude={propertyLatLng.lat}
                        longitude={propertyLatLng.lng}
                        address=""
                        forceEmptyProperties={filteredProperties.length === 0}
                        properties={filteredProperties}
                        radiusMiles={2.5}
                        showRadius={false}
                        showProperties={true}
                        height="300px"
                        highlightedPropertyId={highlightedPropertyId}
                        selectedPropertyIds={selectedPropertyIds}
                        onInfoWindowClose={() => setHighlightedPropertyId(null)}
                    />
                </Box>

                {/* Selection Count Display */}
                {showSelectionCount && (
                    <Box 
                        borderWidth="1px" 
                        borderColor="blue.200"
                        borderRadius="md"
                        p={3}
                        bg="blue.50"
                        mb={2}
                    >
                        <Flex justify="space-between" align="center">
                            <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                                Selected Comparables: {selectedPropertyIds.length} / {maxSelections}
                            </Text>
                            {selectedPropertyIds.length > 0 && (
                                <Button
                                    size="xs"
                                    variant="outline"
                                    colorScheme="blue"
                                    onClick={() => {
                                        setSelectedPropertyIds([]);
                                        onSelectionChange?.([]);
                                    }}
                                >
                                    Clear All
                                </Button>
                            )}
                        </Flex>
                    </Box>
                )}

                {/* Scrollable Table */}
                <Box 
                    borderWidth="1px" 
                    borderColor={borderPrimary}
                    borderRadius="md"
                    maxHeight="500px" 
                    overflowY="auto"
                    overflowX="auto"
                >
                    <Table size="sm" variant="simple">
                        <Thead bg={bgSecondary} position="sticky" top={0} zIndex={1}>
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
                                        <Flex direction="column" align="center" py={4}>
                                            <Icon as={FaInfoCircle as React.ElementType} color="blue.400" boxSize={6} mb={2} />
                                            <Text>No investor purchases found in this zipcode</Text>
                                        </Flex>
                                    </Td>
                                </Tr>
                            ) : (
                                filteredProperties.map((property) => (
                                    <Tr 
                                        key={property.id}
                                        _hover={{ bg: "rgba(0, 128, 0, 0.1)", cursor: 'pointer' }}
                                        onClick={() => handlePropertyRowClick(property)}
                                        bg={highlightedPropertyId === property.id ? "rgba(229, 62, 62, 0.1)" : 
                                            selectedPropertyIds.includes(property.id) ? "rgba(49, 151, 149, 0.1)" : undefined}
                                    >
                                        <Td onClick={(e) => e.stopPropagation()} width="40px">
                                            <Checkbox 
                                                colorScheme="green" 
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handlePropertySelect(property, e.target.checked);
                                                }}
                                                isChecked={selectedPropertyIds.includes(property.id)}
                                                isDisabled={!selectedPropertyIds.includes(property.id) && selectedPropertyIds.length >= maxSelections}
                                            />
                                        </Td>
                                        <Td fontSize="xs" px={1} maxW="120px" overflow="hidden" textOverflow="ellipsis">
                                            <Text fontSize="xs" fontWeight="medium">
                                                {property.investor}
                                            </Text>
                                        </Td>
                                        <Td fontSize="xs" px={1} maxW="180px" overflow="hidden" textOverflow="ellipsis">
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(`${property.address || ''} ${property.city || ''} ${property.state || ''} ${property.zipCode || ''} Zillow Redfin Realtor`).replace(/%20/g, '+')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "#3182ce", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {property.address}
                                                <ExternalLinkIcon ml="1" />
                                            </a>
                                        </Td>
                                        <Td fontSize="xs" px={1}>
                                            {property.soldDate ? new Date(property.soldDate).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }) : ''}
                                        </Td>
                                        <Td fontSize="xs" px={1}>{formatPrice(property.price)}</Td>
                                        <Td fontSize="xs" px={1}>{formatDistance(property.distance)}</Td>
                                        <Td fontSize="xs" px={1} textAlign="center">{property.bedrooms || '-'}</Td>
                                        <Td fontSize="xs" px={1} textAlign="center">{property.bathrooms || '-'}</Td>
                                        <Td fontSize="xs" px={1}>{property.squareFootage || '-'}</Td>
                                        <Td fontSize="xs" px={1}>{property.yearBuilt || '-'}</Td>
                                    </Tr>
                                ))
                            )}
                        </Tbody>
                    </Table>
                </Box>


            </VStack>
        </Box>
    );
};

export default InvestorCompsSection; 
