import React from 'react';
import {
    Box,
    Heading,
    Image,
    HStack,
    Text,
    Divider,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Flex,
    Button,
    useColorModeValue, Icon,
} from '@chakra-ui/react';
import { FaPhoneAlt, FaArrowLeft } from 'react-icons/fa';
import AddressMap from '../../../address/componenents/AddressMap';
import UnderwriteSliders from './UnderwriteSliders';
import { AddressComponents } from '../../../address/componenents/PlaceAutocompleteInput';
import {useAppSelector} from "../../../store/hooks";

function AddressImageUrl(address: AddressComponents | null, apiKey: string) {
    if (!address) return '';
    const encodedAddress = encodeURIComponent(address.formattedAddress);
    const size = '600x300';
    const fov = 90;
    const heading = 235;
    const pitch = 10;
    return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodedAddress}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${apiKey}`;
}

interface EstimateUWStepProps {
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
    handleOpenUploadModal: () => void;
}

const EstimateUWStep: React.FC<EstimateUWStepProps> = ({
                                                           selectedAddress,
                                                           googleApiKey,
                                                           addressState,
                                                           handleOpenCallbackModal,
                                                           handleBackToStep2,
                                                           onNext,
                                                           handleOpenUploadModal,
                                                       }) => {
    const propertyState = useAppSelector((state) => state.property);
    const property = propertyState.properties[0];

    const propertyDetails = property?.addressData?.items[0];
    const beds = propertyDetails?.bedrooms ?? 'Not Found';
    const baths = propertyDetails?.bathrooms ?? 'Not Found';
    const sqft = propertyDetails?.square_footage ?? 'Not Found';
    const year = propertyDetails?.year_built ?? 'Not Found';

    return (
        <Box w="100%" minH={"100vh"}>
            {/* Heading Box */}
            <Box mb={4} p={4}>
                <Heading size="lg" color={useColorModeValue('gray.800', 'white')}>
                    Estimate/UW
                </Heading>
            </Box>

            {/* Street View Image Box */}
            {selectedAddress?.formattedAddress && (
                <Box mb={4} borderRadius="md" overflow="hidden" boxShadow="md">
                    <Image
                        src={AddressImageUrl(selectedAddress, googleApiKey)}
                        alt={`Street View of ${selectedAddress.formattedAddress}`}
                        width="100%"
                        height="200px"
                        objectFit="cover"
                    />
                </Box>
            )}

            {/* Property Details Box */}
            <Box mb={4} p={4} border="1px" borderColor={useColorModeValue('gray.200', 'gray.600')} borderRadius="md">
                <HStack spacing={8}>
                    <Box>
                        <Text fontWeight="bold">Beds</Text>
                        <Text>{beds}</Text>
                    </Box>
                    <Box>
                        <Text fontWeight="bold">Baths</Text>
                        <Text>{baths}</Text>
                    </Box>
                    <Box>
                        <Text fontWeight="bold">Sq Ft</Text>
                        <Text>{sqft}</Text>
                    </Box>
                    <Box>
                        <Text fontWeight="bold">Year</Text>
                        <Text>{year}</Text>
                    </Box>
                    <Box>
                        <Text fontWeight="bold" color={"green"}>{selectedAddress?.formattedAddress}</Text>
                    </Box>
                </HStack>
            </Box>

            {/* Divider Box */}
            <Box mb={4}>
                <Divider />
            </Box>

            {/* Homes Sold/Active Buyers Box */}
            <Box mb={4} p={4} border="1px" borderColor={useColorModeValue('gray.200', 'gray.600')} borderRadius="md">
                <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">Homes Sold at this Price</Text>
                    <Text>24</Text>
                </HStack>
                <HStack justify="space-between">
                    <Text fontWeight="bold">Active Buyers for this Property</Text>
                    <Text>6</Text>
                </HStack>
            </Box>

            {/* Estimated Offer Range (Teal Box) */}
            <Box bg={useColorModeValue('gray.100', 'gray.700')} p={4} borderRadius="md" mb={6}>
                <Text fontWeight="bold" fontSize="lg" mb={2}>
                    Estimated Offer Range
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="teal.500">
                    $45k - $65k
                </Text>
                <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    Prices vary based on a home's specific condition.
                </Text>
            </Box>

            {/* Estimated Offer Range (Slider Box) */}
            <Box bg={useColorModeValue('gray.200', 'gray.600')} p={4} borderRadius="md" mb={6} textAlign="left">
                <Text fontWeight="bold" fontSize="md" mb={2} color={useColorModeValue('gray.800', 'white')}>
                    Estimated Offer Range
                </Text>
                <HStack justify="space-between">
                    <Text color={useColorModeValue('gray.700', 'gray.300')}>$54,000</Text>
                    <Text color={useColorModeValue('gray.700', 'gray.300')}>$64,000</Text>
                </HStack>
                <Slider aria-label="EstimatedOfferRange" min={54000} max={64000} value={(64000 + 54000) / 2} isReadOnly colorScheme="teal" mt={2}>
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                </Slider>
            </Box>

            {/* Underwrite Box */}
            <Box bg={useColorModeValue('gray.200', 'gray.600')} p={4} borderRadius="md" mb={6} textAlign="left">
                <Text fontWeight="bold" fontSize="md" mb={2} color={useColorModeValue('gray.800', 'white')}>
                    Underwrite
                </Text>
                <UnderwriteSliders />
            </Box>

            {/* After Repair Value Box */}
            <Box mb={4} p={4}>
                <Text mt={4} fontWeight="bold" fontSize="lg" color={useColorModeValue('teal.600', 'teal.300')}>
                    After Repair Value: $120,000
                </Text>
                <br />
            </Box>

            {/* Address Map Box */}
            <Box mb={6} p={4} border="1px" borderColor={useColorModeValue('gray.200', 'gray.600')} borderRadius="md">
                <AddressMap latitude={addressState.lat} longitude={addressState.lng} address={addressState.formattedAddress} />
            </Box>

            {/* Bottom Buttons Box */}
            <Box mb={6} p={4}>
                <HStack w="100%" spacing={4}>
                    <Button variant="outline">Save Estimate</Button>
                    <Button
                        leftIcon={<Icon as={FaPhoneAlt as React.ElementType} />}
                        colorScheme="teal"
                        onClick={handleOpenCallbackModal}
                    >
                        Speak with a Specialist
                    </Button>

                    <Button colorScheme="teal" onClick={handleOpenUploadModal}>
                        Upload Images (Optional)
                    </Button>
                </HStack>
            </Box>

            {/* Back/Verify Buttons Box */}
            <Box>
                <HStack w="100%" spacing={4}>
                    <Button leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                            variant="outline" onClick={handleBackToStep2} flex="1">
                        Back
                    </Button>
                    <Button colorScheme="teal" flex="2" onClick={onNext}>Verify</Button>
                </HStack>
            </Box>
        </Box>
    );
};

export default EstimateUWStep;