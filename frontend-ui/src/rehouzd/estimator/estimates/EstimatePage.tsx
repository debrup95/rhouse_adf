import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    Heading,
    Button,
    HStack,
    Text,
    Flex,
    useColorModeValue,
    Stepper,
    Step,
    StepIndicator,
    StepStatus,
    StepTitle,
    StepDescription,
    StepSeparator,
    StepNumber,
    Divider,
    Spacer,
    Input,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Icon,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setAddressData } from '../store/addressSlice';
import PlaceAutocompleteInput, {
    AddressComponents,
} from '../address/componenents/PlaceAutocompleteInput';
import { FaPhoneAlt, FaArrowLeft } from 'react-icons/fa';
import AddressMap from "../address/componenents/AddressMap";
import { AddressImageUrl } from "./components/steps/helpers";
import AddressInputStep from "./components/steps/AddressInputStep";
import ConditionStep from "./components/steps/ConditionStep";
import EstimateUWStep from "./components/steps/EstimateUWStep";
import UploadImagesStep from "./components/steps/UploadImagesStep";
import { addProperty } from '../store/propertySlice';
// Import the SpecialistCallModal component
import SpecialistCallModal from './components/callback/SpecialistCallModal';

interface PropertyData {
    beds: number;
    baths: number;
    sqft: number;
    year: number;
}

const EstimatePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    // Address input
    const [addressInput, setAddressInput] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null);

    // Condition (no longer used for fetching, but you can still store it)
    const [selectedCondition, setSelectedCondition] = useState('');
    // Background lazy loading state
    const [isLazyLoading, setIsLazyLoading] = useState(false);
    // Button spinner state
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    // Other UI states
    const [isOfferLoading, setIsOfferLoading] = useState(false);
    // This state now controls the callback modal
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    const [callbackRequested, setCallbackRequested] = useState(false);
    const [enteredPhoneNumber, setEnteredPhoneNumber] = useState('');
    const [showCallbackRequest, setShowCallbackRequest] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Refs for smooth scrolling
    const step1Ref = useRef<HTMLDivElement | null>(null);
    const step2Ref = useRef<HTMLDivElement | null>(null);
    const step3Ref = useRef<HTMLDivElement | null>(null);
    const step4Ref = useRef<HTMLDivElement | null>(null);

    const googleApiKey = process.env.REACT_APP_Maps_API_KEY || '';
    const addressState = useAppSelector((state) => state.address);
    const propertyState = useAppSelector((state) => state.property);

    // Update local state when the address slice updates
    useEffect(() => {
        if (addressState.formattedAddress) {
            setAddressInput(addressState.formattedAddress);
            setSelectedAddress({
                street1: addressState.street1,
                street2: addressState.street2,
                city: addressState.city,
                state: addressState.state,
                zip: addressState.zip,
                formattedAddress: addressState.formattedAddress,
                lat: addressState.lat,
                lng: addressState.lng,
            });
            setSelectedCondition('');
        }
    }, [addressState]);

    /**
     * Lazy Loading Old Code
     */
    // useEffect(() => {
    //     const fetchPropertyData = async () => {
    //         try {
    //             setIsLazyLoading(true);
    //             const response = await fetch('/api/property/property-data', {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify({ address: selectedAddress }),
    //             });
    //             if (response.ok) {
    //                 const data = await response.json();
    //                 dispatch(addProperty(data));
    //             } else {
    //                 console.error('Failed to fetch property data');
    //             }
    //         } catch (error) {
    //             console.error('Error fetching property data:', error);
    //         } finally {
    //             setIsLazyLoading(false);
    //         }
    //     };

    //     if (selectedAddress && !propertyState.properties.length) {
    //         fetchPropertyData();
    //     }
    // }, [selectedAddress, dispatch, propertyState.properties.length]);

    /**
     * Chnges for the no extra calls for api
     */
    useEffect(() => {
        const fetchPropertyData = async () => {
            if (!selectedAddress || !selectedAddress.formattedAddress) return; // Ensure valid address
    
            try {
                setIsLazyLoading(true);
                const response = await fetch('/api/property/property-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: selectedAddress }),
                });
    
                if (!response.ok) {
                    console.error('Failed to fetch property data');
                    return;
                }
    
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                    dispatch(addProperty(data)); // Update store only if data exists
                }
            } catch (error) {
                console.error('Error fetching property data:', error);
            } finally {
                setIsLazyLoading(false);
            }
        };
    
        // Fetch only if:
        // - `selectedAddress` is valid
        // - Property data is empty (to prevent redundant calls)
        if (selectedAddress?.formattedAddress && propertyState.properties.length === 0) {
            fetchPropertyData();
        }
    }, [selectedAddress, dispatch, propertyState.properties.length]);
    

    // Step 1 -> Step 2: After selecting the address
    const handleSelectCondition = () => {
        if (!selectedAddress) {
            alert('Please select an address first.');
            return;
        }
        dispatch(
            setAddressData({
                street1: selectedAddress.street1,
                street2: selectedAddress.street2,
                city: selectedAddress.city,
                state: selectedAddress.state,
                zip: selectedAddress.zip,
                formattedAddress: selectedAddress.formattedAddress,
                lat: selectedAddress.lat,
                lng: selectedAddress.lng,
            })
        );
        setStep(2);
        requestAnimationFrame(() => {
            step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    // Step 2 -> Step 3: User clicks "Get My Offer"
    const handleGetMyOffer = async () => {
        if (!selectedAddress) {
            alert('Please select an address first.');
            return;
        }

        try {
            setIsButtonLoading(true);
            // Optionally perform any final checks or data fetching if needed
        } finally {
            setIsButtonLoading(false);
        }

        dispatch(setAddressData({ condition: selectedCondition }));
        setStep(3);
        requestAnimationFrame(() => {
            step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    // Open the callback modal
    const handleOpenCallbackModal = () => {
        setIsCallbackModalOpen(true);
    };

    const handleOpenUploadModal = () => {
        setIsUploadModalOpen(true);
    };

    const handleUploadImages = (files: File[]) => {
        alert(`Uploaded ${files.length} image(s)!`);
        setStep(5);
    };

    const handleBackToStep1 = () => {
        setStep(1);
        requestAnimationFrame(() => {
            step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    const handleBackToStep2 = () => {
        setStep(2);
    };

    // Render each step component
    const renderStep1 = () => (
        <Box ref={step1Ref}>
            {step === 1 && (
                <AddressInputStep
                    addressInput={addressInput}
                    onAddressChange={setAddressInput}
                    onAddressSelect={setSelectedAddress}
                    onNext={handleSelectCondition}
                />
            )}
        </Box>
    );

    const renderStep2 = () => (
        <Box ref={step2Ref}>
            {step === 2 && (
                <ConditionStep
                    selectedCondition={selectedCondition}
                    onSelectCondition={setSelectedCondition}
                    onBack={handleBackToStep1}
                    onNext={handleGetMyOffer}
                    isLoading={isButtonLoading}
                />
            )}
        </Box>
    );

    const renderStep3 = () => (
        <Box ref={step3Ref}>
            {step === 3 && (
                <EstimateUWStep
                    selectedAddress={selectedAddress}
                    googleApiKey={googleApiKey}
                    addressState={addressState}
                    handleOpenCallbackModal={handleOpenCallbackModal}
                    handleBackToStep2={handleBackToStep2}
                    onNext={handleBackToStep1}
                    handleOpenUploadModal={handleOpenUploadModal}
                />
            )}
        </Box>
    );

    const verticalSteps = [
        { title: 'Address', description: 'Enter your address' },
        { title: 'Condition', description: 'Describe your home' },
        { title: 'Estimate/UW', description: 'Underwriting estimate' },
        { title: 'Verify', description: 'Verify your info' },
        { title: 'Offers', description: 'View your offers' },
    ];

    return (
        <>
            <APIProvider apiKey={googleApiKey} libraries={['places']}>
                <Flex height="100vh" overflow="hidden">
                    <Box
                        w={['100%', '300px']}
                        borderRightWidth={[0, '1px']}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        p={4}
                        position="sticky"
                        top={0}
                        h="100vh"
                    >
                        <Stepper orientation="vertical" index={step - 1} colorScheme="teal" gap="100">
                            {verticalSteps.map((item, index) => (
                                <Step key={index}>
                                    <StepIndicator>
                                        <StepStatus
                                            complete={<CheckIcon />}
                                            incomplete={<StepNumber />}
                                            active={<StepNumber />}
                                        />
                                    </StepIndicator>
                                    <Box flexShrink={0}>
                                        <StepTitle>{item.title}</StepTitle>
                                        <StepDescription>{item.description}</StepDescription>
                                    </Box>
                                    <StepSeparator />
                                </Step>
                            ))}
                        </Stepper>
                    </Box>
                    <Box flex="1" overflowY="auto">
                        <Box
                            flex="1"
                            bgImage="url('https://images.unsplash.com/photo-1600596542815-ffad1c153d63?q=80&w=2070&auto=format&fit=crop')"
                            bgSize="cover"
                            bgPos="center"
                            textAlign="center"
                            py={8}
                            minH="100vh"
                        >
                            <VStack
                                spacing={8}
                                w={['90%', '600px']}
                                mx="auto"
                                p={6}
                                borderRadius="md"
                                bg={useColorModeValue('rgba(255,255,255,0.7)', 'rgba(0,0,0,0.5)')}
                            >
                                <Box ref={step1Ref}>{step === 1 && renderStep1()}</Box>
                                <Box ref={step2Ref}>{step === 2 && renderStep2()}</Box>
                                <Box>{step === 3 && renderStep3()}</Box>
                            </VStack>
                        </Box>
                    </Box>
                </Flex>
            </APIProvider>
            <SpecialistCallModal
                isOpen={isCallbackModalOpen}
                onClose={() => setIsCallbackModalOpen(false)}
            />
        </>
    );
};

export default EstimatePage;
