import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Heading,
    Text,
    Flex,
    VStack,
    HStack,
    Input,
    Textarea,
    Icon,
    useDisclosure,
    Link,
    Divider,
    SimpleGrid,
    Badge,
    Card,
    CardBody,
    CardHeader,
    FormControl,
    FormLabel,
    FormErrorMessage,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    CloseButton,
} from '@chakra-ui/react';
import config from '../../../../../config';
import { FaArrowLeft, FaCheckCircle, FaCheck } from 'react-icons/fa';
import { AddressComponents } from '../../../address/components/PlaceAutocompleteInput';
import PropertyHeaderCard from '../PropertyHeaderCard';
import BuyerMatchingModal from '../BuyerMatchingModal';
import EnhancedImageUpload from '../../../components/EnhancedImageUpload';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setCreditInfo, setLoading as setCreditLoading, setError as setCreditError, updateCredits } from '../../../store/creditSlice';
import { 
    validateForm, 
    validationRules, 
    formatPrice, 
    extractNumericPrice,
    FormValidationSchema 
} from '../../../services/formValidationService';

interface ExecutiveServicesStepProps {
    selectedAddress: AddressComponents | null;
    googleApiKey: string;
    addressState: {
        lat: number;
        lng: number;
        formattedAddress: string;
        [key: string]: any;
    };
    handleBackToEstimate: () => void;
    onNext: () => void;
}

interface UploadedImage {
    id: string;
    url: string;
    name: string;
    type: 'file' | 'url' | 'google';
}

const ExecutiveServicesStep: React.FC<ExecutiveServicesStepProps> = ({
    selectedAddress,
    googleApiKey,
    addressState,
    handleBackToEstimate,
    onNext,
}) => {
    // Form state
    const [yourEstimatedPrice, setYourEstimatedPrice] = useState<string>('');
    const [targetOfferPrice, setTargetOfferPrice] = useState<string>('');
    const [notesAboutPropertyUW, setNotesAboutPropertyUW] = useState<string>('');
    const [notesAboutPropertyOffer, setNotesAboutPropertyOffer] = useState<string>('');
    const [underwriteImages, setUnderwriteImages] = useState<UploadedImage[]>([]);
    const [underwritePhotoUrl, setUnderwritePhotoUrl] = useState<string>('');
    // Get Offers form state
    const [offerImages, setOfferImages] = useState<UploadedImage[]>([]);
    const [offerPhotoUrl, setOfferPhotoUrl] = useState<string>('');
    
    // Validation state
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [isSubmittingUnderwrite, setIsSubmittingUnderwrite] = useState(false);
    const [isSubmittingOffers, setIsSubmittingOffers] = useState(false);
    
    // Get property data from Redux
    const propertyState = useAppSelector((state: any) => state.property);
    const property = propertyState.properties[0] || null;
    const user = useAppSelector(state => state.user);
    
    // Error/success message state for AlertBox
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const targetProperty = property?.addressData?.items?.[0] || null;
    
    const propertyDetails = {
        beds: targetProperty?.bedrooms ?? 'Not Found',
        baths: targetProperty?.bathrooms ?? 'Not Found',
        sqft: targetProperty?.square_footage ?? 'Not Found',
        year: targetProperty?.year_built ?? 'Not Found'
    };
    
    // State for actual homes sold count from database
    const [homesSoldCount, setHomesSoldCount] = useState<number>(0);
    
    // Get buyers count from Redux store
    const buyersState = useAppSelector((state) => state.buyers);
    const interestedBuyersCount = buyersState.buyers.length > 0 ? buyersState.buyers.length : 0;
    
    // Get credit info from Redux store
    const creditState = useAppSelector((state) => state.credit);
    const dispatch = useAppDispatch();

    // Add navigation hook
    const navigate = useNavigate();
    
    // Success modal state with bullet points animation
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        formType: 'underwrite' | 'get-offers' | null;
        visibleBullets: number;
    }>({ isOpen: false, formType: null, visibleBullets: 0 });
    
    // State for tracking offer matching request submission
    const [offerMatchingSubmitted, setOfferMatchingSubmitted] = useState(false);
    const [isLoadingOfferStatus, setIsLoadingOfferStatus] = useState(false);
    
    // State for submission timestamp
    const [submissionTimestamp, setSubmissionTimestamp] = useState<Date | null>(null);
    
    // State for insufficient credits banner
    const [showInsufficientCreditsBanner, setShowInsufficientCreditsBanner] = useState(false);
    const [insufficientCreditsInfo, setInsufficientCreditsInfo] = useState<{
        required: number;
        available: number;
        message: string;
    } | null>(null);
    
    // Fetch offer sourcing request status from database
    useEffect(() => {
        const fetchOfferSourcingStatus = async () => {
            if (user?.user_id && user.isLoggedIn) {
                try {
                    setIsLoadingOfferStatus(true);
                    
                    const response = await fetch(`${config.apiUrl}/api/requests/offer-sourcing/status/${user.user_id}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.success && data.data) {
                            // User has a pending or approved request
                            setOfferMatchingSubmitted(true);
                            if (data.data.submitted_at) {
                                setSubmissionTimestamp(new Date(data.data.submitted_at));
                            }
                            // Offer sourcing request status logged
                        } else {
                            // No pending request found
                            setOfferMatchingSubmitted(false);
                            setSubmissionTimestamp(null);
                        }
                    } else {
                        // Failed to fetch offer sourcing status
                        // On error, default to false to allow new submissions
                        setOfferMatchingSubmitted(false);
                    }
                } catch (error) {
                    // Error fetching offer sourcing status
                    // On error, default to false to allow new submissions
                    setOfferMatchingSubmitted(false);
                } finally {
                    setIsLoadingOfferStatus(false);
                }
            }
        };
        
        fetchOfferSourcingStatus();
    }, [user?.user_id, user?.isLoggedIn]);
    
    // Fetch credit information when user changes or component mounts
    useEffect(() => {
        const fetchCreditInfo = async () => {
            if (user?.user_id && user.isLoggedIn) {
                try {
                    dispatch(setCreditLoading(true));
                    
                    const response = await fetch(`${config.apiUrl}/api/credits/user/${user.user_id}`);
                    const data = await response.json();
                    
                    if (data.success) {
                        dispatch(setCreditInfo(data.data));
                    } else {
                        // Failed to fetch credit info
                        dispatch(setCreditError(data.message || 'Failed to fetch credit information'));
                    }
                } catch (error) {
                    // Error fetching credit info
                    dispatch(setCreditError('Failed to load credit information'));
                } finally {
                    dispatch(setCreditLoading(false));
                }
            }
        };
        
        fetchCreditInfo();
    }, [user?.user_id, user?.isLoggedIn, dispatch]);
    
    // State for the buyer matching modal
    const {
        isOpen: isBuyerMatchingModalOpen,
        onOpen: onOpenBuyerMatchingModal,
        onClose: onCloseBuyerMatchingModal
    } = useDisclosure();
    
    // Fetch actual homes sold count from database when zip code is available
    useEffect(() => {
        const fetchHomesSoldCount = async () => {
            try {
                const zipCode = targetProperty?.zip_code;
                
                if (zipCode) {
                    // Fetching homes sold count for zip code
                    const response = await fetch(`${config.apiUrl}/api/property/homes-sold-count/${zipCode}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Homes sold count from database
                        setHomesSoldCount(data.salesCount);
                    } else {
                        // Failed to fetch homes sold count
                        setHomesSoldCount(24);
                    }
                } else {
                    setHomesSoldCount(24);
                }
            } catch (error) {
                // Error fetching homes sold count
                setHomesSoldCount(24);
            }
        };
        
        fetchHomesSoldCount();
    }, [targetProperty?.zip_code]);
    
    // Theme colors
    const bgPrimary = 'background.primary';
    const textPrimary = 'text.primary';
    const textSecondary = 'text.secondary';
    
    // Handle price input formatting
    const handlePriceChange = (value: string, setter: (value: string) => void) => {
        const formatted = formatPrice(value);
        setter(formatted);
    };

    // Validate individual form
    const validateFormSection = (formType: 'underwrite' | 'get-offers'): boolean => {
        const isUnderwrite = formType === 'underwrite';
        
        const schema: FormValidationSchema = {
            price: {
                value: isUnderwrite ? yourEstimatedPrice : targetOfferPrice,
                rules: validationRules.price,
                label: isUnderwrite ? 'Estimated Price' : 'Target Offer Price'
            },
            notes: {
                value: isUnderwrite ? notesAboutPropertyUW : notesAboutPropertyOffer,
                rules: validationRules.notes,
                label: 'Notes About Property'
            },
            images: {
                value: isUnderwrite ? underwriteImages : offerImages,
                rules: validationRules.images,
                label: 'Property Images'
            }
        };

        const validation = validateForm(schema);
        
        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            return false;
        }

        setValidationErrors({});
        return true;
    };

    // Effect to animate bullet points in success modal
    useEffect(() => {
        if (successModal.isOpen && successModal.visibleBullets < 4) {
            const timer = setTimeout(() => {
                setSuccessModal(prev => ({
                    ...prev,
                    visibleBullets: prev.visibleBullets + 1
                }));
            }, 500); // Show each bullet point every 500ms
            
            return () => clearTimeout(timer);
        }
    }, [successModal.isOpen, successModal.visibleBullets]);

    // Handle form submission with database storage and email notifications
    const handleFormSubmission = async (formType: 'underwrite' | 'get-offers') => {
        if (!validateFormSection(formType)) {
            return;
        }

        // Set loading state for the specific form type
        if (formType === 'underwrite') {
            setIsSubmittingUnderwrite(true);
        } else {
            setIsSubmittingOffers(true);
        }

        try {
            const isUnderwrite = formType === 'underwrite';
            
            if (isUnderwrite) {
                // Submit underwrite request to database
                // Create images array that includes both uploaded images and photo URL
                const allImages = [...underwriteImages];
                
                // Add photo URL as an image if provided
                if (underwritePhotoUrl && underwritePhotoUrl.trim()) {
                    allImages.push({
                        id: `url-${Date.now()}`,
                        url: underwritePhotoUrl.trim(),
                        name: `Photo URL: ${underwritePhotoUrl.trim()}`,
                        type: 'url' as const
                    });
                }
                
                const underwriteData = {
                    user_id: user?.user_id ? Number(user.user_id) : undefined,
                    property_address: selectedAddress?.formattedAddress || 'Unknown Address',
                    estimated_price: yourEstimatedPrice,
                    notes: notesAboutPropertyUW,
                    property_beds: propertyDetails.beds?.toString(),
                    property_baths: propertyDetails.baths?.toString(),
                    property_sqft: propertyDetails.sqft?.toString(),
                    property_year: propertyDetails.year?.toString(),
                    photo_url: underwritePhotoUrl && underwritePhotoUrl.trim() ? underwritePhotoUrl.trim() : undefined,
                    images_data: allImages.map(img => ({
                        id: img.id,
                        url: img.url,
                        name: img.name,
                        type: img.type
                    }))
                };

                const response = await fetch(`${config.apiUrl}/api/requests/underwrite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(underwriteData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    
                    // Handle insufficient credits specifically (HTTP 402)
                    if (response.status === 402) {
                        setInsufficientCreditsInfo({
                            required: errorData.data?.requiredCredits || 1,
                            available: errorData.data?.availableCredits || 0,
                            message: errorData.data?.creditMessage || errorData.message
                        });
                        setShowInsufficientCreditsBanner(true);
                        return; // Don't throw error, just show banner
                    }
                    
                    throw new Error(errorData.message || 'Failed to submit underwrite request');
                }

                const result = await response.json();
                
                if (result.success) {
                    // Update credit state with new balance
                    if (result.data?.creditInfo?.consumed && result.data?.creditInfo?.newBalance !== undefined) {
                        dispatch(updateCredits({
                            availableCredits: result.data.creditInfo.newBalance,
                            usedCredits: creditState.usedCredits + 1
                        }));
                        // Credits updated
                    }
                    
                    // Clear any insufficient credits banner
                    setShowInsufficientCreditsBanner(false);
                    setInsufficientCreditsInfo(null);
                    
                    // Show success modal with animation
                    setSuccessModal({ isOpen: true, formType, visibleBullets: 0 });

                    // Clear form data
                    setYourEstimatedPrice('');
                    setNotesAboutPropertyUW('');
                    setUnderwriteImages([]);
                    setUnderwritePhotoUrl('');
                } else {
                    throw new Error(result.message || 'Failed to process underwrite request');
                }
            } else {
                // Submit get offers request to database
                // Create images array that includes both uploaded images and photo URL
                const allImages = [...offerImages];
                
                // Add photo URL as an image if provided
                if (offerPhotoUrl && offerPhotoUrl.trim()) {
                    allImages.push({
                        id: `url-${Date.now()}`,
                        url: offerPhotoUrl.trim(),
                        name: `Photo URL: ${offerPhotoUrl.trim()}`,
                        type: 'url' as const
                    });
                }
                
                const offerData = {
                    user_id: user?.user_id ? Number(user.user_id) : undefined,
                    property_address: selectedAddress?.formattedAddress || 'Unknown Address',
                    targetPrice: targetOfferPrice,
                    notes: notesAboutPropertyOffer,
                    property_beds: propertyDetails.beds?.toString(),
                    property_baths: propertyDetails.baths?.toString(),
                    property_sqft: propertyDetails.sqft?.toString(),
                    property_year: propertyDetails.year?.toString(),
                    photoURL: offerPhotoUrl && offerPhotoUrl.trim() ? offerPhotoUrl.trim() : undefined,
                    photos: allImages.map(img => ({
                        id: img.id,
                        url: img.url,
                        name: img.name,
                        type: img.type
                    }))
                };

                const response = await fetch(`${config.apiUrl}/api/requests/offers/request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(offerData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    
                    // Handle insufficient credits specifically (HTTP 402)
                    if (response.status === 402) {
                        setInsufficientCreditsInfo({
                            required: errorData.data?.requiredCredits || 1,
                            available: errorData.data?.availableCredits || 0,
                            message: errorData.data?.creditMessage || errorData.message
                        });
                        setShowInsufficientCreditsBanner(true);
                        return; // Don't throw error, just show banner
                    }
                    
                    throw new Error(errorData.message || 'Failed to submit offer request');
                }

                const result = await response.json();
                
                if (result.success) {
                    // Update credit state with new balance if credits are consumed
                    if (result.data?.creditInfo?.consumed && result.data?.creditInfo?.newBalance !== undefined) {
                        dispatch(updateCredits({
                            availableCredits: result.data.creditInfo.newBalance,
                            usedCredits: creditState.usedCredits + 1
                        }));
                        // Credits updated
                    }
                    
                    // Clear any insufficient credits banner
                    setShowInsufficientCreditsBanner(false);
                    setInsufficientCreditsInfo(null);
                    
                    // Show success modal with animation
                    setSuccessModal({ isOpen: true, formType, visibleBullets: 0 });

                    // Clear form data
                    setTargetOfferPrice('');
                    setNotesAboutPropertyOffer('');
                    setOfferImages([]);
                    setOfferPhotoUrl('');
                } else {
                    throw new Error(result.message || 'Failed to process offer request');
                }
            }

        } catch (error) {
            // Error submitting form
            setErrorMessage(error instanceof Error ? error.message : 'Please try again or contact support.');
            setTimeout(() => {
                setErrorMessage(null);
            }, 7000);
        } finally {
            // Reset loading state for the specific form type
            if (formType === 'underwrite') {
                setIsSubmittingUnderwrite(false);
            } else {
                setIsSubmittingOffers(false);
            }
        }
    };
    
    // Handle continue button in success modal
    const handleSuccessModalContinue = () => {
        setSuccessModal({ isOpen: false, formType: null, visibleBullets: 0 });
        navigate('/estimate?step=1');
    };
    
    // Callback for when offer matching request is successfully submitted
    const handleOfferMatchingSuccess = async () => {
        // Immediately update UI state
        const now = new Date();
        setOfferMatchingSubmitted(true);
        setSubmissionTimestamp(now);
        
        // Optionally refetch status from database to ensure consistency
        if (user?.user_id && user.isLoggedIn) {
            try {
                const response = await fetch(`${config.apiUrl}/api/requests/offer-sourcing/status/${user.user_id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success && data.data) {
                        setOfferMatchingSubmitted(true);
                        if (data.data.submitted_at) {
                            setSubmissionTimestamp(new Date(data.data.submitted_at));
                        }
                    }
                }
            } catch (error) {
                // Error refetching offer sourcing status
                // Keep the UI state as is if refetch fails
            }
        }
    };

    return (
        <Box w="100%">
            {/* Heading */}
            {/* <Box mb={4} pt={0} mt={0}>
                <Heading size="lg" color={textPrimary}>
                    Executive Services
                </Heading>
                <Text color={textSecondary} mt={1}>
                    Request specialized services for your property
                </Text>
            </Box> */}
            
            {/* Property details card */}
            {/* <PropertyHeaderCard
                selectedAddress={selectedAddress}
                googleApiKey={googleApiKey}
                propertyDetails={propertyDetails}
                homesSoldCount={homesSoldCount}
                interestedBuyersCount={interestedBuyersCount}
                onPropertyUpdate={() => {
                    // For ExecutiveServicesStep, we don't need to trigger recalculation
                    // since this step is for submitting requests, not viewing estimates
                }}
            /> */}
            
            {/* Service Requests */}
            <Box mb={6}>
                <Heading as="h2" size="lg" mb={4}>
                    Service Requests
                </Heading>
                <Text fontWeight="medium" textAlign="right" mb={4}>
                    {user?.isLoggedIn ? (
                        creditState.loading ? (
                            'Loading credits...'
                        ) : creditState.error ? (
                            'Error loading credits'
                        ) : (
                            `Credits Remaining: ${creditState.availableCredits}`
                        )
                    ) : (
                        'Please log in to view credits'
                    )}
                </Text>
                
                {/* Insufficient Credits Banner */}
                {showInsufficientCreditsBanner && insufficientCreditsInfo && (
                    <Alert status="warning" borderRadius="md" mb={4}>
                        <AlertIcon />
                        <Box flex="1">
                            <AlertTitle>Insufficient Credits!</AlertTitle>
                            <AlertDescription display="block">
                                Consider upgrading to the{' '}
                                <Link 
                                    href="/pricing" 
                                    color="blue.500" 
                                    fontWeight="medium"
                                    textDecoration="underline"
                                >
                                    Professional Plan
                                </Link>
                                {' '}for more credits!
                            </AlertDescription>
                        </Box>
                        <CloseButton
                            alignSelf="flex-start"
                            position="relative"
                            right={-1}
                            top={-1}
                            onClick={() => setShowInsufficientCreditsBanner(false)}
                        />
                    </Alert>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <Alert status="error" borderRadius="md" mb={4}>
                        <AlertIcon />
                        <Box flex="1">
                            <AlertTitle mr={2}>Submission Failed!</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Box>
                        <CloseButton
                            alignSelf="flex-start"
                            position="relative"
                            right={-1}
                            top={-1}
                            onClick={() => setErrorMessage(null)}
                        />
                    </Alert>
                )}

                {/* Success Message */}
                {successMessage && (
                    <Alert status="success" borderRadius="md" mb={4}>
                        <AlertIcon />
                        <Box flex="1">
                            <AlertTitle mr={2}>Success!</AlertTitle>
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Box>
                        <CloseButton
                            alignSelf="flex-start"
                            position="relative"
                            right={-1}
                            top={-1}
                            onClick={() => setSuccessMessage(null)}
                        />
                    </Alert>
                )}
                
                <Flex 
                    direction={{ base: "column", md: "row" }} 
                    gap={6}
                >
                    {/* Underwrite Service */}
                    <Box 
                        flex="1"
                        bg="gray.50"
                        borderRadius="lg"
                        p={6}
                    >
                        <Text fontSize="2xl" mb={4}>
                            Underwrite
                        </Text>
                        
                        <VStack spacing={4} align="stretch">
                            <FormControl 
                                isRequired 
                                isInvalid={!!validationErrors.price}
                            >
                                <FormLabel>Your Estimated Price</FormLabel>
                                <Input 
                                    placeholder="Enter Your Price (e.g., $250,000)"
                                    value={yourEstimatedPrice}
                                    onChange={(e) => handlePriceChange(e.target.value, setYourEstimatedPrice)}
                                />
                                <FormErrorMessage>{validationErrors.price}</FormErrorMessage>
                            </FormControl>
                            
                            <EnhancedImageUpload
                                label="Upload Photos"
                                isRequired={false}
                                isInvalid={!!validationErrors.images}
                                errorMessage={validationErrors.images}
                                propertyAddress={selectedAddress?.formattedAddress || ''}
                                propertyId={property?.id || property?.property_id}
                                type="underwrite"
                                maxImages={10}
                                value={underwriteImages}
                                onImagesChange={setUnderwriteImages}
                            />
                            
                            <FormControl>
                                <FormLabel>Link for photos</FormLabel>
                                <Input 
                                    placeholder="Paste image URL here..."
                                    value={underwritePhotoUrl}
                                    onChange={(e) => setUnderwritePhotoUrl(e.target.value)}
                                />
                            </FormControl>
                            
                            <FormControl 
                                isRequired 
                                isInvalid={!!validationErrors.notes}
                            >
                                <FormLabel>Notes</FormLabel>
                                <Textarea 
                                    placeholder="Roof replaced 2020, HVAC needs replacement, etc."
                                    value={notesAboutPropertyUW}
                                    onChange={(e) => setNotesAboutPropertyUW(e.target.value)}
                                    minH="100px"
                                />
                                <FormErrorMessage>{validationErrors.notes}</FormErrorMessage>
                            </FormControl>
                            
                            <Button 
                                onClick={() => handleFormSubmission('underwrite')}
                                colorScheme="green"
                                bg="green.800"
                                size="lg"
                                width="100%"
                                mt={2}
                                isLoading={isSubmittingUnderwrite}
                                loadingText="Submitting..."
                                _hover={{
                                    bg: "brand.500",
                                    transform: "translateY(-2px)",
                                    boxShadow: "lg"
                                }}
                            >
                                Get Underwrite
                            </Button>
                        </VStack>
                    </Box>
                    
                    {/* Get Offers Service */}
                    <Box 
                        flex="1"
                        bg="gray.50"
                        borderRadius="lg"
                        p={6}
                    >
                        <Text fontSize="2xl" mb={4}>
                            Get Offers
                        </Text>
                        
                        <VStack spacing={4} align="stretch">
                            <FormControl 
                                isRequired 
                                isInvalid={!!validationErrors.price}
                            >
                                <FormLabel>Target Offer Price</FormLabel>
                                <Input 
                                    placeholder="Enter Target Price (e.g., $275,000)"
                                    value={targetOfferPrice}
                                    onChange={(e) => handlePriceChange(e.target.value, setTargetOfferPrice)}
                                />
                                <FormErrorMessage>{validationErrors.price}</FormErrorMessage>
                            </FormControl>
                            
                            <EnhancedImageUpload
                                label="Upload Photos"
                                isRequired={false}
                                isInvalid={!!validationErrors.images}
                                errorMessage={validationErrors.images}
                                propertyAddress={selectedAddress?.formattedAddress || ''}
                                propertyId={property?.id || property?.property_id}
                                type="getoffer"
                                maxImages={10}
                                value={offerImages}
                                onImagesChange={setOfferImages}
                            />
                            
                            <FormControl>
                                <FormLabel>Link for photos</FormLabel>
                                <Input 
                                    placeholder="Paste image URL here..."
                                    value={offerPhotoUrl}
                                    onChange={(e) => setOfferPhotoUrl(e.target.value)}
                                />
                            </FormControl>
                            
                            <FormControl 
                                isRequired 
                                isInvalid={!!validationErrors.notes}
                            >
                                <FormLabel>Notes</FormLabel>
                                <Textarea 
                                    placeholder="Roof replaced 2020, HVAC needs replacement, etc."
                                    value={notesAboutPropertyOffer}
                                    onChange={(e) => setNotesAboutPropertyOffer(e.target.value)}
                                    minH="100px"
                                />
                                <FormErrorMessage>{validationErrors.notes}</FormErrorMessage>
                            </FormControl>
                            
                            <Button 
                                onClick={() => handleFormSubmission('get-offers')}
                                colorScheme="green"
                                bg="green.800"
                                size="lg"
                                width="100%"
                                mt={2}
                                isLoading={isSubmittingOffers}
                                loadingText="Submitting..."
                                _hover={{
                                    bg: "brand.500",
                                    transform: "translateY(-2px)",
                                    boxShadow: "lg"
                                }}
                            >
                                Get Offer
                            </Button>
                        </VStack>
                    </Box>
                </Flex>
            </Box>
            
            {/* Action buttons */}
            <Box>
                <HStack w="100%" spacing={4}>
                    <Button
                        onClick={handleBackToEstimate}
                        leftIcon={<Icon as={FaArrowLeft as any} />}
                        variant="outline"
                        flex="1"
                    >
                        Back
                    </Button>
                    
                    <Button
                        onClick={onNext}
                        colorScheme="green"
                        bg="green.800"
                        size="lg"
                        flex="2"
                        _hover={{
                            bg: "brand.500",
                            transform: "translateY(-2px)",
                            boxShadow: "lg"
                        }}
                    >
                        Get Another Estimate
                    </Button>
                </HStack>
            </Box>

            {/* Buyer Matching Modal */}
            <BuyerMatchingModal
                isOpen={isBuyerMatchingModalOpen}
                onClose={onCloseBuyerMatchingModal}
                addressData={selectedAddress?.formattedAddress || ''}
                onSuccess={handleOfferMatchingSuccess}
            />

            {/* Success Modal */}
            <AlertDialog 
                isOpen={successModal.isOpen} 
                onClose={() => setSuccessModal({ isOpen: false, formType: null, visibleBullets: 0 })}
                leastDestructiveRef={useRef(null)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            <Icon as={FaCheckCircle as React.ElementType} color="brand.500" mr={2} />
                            Request Submitted Successfully!
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            <VStack spacing={3} align="start">
                                <Text>
                                    Your {successModal.formType === 'underwrite' ? 'underwrite' : 'offer'} request has been submitted successfully.
                                </Text>
                                <Box bg="brand.50" p={3} borderRadius="md" w="full">
                                    <Text fontSize="sm" color="brand.700" mb={2}>
                                        <strong>What happens next:</strong>
                                    </Text>
                                    <VStack spacing={2} align="start">
                                        {successModal.visibleBullets >= 1 && (
                                            <HStack spacing={2}>
                                                <Icon as={FaCheck as React.ElementType} color="brand.500" boxSize={3} />
                                                <Text fontSize="sm" color="brand.600">
                                                    You'll receive a confirmation email shortly
                                                </Text>
                                            </HStack>
                                        )}
                                        {successModal.visibleBullets >= 2 && (
                                            <HStack spacing={2}>
                                                <Icon as={FaCheck as React.ElementType} color="brand.500" boxSize={3} />
                                                <Text fontSize="sm" color="brand.600">
                                                    Our team will review your request within 24-48 hours
                                                </Text>
                                            </HStack>
                                        )}
                                        {successModal.visibleBullets >= 3 && (
                                            <HStack spacing={2}>
                                                <Icon as={FaCheck as React.ElementType} color="brand.500" boxSize={3} />
                                                <Text fontSize="sm" color="brand.600">
                                                    We'll contact you with detailed results
                                                </Text>
                                            </HStack>
                                        )}
                                        {successModal.visibleBullets >= 4 && (
                                            <HStack spacing={2}>
                                                <Icon as={FaCheck as React.ElementType} color="brand.500" boxSize={3} />
                                                <Text fontSize="sm" color="brand.600">
                                                    Check your email for updates
                                                </Text>
                                            </HStack>
                                        )}
                                    </VStack>
                                </Box>
                            </VStack>
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button 
                                colorScheme="brand" 
                                onClick={handleSuccessModalContinue}
                                _hover={{
                                    bg: "brand.600",
                                    transform: "translateY(-2px)",
                                    boxShadow: "lg"
                                }}
                            >
                                Continue
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
};

export default ExecutiveServicesStep; 