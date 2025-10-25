import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Flex,
    Heading,
    Text,
    Image,
    Icon,
    HStack,
    useToast,
} from '@chakra-ui/react';
import { FaHome, FaDollarSign, FaEdit, FaSave } from 'react-icons/fa';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { AddressComponents } from '../../address/components/PlaceAutocompleteInput';
import { useStreetViewUrl } from '../../utils/streetViewCache';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setAddressData } from '../../store/addressSlice';
import { clearPropertyData, addProperty, setProperties } from '../../store/propertySlice';
import config from '../../../../config';

interface PropertyHeaderCardProps {
    selectedAddress: AddressComponents | null;
    googleApiKey: string;
    propertyDetails: {
        beds: string | number;
        baths: string | number;
        sqft: string | number;
        year: string | number;
    };
    homesSoldCount: number;
    interestedBuyersCount: number;
    selectedCondition?: string;
    onPropertyUpdate?: (isComplete?: boolean, expectedDetails?: {beds: number, baths: number, sqft: number, year: number}) => void;
}

const PropertyHeaderCard: React.FC<PropertyHeaderCardProps> = ({
    selectedAddress,
    googleApiKey,
    propertyDetails,
    homesSoldCount,
    interestedBuyersCount,
    selectedCondition,
    onPropertyUpdate,
}) => {
    const { beds, baths, sqft, year } = propertyDetails;
    const [editMode, setEditMode] = useState({ beds: false, baths: false, sqft: false, year: false });
    const [editedValues, setEditedValues] = useState({ beds, baths, sqft, year });
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const currentYear = new Date().getFullYear();
    const prevPropertyDetailsRef = useRef({ beds, baths, sqft, year });
    const lastSubmittedValuesRef = useRef({ beds, baths, sqft, year });

    // Update editedValues when propertyDetails prop changes
    useEffect(() => {
      const prev = prevPropertyDetailsRef.current;
      const lastSubmitted = lastSubmittedValuesRef.current;
      // Only reset if the details actually changed and not in the middle of an update
      if (
        (beds !== prev.beds ||
          baths !== prev.baths ||
          sqft !== prev.sqft ||
          year !== prev.year) &&
        (!isUpdating || beds !== lastSubmitted.beds || baths !== lastSubmitted.baths || sqft !== lastSubmitted.sqft || year !== lastSubmitted.year)
      ) {
        setEditedValues({ beds, baths, sqft, year });
        setHasChanges(false);
        prevPropertyDetailsRef.current = { beds, baths, sqft, year };
      }
    }, [beds, baths, sqft, year, isUpdating]);

    const dispatch = useAppDispatch();
    const user = useAppSelector((state: any) => state.user);
    const toast = useToast();

    // Use cached Street View URL to reduce API calls
    const streetViewUrl = useStreetViewUrl(
        selectedAddress?.formattedAddress || null,
        googleApiKey,
        { size: '350x300', fov: 80, pitch: -5 }
    );

    // Validation logic
    const validateField = (field: string, value: string | number) => {
        let num = Number(value);
        if (field === 'beds' || field === 'baths') {
            if (!Number.isInteger(num) || num < 1 || num > 10) {
                return 'Must be an integer between 1 and 10';
            }
        } else if (field === 'sqft') {
            if (!Number.isInteger(num) || num < 1 || num > 6000) {
                return 'Must be an integer between 1 and 6000';
            }
        } else if (field === 'year') {
            if (!Number.isInteger(num) || num < 1800 || num > currentYear) {
                return `Must be an integer between 1800 and ${currentYear}`;
            }
        }
        return '';
    };

    const handleFieldClick = (field: string) => {
        setEditMode({ ...editMode, [field]: true });
    };

    const handleInputChange = (field: string, value: string) => {
        let numValue = value.replace(/[^0-9]/g, ''); // Only allow numbers
        setEditedValues(prev => ({ ...prev, [field]: numValue }));
        const error = validateField(field, numValue);
        setValidationErrors(prev => ({ ...prev, [field]: error }));
        // Check if any value changed
        setHasChanges(
            (field === 'beds' && numValue !== String(beds)) ||
            (field === 'baths' && numValue !== String(baths)) ||
            (field === 'sqft' && numValue !== String(sqft)) ||
            (field === 'year' && numValue !== String(year))
        );
    };

    const handleInputBlur = (field: string) => {
        // If valid, exit edit mode
        if (!validationErrors[field]) {
            setEditMode({ ...editMode, [field]: false });
        }
    };

    // Function to fetch updated property data
    const fetchUpdatedPropertyData = async () => {
        if (!selectedAddress) {
            // Cannot fetch property data without a selected address
            return;
        }
        
        // Starting updated property data fetch
        
        try {
            // Don't clear property data immediately - keep existing data while loading
            // dispatch(clearPropertyData());
            
            // Include user information if available for activity tracking
            const requestBody: any = { 
                address: selectedAddress,
                // Include updated property details
                updatedPropertyDetails: {
                    bedrooms: Number(editedValues.beds),
                    bathrooms: Number(editedValues.baths),
                    square_footage: Number(editedValues.sqft),
                    year_built: Number(editedValues.year)
                },
                // Include condition if available
                condition: selectedCondition
            };
            
            if (user.isLoggedIn && user.user_id) {
                requestBody.userId = parseInt(user.user_id);
                requestBody.searchType = 'property_details_update';
                requestBody.searchSource = 'web_app';
            }
            
            const response = await fetch(`${config.apiUrl}/api/property/property-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiData = await response.json();
            // API response received
            
            // Process the updated property data similar to the original fetchPropertyData
            // Map the comparable properties with proper event details
            const mappedComparableProperties = (apiData.comparableProperties || []).map((prop: any) => {
                // Check for price data from different sources
                const price = prop.price || 
                            (prop.eventDetails && prop.eventDetails.price) || 
                            prop.list_price || 
                            prop.sale_price || 
                            0;
                
                // Check for status value and map PRICE_CHANGE to RENTAL
                let listingStatus = 'Unknown';
                if (prop.eventDetails && prop.eventDetails.event_name) {
                    listingStatus = prop.eventDetails.event_name;
                    if (listingStatus === 'PRICE_CHANGE') {
                        listingStatus = 'RENTAL';
                    }
                } else if (prop.status) {
                    listingStatus = prop.status;
                }
                
                return {
                    id: prop.id || prop.parcl_property_id || Math.random(),
                    address: prop.address || 'Unknown Address',
                    city: prop.city || selectedAddress.city,
                    state: prop.state_abbreviation || prop.state || selectedAddress.state,
                    zipCode: prop.zip_code || prop.zipCode || selectedAddress.zip,
                    price: price,
                    squareFootage: prop.square_footage || prop.squareFootage || 0,
                    bedrooms: prop.bedrooms || 0,
                    bathrooms: prop.bathrooms || 0,
                    yearBuilt: prop.year_built || prop.yearBuilt || 0,
                    distance: prop.distance || 0,
                    status: listingStatus,
                    soldDate: prop.eventDetails?.event_date || '',
                    latitude: prop.latitude || 0,
                    longitude: prop.longitude || 0,
                    similarityScore: prop.similarityScore || 0,
                    isOutlier: prop.isOutlier || false,
                    eventDetails: prop.eventDetails || null
                };
            });

            // Map the all properties with proper event details
            const mappedAllProperties = (apiData.allProperties || []).map((prop: any) => {
                // Check for price data from different sources
                const price = prop.price || 
                            (prop.eventDetails && prop.eventDetails.price) || 
                            prop.list_price || 
                            prop.sale_price || 
                            0;
                
                // Check for status value and map PRICE_CHANGE to RENTAL
                let listingStatus = 'Unknown';
                if (prop.eventDetails && prop.eventDetails.event_name) {
                    listingStatus = prop.eventDetails.event_name;
                    if (listingStatus === 'PRICE_CHANGE') {
                        listingStatus = 'RENTAL';
                    }
                } else if (prop.status) {
                    listingStatus = prop.status;
                }
                
                return {
                    id: prop.id || prop.parcl_property_id || Math.random(),
                    address: prop.address || 'Unknown Address',
                    city: prop.city || selectedAddress.city,
                    state: prop.state_abbreviation || prop.state || selectedAddress.state,
                    zipCode: prop.zip_code || prop.zipCode || selectedAddress.zip,
                    price: price,
                    squareFootage: prop.square_footage || prop.squareFootage || 0,
                    bedrooms: prop.bedrooms || 0,
                    bathrooms: prop.bathrooms || 0,
                    yearBuilt: prop.year_built || prop.yearBuilt || 0,
                    distance: prop.distance || 0,
                    status: listingStatus,
                    soldDate: prop.eventDetails?.event_date || '',
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
                    rentalStatus: prop.rentalStatus || null
                };
            });

            const propertyData = {
                address: {
                    street1: selectedAddress.street1 || '',
                    street2: selectedAddress.street2 || '',
                    city: selectedAddress.city || '',
                    state: selectedAddress.state || '',
                    zip: selectedAddress.zip || '',
                    formattedAddress: selectedAddress.formattedAddress || '',
                    lat: selectedAddress.lat || 0,
                    lng: selectedAddress.lng || 0,
                },
                addressData: { items: [apiData.targetProperty] },
                neighborhoodProperties: mappedComparableProperties,
                allProperties: mappedAllProperties,
                radiusUsed: apiData.radiusUsed || 0,
                monthsUsed: apiData.monthsUsed || 0,
                usedFallbackCriteria: apiData.usedFallbackCriteria || false
            };

                    // Store the updated data in Redux (this will replace existing data)
        dispatch(setProperties([propertyData]));
        } catch (error) {
            // Error updating property data
            throw error;
        }
    };

    // Handle update button click
    const handleUpdate = async () => {
        setIsUpdating(true);
        // handleUpdate called
        if (!hasChanges || !Object.values(validationErrors).every(e => !e)) {
            setIsUpdating(false);
            return;
        }



        // Immediately update Redux with new property details
        dispatch(setAddressData({
            street1: selectedAddress?.street1 || '',
            street2: selectedAddress?.street2 || '',
            city: selectedAddress?.city || '',
            state: selectedAddress?.state || '',
            zip: selectedAddress?.zip || '',
            formattedAddress: selectedAddress?.formattedAddress || '',
            lat: selectedAddress?.lat || 0,
            lng: selectedAddress?.lng || 0,
            // Include updated property details
            updatedPropertyDetails: {
                bedrooms: Number(editedValues.beds),
                bathrooms: Number(editedValues.baths),
                square_footage: Number(editedValues.sqft),
                year_built: Number(editedValues.year)
            }
        }));

        // Reset form state immediately
        setHasChanges(false);
        setEditMode({ beds: false, baths: false, sqft: false, year: false });
        lastSubmittedValuesRef.current = { ...editedValues };
        setIsUpdating(false);

        // Show success toast immediately
        toast({
            title: "Property updated",
            description: "Your property details have been updated successfully.",
            status: "success",
            duration: 5000,
            isClosable: true,
            position: "top-right"
        });

        // Trigger loading overlay and let parent handle the API calls
        if (onPropertyUpdate) {
            const expectedDetails = {
                beds: Number(editedValues.beds),
                baths: Number(editedValues.baths),
                sqft: Number(editedValues.sqft),
                year: Number(editedValues.year)
            };
                    onPropertyUpdate(false, expectedDetails);
        }
    };



    return (
        <Flex 
            direction={{ base: "column", md: "row" }}
            gap={{ base: 4, md: 6 }}
            mb={4}
            width="100%"
            overflow="hidden"
        >
            {/* Street View Image Box - Left Side */}
            <Box 
                borderRadius="md" 
                overflow="hidden" 
                boxShadow="md"
                width={{ base: "100%", md: "350px" }}
                height={{ base: "200px", md: "300px" }}
                flexShrink={0}
            >
                <Image
                    src={streetViewUrl}
                    alt={`Street View of ${selectedAddress?.formattedAddress}`}
                    width="100%"
                    height="100%"
                    objectFit="cover"
                    borderRadius="md"
                />
            </Box>

            {/* Property Details Box - Right Side */}
            <Box 
                flex={1}
                minW={0}
                position="relative"
            >
                {/* Header with Address and Save Button */}
                <Flex justifyContent="space-between" alignItems="flex-start" mb={3}>
                    <Heading 
                        as="h2" 
                        size={{ base: "sm", md: "md" }}
                        color="brand.500" 
                        fontWeight="bold"
                        fontSize={{ base: "lg", md: "xl" }}
                        lineHeight="1.2"
                        wordBreak="break-word"
                        flex={1}
                        mr={3}
                    >
                        <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(`${selectedAddress?.formattedAddress || ''} Zillow Redfin realtor.com homes.com`).replace(/%20/g, '+')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                                color: "inherit", 
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                            }}
                        >
                            {selectedAddress?.formattedAddress}
                            <ExternalLinkIcon ml={1} boxSize={4} />
                        </a>
                    </Heading>
                    
                    {/* Save Icon Button - Top Right */}
                    <Box
                        as="button"
                        p={2}
                        borderRadius="md"
                        bg={hasChanges && Object.values(validationErrors).every(e => !e) ? 'brand.500' : 'gray.300'}
                        color={hasChanges && Object.values(validationErrors).every(e => !e) ? 'white' : 'gray.500'}
                        cursor={hasChanges && Object.values(validationErrors).every(e => !e) ? 'pointer' : 'not-allowed'}
                        transition="all 0.2s"
                        _hover={hasChanges && Object.values(validationErrors).every(e => !e) ? { bg: 'brand.600' } : {}}
                        disabled={!(hasChanges && Object.values(validationErrors).every(e => !e))}
                        onClick={handleUpdate}
                        title={hasChanges && Object.values(validationErrors).every(e => !e) ? "Save changes" : "No changes to save"}
                        flexShrink={0}
                    >
                        <Icon as={FaSave as React.ElementType} boxSize={4} />
                    </Box>
                </Flex>

                {/* Property Details Container */}
                <Box 
                    bg="white" 
                    p={3} 
                    borderRadius="lg" 
                    border="1px solid" 
                    borderColor="gray.200"
                    mb={2}
                    boxShadow="sm"
                >
                    <Flex 
                        wrap="wrap" 
                        gap={2}
                        justifyContent="space-between"
                    >
                        {/* Beds */}
                        <Box 
                            bg="gray.50" 
                            p={2}
                            borderRadius="lg" 
                            textAlign="center"
                            width={{ base: "48%", md: "48%" }}
                            border="1px solid transparent"
                            position="relative"
                            _hover={{ border: "1px solid #3A5F0B" }}
                            transition="border 0.2s"
                        >
                        {editMode.beds ? (
                            <>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={editedValues.beds}
                                    autoFocus
                                    onChange={e => handleInputChange('beds', e.target.value)}
                                    onBlur={() => handleInputBlur('beds')}
                                    style={{ width: '60px', fontSize: '1.25rem', textAlign: 'center', border: validationErrors.beds ? '1px solid red' : undefined }}
                                />
                                {validationErrors.beds && (
                                    <Text color="red.500" fontSize="xs">{validationErrors.beds}</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color="brand.500" cursor="pointer" onClick={() => setEditMode({ beds: true, baths: false, sqft: false, year: false })}>{editedValues.beds}</Text>
                                <Icon 
                                    as={FaEdit as React.ElementType} 
                                    color="gray.500" 
                                    boxSize={4} 
                                    position="absolute"
                                    top={2}
                                    right={2}
                                    cursor="pointer"
                                    onClick={() => setEditMode({ beds: true, baths: false, sqft: false, year: false })}
                                />
                            </>
                        )}
                        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">BEDS</Text>
                        </Box>
                        {/* Baths */}
                        <Box 
                            bg="gray.50" 
                            p={2}
                            borderRadius="lg" 
                            textAlign="center"
                            width={{ base: "48%", md: "48%" }}
                            border="1px solid transparent"
                            position="relative"
                            _hover={{ border: "1px solid #3A5F0B" }}
                            transition="border 0.2s"
                        >
                        {editMode.baths ? (
                            <>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={editedValues.baths}
                                    autoFocus
                                    onChange={e => handleInputChange('baths', e.target.value)}
                                    onBlur={() => handleInputBlur('baths')}
                                    style={{ width: '60px', fontSize: '1.25rem', textAlign: 'center', border: validationErrors.baths ? '1px solid red' : undefined }}
                                />
                                {validationErrors.baths && (
                                    <Text color="red.500" fontSize="xs">{validationErrors.baths}</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color="brand.500" cursor="pointer" onClick={() => setEditMode({ beds: false, baths: true, sqft: false, year: false })}>{editedValues.baths}</Text>
                                <Icon 
                                    as={FaEdit as React.ElementType} 
                                    color="gray.500" 
                                    boxSize={4} 
                                    position="absolute"
                                    top={2}
                                    right={2}
                                    cursor="pointer"
                                    onClick={() => setEditMode({ beds: false, baths: true, sqft: false, year: false })}
                                />
                            </>
                        )}
                        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">BATHS</Text>
                        </Box>
                        {/* Sqft */}
                        <Box 
                            bg="gray.50" 
                            p={2}
                            borderRadius="lg" 
                            textAlign="center"
                            width={{ base: "48%", md: "48%" }}
                            border="1px solid transparent"
                            position="relative"
                            _hover={{ border: "1px solid #3A5F0B" }}
                            transition="border 0.2s"
                        >
                        {editMode.sqft ? (
                            <>
                                <input
                                    type="number"
                                    min={1}
                                    max={6000}
                                    value={editedValues.sqft}
                                    autoFocus
                                    onChange={e => handleInputChange('sqft', e.target.value)}
                                    onBlur={() => handleInputBlur('sqft')}
                                    style={{ width: '80px', fontSize: '1.25rem', textAlign: 'center', border: validationErrors.sqft ? '1px solid red' : undefined }}
                                />
                                {validationErrors.sqft && (
                                    <Text color="red.500" fontSize="xs">{validationErrors.sqft}</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color="brand.500" cursor="pointer" onClick={() => setEditMode({ beds: false, baths: false, sqft: true, year: false })}>{editedValues.sqft}</Text>
                                <Icon 
                                    as={FaEdit as React.ElementType} 
                                    color="gray.500" 
                                    boxSize={4} 
                                    position="absolute"
                                    top={2}
                                    right={2}
                                    cursor="pointer"
                                    onClick={() => setEditMode({ beds: false, baths: false, sqft: true, year: false })}
                                />
                            </>
                        )}
                        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">SQFT</Text>
                        </Box>
                        {/* Year */}
                        <Box 
                            bg="gray.50" 
                            p={2}
                            borderRadius="lg" 
                            textAlign="center"
                            width={{ base: "48%", md: "48%" }}
                            border="1px solid transparent"
                            position="relative"
                            _hover={{ border: "1px solid #3A5F0B" }}
                            transition="border 0.2s"
                        >
                        {editMode.year ? (
                            <>
                                <input
                                    type="number"
                                    min={1800}
                                    max={currentYear}
                                    value={editedValues.year}
                                    autoFocus
                                    onChange={e => handleInputChange('year', e.target.value)}
                                    onBlur={() => handleInputBlur('year')}
                                    style={{ width: '80px', fontSize: '1.25rem', textAlign: 'center', border: validationErrors.year ? '1px solid red' : undefined }}
                                />
                                {validationErrors.year && (
                                    <Text color="red.500" fontSize="xs">{validationErrors.year}</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color="brand.500" cursor="pointer" onClick={() => setEditMode({ beds: false, baths: false, sqft: false, year: true })}>{editedValues.year}</Text>
                                <Icon 
                                    as={FaEdit as React.ElementType} 
                                    color="gray.500" 
                                    boxSize={4} 
                                    position="absolute"
                                    top={2}
                                    right={2}
                                    cursor="pointer"
                                    onClick={() => setEditMode({ beds: false, baths: false, sqft: false, year: true })}
                                />
                            </>
                        )}
                        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">YEAR</Text>
                        </Box>
                    </Flex>
                </Box>

                <Flex 
                    direction="column" 
                    bg="gray.50" 
                    p={{ base: 3, md: 3 }}
                    borderRadius="lg"
                    width="100%"
                >
                    <Flex 
                        justifyContent="space-between" 
                        mb={2}
                        align="center"
                        direction={{ base: "column", sm: "row" }}
                        gap={{ base: 2, sm: 0 }}
                    >
                        <Flex align="center" justify={{ base: "center", sm: "flex-start" }}>
                            <Icon as={FaHome as React.ElementType} color="brand.500" mr={2} />
                            <Text 
                                fontWeight="medium" 
                                fontSize={{ base: "sm", md: "md" }}
                                textAlign={{ base: "center", sm: "left" }}
                            >
                                Investor Purchases in this Zip Code
                            </Text>
                        </Flex>
                        <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }} color="brand.500">{homesSoldCount}</Text>
                    </Flex>
                    <Flex 
                        justifyContent="space-between"
                        align="center"
                        direction={{ base: "column", sm: "row" }}
                        gap={{ base: 2, sm: 0 }}
                    >
                        <Flex align="center" justify={{ base: "center", sm: "flex-start" }}>
                            <Icon as={FaDollarSign as React.ElementType} color="brand.500" mr={2} />
                            <Text 
                                fontWeight="medium"
                                fontSize={{ base: "sm", md: "md" }}
                                textAlign={{ base: "center", sm: "left" }}
                            >
                                Interested Buyers
                            </Text>
                        </Flex>
                        <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }} color="brand.500">{interestedBuyersCount}</Text>
                    </Flex>
                </Flex>
            </Box>
        </Flex>
    );
};

export default PropertyHeaderCard; 
