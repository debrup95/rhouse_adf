import React, { useState, useMemo, useCallback } from 'react';
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
import { FaFilter, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import AddressMap from '../../address/components/AddressMap';

// Import the RelatedProperty type from EstimatedOfferStep
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
    date?: string;
    latitude?: number;
    longitude?: number;
    similarityScore?: number;
}

interface NeighborhoodCompsSelectionProps {
    properties: RelatedProperty[];
    onSelectionChange?: (selectedIds: string[]) => void;
    maxRentalSelections?: number;
    maxSoldSelections?: number;
    showSelectionCount?: boolean;
    // Map-related props
    propertyLatLng?: { lat: number; lng: number };
    address?: string;
    radiusMiles?: number;
    resetSelection?: boolean; // New prop to trigger selection reset
    hideFilters?: boolean; // New prop to hide/show filters
}

const NeighborhoodCompsSelection: React.FC<NeighborhoodCompsSelectionProps> = ({
    properties,
    onSelectionChange,
    maxRentalSelections = 2,
    maxSoldSelections = 2,
    showSelectionCount = false,
    propertyLatLng,
    address = '',
    radiusMiles = 2,
    resetSelection = false,
    hideFilters = false,
}) => {
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

    // Filter state
    const [filterPriceMin, setFilterPriceMin] = useState<string>('');
    const [filterPriceMax, setFilterPriceMax] = useState<string>('');
    const [filterSqftMin, setFilterSqftMin] = useState<string>('');
    const [filterSqftMax, setFilterSqftMax] = useState<string>('');
    const [filterYearMin, setFilterYearMin] = useState<string>('');
    const [filterYearMax, setFilterYearMax] = useState<string>('');
    const [filterBedrooms, setFilterBedrooms] = useState<number[]>([]);
    const [filterBathrooms, setFilterBathrooms] = useState<number[]>([]);
    const [filterDistanceMin, setFilterDistanceMin] = useState<string>('0.0');
    const [filterDistanceMax, setFilterDistanceMax] = useState<string>('2.0');
    const [filterSoldStart, setFilterSoldStart] = useState<string>('today');
    const [filterSoldEnd, setFilterSoldEnd] = useState<string>('12_month');
    
    // State for filter expansion
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    // Reset selection when resetSelection prop changes
    React.useEffect(() => {
        if (resetSelection) {
            setSelectedPropertyIds([]);
            onSelectionChange?.([]);
        }
    }, [resetSelection, onSelectionChange]);

    // Theme colors
    const bgSecondary = useColorModeValue('gray.50', 'gray.700');
    const borderPrimary = useColorModeValue('gray.200', 'gray.600');

    // Helper function to get sold date range
    const getSoldDateRange = () => {
        const now = new Date();
        const parseMonths = (val: string) => {
            if (val === "today") return 0;
            const match = val.match(/^([0-9]+)_month/);
            return match ? parseInt(match[1], 10) : 0;
        };
        const startMonths = parseMonths(filterSoldStart);
        const endMonths = parseMonths(filterSoldEnd);

        if (startMonths === endMonths) {
            const targetMonth = new Date(now);
            targetMonth.setMonth(now.getMonth() - startMonths);

            const startDate = new Date(
                targetMonth.getFullYear(),
                targetMonth.getMonth(),
                1
            );

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
            const startDate = new Date(now);
            startDate.setMonth(now.getMonth() - endMonths);
            const endDate = new Date(now);
            endDate.setMonth(now.getMonth() - startMonths);
            return { startDate, endDate };
        }
    };

    // Filter properties based on filter criteria
    const filteredProperties = useMemo(() => {
        const { startDate, endDate } = getSoldDateRange();

        const filtered = properties.filter((p: RelatedProperty) => {
            // Price filter
            if (filterPriceMin !== "" && (p.price ?? 0) < parseFloat(filterPriceMin)) return false;
            if (filterPriceMax !== "" && (p.price ?? 0) > parseFloat(filterPriceMax)) return false;
            
            // Square footage filter
            if (filterSqftMin !== "" && (p.squareFootage ?? 0) < parseFloat(filterSqftMin)) return false;
            if (filterSqftMax !== "" && (p.squareFootage ?? 0) > parseFloat(filterSqftMax)) return false;
            
            // Year built filter
            if (filterYearMin !== "" && (p.yearBuilt ?? 0) < parseFloat(filterYearMin)) return false;
            if (filterYearMax !== "" && (p.yearBuilt ?? 0) > parseFloat(filterYearMax)) return false;
            
            // Bedrooms filter
            if (filterBedrooms.length > 0 && !filterBedrooms.some((b) => (p.bedrooms ?? 0) >= b)) return false;
            
            // Bathrooms filter
            if (filterBathrooms.length > 0 && !filterBathrooms.some((b) => (p.bathrooms ?? 0) >= b)) return false;
            
            // Distance filter
            if (filterDistanceMin !== "" && 
                Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10 < parseFloat(filterDistanceMin)) {
                return false;
            }
            if (filterDistanceMax !== "" && 
                Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10 > parseFloat(filterDistanceMax)) {
                return false;
            }
            
            // Handle exact distance match when min and max are the same
            if (filterDistanceMin !== "" && filterDistanceMax !== "" && filterDistanceMin === filterDistanceMax) {
                const propertyDistance = Math.round((parseFloat(p.distance as string) ?? 0) * 10) / 10;
                const filterDistance = parseFloat(filterDistanceMin);
                if (propertyDistance !== filterDistance) {
                    return false;
                }
            }
            
            // Sold date filter
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
        properties,
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
    ]);

    // Get unique values for filter dropdowns
    const uniqueBedrooms = useMemo(() => {
        const set = new Set(
            filteredProperties
                .map((p: RelatedProperty) => p.bedrooms)
                .filter((b: any) => b !== undefined && b !== null)
        );
        return Array.from(set).sort((a: any, b: any) => a - b) as number[];
    }, [filteredProperties]);

    const uniqueBathrooms = useMemo(() => {
        const set = new Set(
            filteredProperties
                .map((p: RelatedProperty) => p.bathrooms)
                .filter((b: any) => b !== undefined && b !== null)
        );
        return Array.from(set).sort((a: any, b: any) => a - b) as number[];
    }, [filteredProperties]);

    // Helper function to check if property is rental
    const isRentalProperty = (property: RelatedProperty) => {
        return property.status === "LISTED_RENT" || 
               property.status === "RENTAL" || 
               property.status === "PRICE_CHANGE";
    };

    // Helper function to check if property is sold
    const isSoldProperty = (property: RelatedProperty) => {
        return property.status === "SOLD" || property.status === "Sold";
    };

    // Separate properties by type using filtered properties
    const { rentalProperties, soldProperties } = useMemo(() => {
        const rental = filteredProperties.filter(isRentalProperty);
        const sold = filteredProperties.filter(isSoldProperty);
        return { rentalProperties: rental, soldProperties: sold };
    }, [filteredProperties]);

    // Get current selection counts by type
    const { selectedRentalCount, selectedSoldCount } = useMemo(() => {
        const selectedRental = selectedPropertyIds.filter(id => {
            const property = filteredProperties.find(p => p.id?.toString() === id);
            return property ? isRentalProperty(property) : false;
        }).length;
        
        const selectedSold = selectedPropertyIds.filter(id => {
            const property = filteredProperties.find(p => p.id?.toString() === id);
            return property ? isSoldProperty(property) : false;
        }).length;

        return { selectedRentalCount: selectedRental, selectedSoldCount: selectedSold };
    }, [selectedPropertyIds, filteredProperties]);

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

    // Use filtered properties
    const allProperties = filteredProperties;

    // Handle individual property selection
    const handlePropertySelect = useCallback((property: RelatedProperty, isChecked: boolean) => {
        if (!property.id) return; // Skip if no ID
        
        const propertyId = property.id.toString();
        
        if (isChecked) {
            // Check limits based on property type
            if (isRentalProperty(property) && selectedRentalCount >= maxRentalSelections) {
                return; // Don't allow selection if at max for this type
            }
            if (isSoldProperty(property) && selectedSoldCount >= maxSoldSelections) {
                return; // Don't allow selection if at max for this type
            }
            
            const newSelection = [...selectedPropertyIds, propertyId];
            setSelectedPropertyIds(newSelection);
            onSelectionChange?.(newSelection);
        } else {
            const newSelection = selectedPropertyIds.filter(id => id !== propertyId);
            setSelectedPropertyIds(newSelection);
            onSelectionChange?.(newSelection);
        }
    }, [selectedPropertyIds, selectedRentalCount, selectedSoldCount, maxRentalSelections, maxSoldSelections, onSelectionChange]);

    // Handle select all for a specific type
    const handleSelectAllForType = useCallback((type: 'rental' | 'sold', isChecked: boolean) => {
        const targetProperties = type === 'rental' ? rentalProperties : soldProperties;
        const maxSelections = type === 'rental' ? maxRentalSelections : maxSoldSelections;
        
        if (isChecked) {
            // Select up to maxSelections
            const limitedSelection = targetProperties
                .slice(0, maxSelections)
                .map(p => p.id?.toString())
                .filter((id): id is string => Boolean(id));
            const otherTypeIds: string[] = selectedPropertyIds.filter(id => {
                const property = properties.find(p => p.id?.toString() === id);
                return property ? (type === 'rental' ? isSoldProperty(property) : isRentalProperty(property)) : false;
            });
            const newSelection = [...otherTypeIds, ...limitedSelection];
            setSelectedPropertyIds(newSelection);
            onSelectionChange?.(newSelection);
        } else {
            // Deselect all of this type
            const otherTypeIds: string[] = selectedPropertyIds.filter(id => {
                const property = properties.find(p => p.id?.toString() === id);
                return property ? (type === 'rental' ? isSoldProperty(property) : isRentalProperty(property)) : false;
            });
            setSelectedPropertyIds(otherTypeIds);
            onSelectionChange?.(otherTypeIds);
        }
    }, [rentalProperties, soldProperties, selectedPropertyIds, maxRentalSelections, maxSoldSelections, properties, onSelectionChange]);

    // Clear all selections
    const handleClearAll = useCallback(() => {
        setSelectedPropertyIds([]);
        onSelectionChange?.([]);
    }, [onSelectionChange]);

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
                                key="property-map"
                                latitude={propertyLatLng.lat}
                                longitude={propertyLatLng.lng}
                                address={address}
                                forceEmptyProperties={allProperties.length === 0}
                                properties={allProperties.map(
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
                                        {allProperties.length}
                                    </Badge>
                                </Flex>
                            </Flex>

                            {/* Collapsible Filter Content */}
                            {isFiltersExpanded && (
                                <>
                                    {/* First Row: Price Range, Square Footage, Year Built */}
                                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={2}>
                                        {/* Price Range */}
                                        <Box>
                                            <Text fontWeight="semibold" fontSize="sm" mb={1}>Price Range</Text>
                                            <Flex gap={2}>
                                                <Input
                                                    placeholder="Min"
                                                    size="md"
                                                    value={filterPriceMin}
                                                    onChange={e => setFilterPriceMin(e.target.value)}
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
                                                    value={filterPriceMax}
                                                    onChange={e => setFilterPriceMax(e.target.value)}
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
                                                    value={filterSqftMin}
                                                    onChange={e => setFilterSqftMin(e.target.value)}
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
                                                    value={filterSqftMax}
                                                    onChange={e => setFilterSqftMax(e.target.value)}
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
                                                    value={filterYearMin}
                                                    onChange={e => setFilterYearMin(e.target.value)}
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
                                                    value={filterYearMax}
                                                    onChange={e => setFilterYearMax(e.target.value)}
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
                                                    {filterBedrooms.length === 0
                                                        ? "All Bedrooms"
                                                        : `${filterBedrooms.length} selected`
                                                    }
                                                </MenuButton>
                                                <MenuList maxHeight="200px" overflowY="auto">
                                                    {/* All Bedrooms option */}
                                                    <Box px={3} py={1} borderBottom="1px solid" borderColor="gray.200">
                                                        <Checkbox
                                                            isChecked={filterBedrooms.length === uniqueBedrooms.length && uniqueBedrooms.length > 0}
                                                            isIndeterminate={filterBedrooms.length > 0 && filterBedrooms.length < uniqueBedrooms.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFilterBedrooms(uniqueBedrooms.map(b => b!));
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
                                                    {uniqueBedrooms.map(bed => (
                                                        <Box key={bed} px={3} py={1}>
                                                            <Checkbox
                                                                isChecked={filterBedrooms.includes(bed!)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setFilterBedrooms(prev => [...prev, bed!]);
                                                                    } else {
                                                                        setFilterBedrooms(prev => prev.filter(b => b !== bed));
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
                                                    {filterBathrooms.length === 0
                                                        ? "All Bathrooms"
                                                        : `${filterBathrooms.length} selected`
                                                    }
                                                </MenuButton>
                                                <MenuList maxHeight="200px" overflowY="auto">
                                                    {/* All Bathrooms option */}
                                                    <Box px={3} py={1} borderBottom="1px solid" borderColor="gray.200">
                                                        <Checkbox
                                                            isChecked={filterBathrooms.length === uniqueBathrooms.length && uniqueBathrooms.length > 0}
                                                            isIndeterminate={filterBathrooms.length > 0 && filterBathrooms.length < uniqueBathrooms.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFilterBathrooms(uniqueBathrooms.map(b => b!));
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
                                                    {uniqueBathrooms.map(bath => (
                                                        <Box key={bath} px={3} py={1}>
                                                            <Checkbox
                                                                isChecked={filterBathrooms.includes(bath!)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setFilterBathrooms(prev => [...prev, bath!]);
                                                                    } else {
                                                                        setFilterBathrooms(prev => prev.filter(b => b !== bath));
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
                                                        {filterDistanceMin ? `${filterDistanceMin} mi` : "0.0 mi"}
                                                    </MenuButton>
                                                    <MenuList maxHeight="200px" overflowY="auto">
                                                        {Array.from({ length: 5 }, (_, i) => i * 0.5).map(distance => (
                                                            <MenuItem 
                                                                key={distance}
                                                                onClick={() => setFilterDistanceMin(distance.toFixed(1))}
                                                                bg={filterDistanceMin === distance.toFixed(1) ? "blue.50" : "transparent"}
                                                                color={filterDistanceMin === distance.toFixed(1) ? "blue.600" : "inherit"}
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
                                                        {filterDistanceMax ? `${filterDistanceMax} mi` : "2.0 mi"}
                                                    </MenuButton>
                                                    <MenuList maxHeight="200px" overflowY="auto">
                                                        {Array.from({ length: 5 }, (_, i) => i * 0.5).map(distance => (
                                                            <MenuItem 
                                                                key={distance}
                                                                onClick={() => setFilterDistanceMax(distance.toFixed(1))}
                                                                bg={filterDistanceMax === distance.toFixed(1) ? "blue.50" : "transparent"}
                                                                color={filterDistanceMax === distance.toFixed(1) ? "blue.600" : "inherit"}
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
                                                        {filterSoldStart === '' || filterSoldStart === 'today' ? 'Today' : `${filterSoldStart.replace('_month', '')} Month${filterSoldStart === '1_month' ? '' : 's'}`}
                                                    </MenuButton>
                                                    <MenuList maxHeight="200px" overflowY="auto">
                                                        <MenuItem onClick={() => setFilterSoldStart('today')}>Today</MenuItem>
                                                        {Array.from({ length: 18 }, (_, i) => i + 1).map(month => (
                                                            <MenuItem key={month} onClick={() => setFilterSoldStart(`${month}_month`)}>
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
                                                        {filterSoldEnd === '' || filterSoldEnd === 'today' ? 'Today' : `${filterSoldEnd.replace('_month', '')} Month${filterSoldEnd === '1_month' ? '' : 's'}`}
                                                    </MenuButton>
                                                    <MenuList maxHeight="200px" overflowY="auto">
                                                        <MenuItem onClick={() => setFilterSoldEnd('today')}>Today</MenuItem>
                                                        {Array.from({ length: 18 }, (_, i) => i + 1).map(month => (
                                                            <MenuItem key={month} onClick={() => setFilterSoldEnd(`${month}_month`)}>
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
                                                setFilterPriceMin('');
                                                setFilterPriceMax('');
                                                setFilterSqftMin('');
                                                setFilterSqftMax('');
                                                setFilterYearMin('');
                                                setFilterYearMax('');
                                                setFilterBedrooms([]);
                                                setFilterBathrooms([]);
                                                setFilterDistanceMin('0.0');
                                                setFilterDistanceMax('2.0');
                                                setFilterSoldStart('today');
                                                setFilterSoldEnd('12_month');
                                            }}
                                        >
                                            Clear Filters
                                        </Button>
                                    </Flex>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Selection Count Display - Single Line */}
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
                                <HStack spacing={4}>
                                    <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                                        Selected: {selectedPropertyIds.length} / {maxRentalSelections + maxSoldSelections}
                                    </Text>
                                    <Text fontSize="xs" color="blue.600">
                                        Rental: {selectedRentalCount} / {maxRentalSelections}
                                    </Text>
                                    <Text fontSize="xs" color="blue.600">
                                        Sold: {selectedSoldCount} / {maxSoldSelections}
                                    </Text>
                                </HStack>
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
                            <Thead bg={bgSecondary}>
                                <Tr>
                                    <Th width="40px">Select</Th>
                                    <Th fontSize="sm" px={1}>Status</Th>
                                    <Th fontSize="sm" px={1}>Address</Th>
                                    <Th fontSize="sm" px={1}>Date</Th>
                                    <Th fontSize="sm" px={1}>Price</Th>
                                    <Th fontSize="sm" px={1}>Distance</Th>
                                    <Th fontSize="sm" px={1}>Bed</Th>
                                    <Th fontSize="sm" px={1}>Bath</Th>
                                    <Th fontSize="sm" px={1}>Sqft</Th>
                                    <Th fontSize="sm" px={1}>Year</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {allProperties.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={10} textAlign="center" py={4}>
                                            <Text>No properties available</Text>
                                        </Td>
                                    </Tr>
                                ) : (
                                    allProperties.map((property) => {
                                        const propertyId = property.id?.toString();
                                        if (!propertyId) return null; // Skip properties without ID
                                        
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
                                                            !selectedPropertyIds.includes(propertyId) && (
                                                                (isRentalProperty(property) && selectedRentalCount >= maxRentalSelections) ||
                                                                (isSoldProperty(property) && selectedSoldCount >= maxSoldSelections)
                                                            )
                                                        }
                                                    />
                                                </Td>
                                                <Td fontSize="xs" px={1} textAlign="center">
                                                    <Badge
                                                        colorScheme={
                                                            isRentalProperty(property) ? "blue" : "red"
                                                        }
                                                        fontSize="xs"
                                                        textTransform="uppercase"
                                                    >
                                                        {isRentalProperty(property) ? "RENTAL" : "SOLD"}
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

export default NeighborhoodCompsSelection;
