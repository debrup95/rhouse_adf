import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    Text,
    Flex,
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
    Icon,
    Button,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Spinner,
    Center,
    Progress,
    Heading,
    HStack,
    useColorModeValue,
    useToast,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setAddressData } from '../store/addressSlice';
import { AddressComponents } from '../address/components/PlaceAutocompleteInput';
import { FaArrowLeft, FaCheck, FaHome } from 'react-icons/fa';
import { LoadingModal } from './prpLoading';
import AddressInputStep, { AddressInputStepRef } from "./components/steps/AddressInputStep";
import ManualAddressStep from "./components/steps/ManualAddressStep";
import ConditionStep from "./components/steps/ConditionStep";
import EstimatedOfferStep from "./components/steps/EstimatedOfferStep";
import ExecutiveServicesStep from "./components/steps/ExecutiveServicesStep";
import { addProperty, setProperties, setError, clearPropertyData } from '../store/propertySlice';
import { clearDetailedRehabValues } from '../store/underwriteSlice';
import SpecialistCallModal from './components/SpecialistCallModal';
import TennesseeBanner from '../components/TennesseeBanner';
import StateNotificationModal from '../components/StateNotificationModal';
import OutOfStateModal from '../components/OutOfStateModal';
import config from '../../../config';
import SearchHistoryService from '../services/searchHistoryService';
import SearchHistory from './components/SearchHistory';
import { validateAddress } from '../services/addressValidationService';

// Define libraries array outside component to prevent re-creation
const GOOGLE_MAPS_LIBRARIES: string[] = ['places', 'geometry'];

const EstimatePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    
    // Flag to track step transitions
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Add minimum loading time state
    const [showMinimumLoading, setShowMinimumLoading] = useState(false);
    const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
    
    // Initialize step from URL or default to 1
    const initialStep = parseInt(searchParams.get('step') || '1', 10);
    const [step, setStep] = useState(initialStep);
    
    // Function to update both state and URL when changing steps
    const updateStep = (newStep: number) => {
        setIsTransitioning(true);
        setStep(newStep);
        setSearchParams({ step: newStep.toString() });
        
        // Reset the transition flag after a short delay
        setTimeout(() => {
            setIsTransitioning(false);
        }, 100);
    };

    // Address input
    const [addressInput, setAddressInput] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null);
    
    // Manual address state
    const [showManualAddress, setShowManualAddress] = useState(false);
    const [originalAddress, setOriginalAddress] = useState<AddressComponents | null>(null);

    // Search History state
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [searchHistory, setSearchHistory] = useState<any[]>([]);

    // Condition (no longer used for fetching, but you can still store it)
    const [selectedCondition, setSelectedCondition] = useState('');
    // Button spinner state
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    // Address validation loading state
    const [isAddressValidating, setIsAddressValidating] = useState(false);
    
    // Add state for rehab values from condition step
    const [conditionRehabValues, setConditionRehabValues] = useState<Record<string, number>>({});

    // Property type state
    const [propertyType, setPropertyType] = useState<string>('');
    const [isSingleFamilyHome, setIsSingleFamilyHome] = useState<boolean>(true);

    // Other UI states
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    
    // Tennessee banner and state notification states
    const [isBannerVisible, setIsBannerVisible] = useState(true);
    const [isStateNotificationModalOpen, setIsStateNotificationModalOpen] = useState(false);
    const [isOutOfStateModalOpen, setIsOutOfStateModalOpen] = useState(false);
    const [outOfStateName, setOutOfStateName] = useState('');
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // Refs for smooth scrolling
    const step1Ref = useRef<HTMLDivElement | null>(null);
    const step2Ref = useRef<HTMLDivElement | null>(null);
    const step3Ref = useRef<HTMLDivElement | null>(null);
    const step4Ref = useRef<HTMLDivElement | null>(null);
    const step5Ref = useRef<HTMLDivElement | null>(null);
    
    // Ref for AddressInputStep to access focus method
    const addressInputStepRef = useRef<AddressInputStepRef | null>(null);

    const googleApiKey = (window as any).env?.REACT_APP_Maps_API_KEY || process.env.REACT_APP_Maps_API_KEY || '';
    const addressState = useAppSelector((state) => state.address);
    const propertyState = useAppSelector((state) => state.property);
    const user = useAppSelector((state) => state.user);
    const toast = useToast();

    // Add loading states
    const [isPropertyDataLoading, setIsPropertyDataLoading] = useState(false);
    const [propertyDataLoaded, setPropertyDataLoaded] = useState(false);
    
    // Add state to track property update loading
    const [isPropertyUpdateLoading, setIsPropertyUpdateLoading] = useState(false);
    const [propertyUpdateStartTime, setPropertyUpdateStartTime] = useState<number | null>(null);

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
            // Don't auto-set condition from address state - let user choose
            // setSelectedCondition(addressState.condition || '');
        }
    }, [addressState]);

    // Sync URL with current step when component mounts
    useEffect(() => {
        // Skip if we're in a transition to avoid conflicts
        if (isTransitioning) {
            return;
        }
        
        const stepParam = searchParams.get('step');
        if (stepParam) {
            const parsedStep = parseInt(stepParam, 10);
            if (parsedStep !== step && parsedStep >= 1 && parsedStep <= 5) {
                // Important: Use setIsTransitioning to prevent validation from running immediately
                setIsTransitioning(true);
                setStep(parsedStep);
                // Reset the transition flag after a delay
                setTimeout(() => {
                    setIsTransitioning(false);
                }, 100);
            }
        } else if (step !== 1) {
            // If no step in URL but step state is not 1, update URL without triggering transition
            setSearchParams({ step: step.toString() }, { replace: true });
        }
    }, [location.search, step, setSearchParams, searchParams]);
    
    // Validate step transitions based on data availability
    useEffect(() => {
        // Skip validation if we're in the middle of a transition
        if (isTransitioning) {
            return;
        }
        
        // Only allow step 2+ if we have an address
        if (step > 1 && !selectedAddress) {
            // Use setIsTransitioning here as well to prevent feedback loops
            setIsTransitioning(true);
            setStep(1);
            setSearchParams({ step: '1' }, { replace: true });
            setTimeout(() => {
                setIsTransitioning(false);
            }, 100);
            return;
        }
        
        // We've removed the property data check to allow navigation to step 3
        // even if property data isn't loaded yet
    }, [step, selectedAddress, isTransitioning, setSearchParams]);

    // Add a progress indicator to show when property data is loading
    useEffect(() => {
        // If we're on step 2 and property data is loading, show a loading state
        if (step === 2 && isPropertyDataLoading) {
            // Don't automatically set button loading when the step loads
            // This was causing the button to show "Processing..." even before clicking
            // setIsButtonLoading(true);
        } else if (step === 2 && propertyDataLoaded) {
            setIsButtonLoading(false);
        }
    }, [step, isPropertyDataLoading, propertyDataLoaded]);

    // Function to fetch property data
    const fetchPropertyData = async (addressToUse?: AddressComponents) => {
        const targetAddress = addressToUse || selectedAddress;
        if (!targetAddress) {
            return;
        }
        
        try {
            setIsPropertyDataLoading(true);
            setPropertyDataLoaded(false);
            
            // Clear existing property data first
            dispatch(setProperties([]));
            
            // Include user information if available for activity tracking
            const requestBody: any = { address: targetAddress };
            if (user.isLoggedIn && user.user_id) {
                requestBody.userId = parseInt(user.user_id);
                requestBody.searchType = 'property_details';
                requestBody.searchSource = 'web_app';
            }
            
            const response = await fetch(`${config.apiUrl}/api/property/property-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            
            if (response.ok) {
                const apiData = await response.json();
                
                // Define property structure interfaces
                interface ApiProperty {
                    id?: number;
                    parcl_property_id?: number;
                    address?: string;
                    city?: string;
                    state_abbreviation?: string;
                    state?: string;
                    zip_code?: string;
                    zipCode?: string;
                    price?: number;
                    list_price?: number;
                    sale_price?: number;
                    square_footage?: number;
                    squareFootage?: number;
                    bedrooms?: number;
                    bathrooms?: number;
                    year_built?: number;
                    yearBuilt?: number;
                    distance?: number;
                    status?: string;
                    soldDate?: string;
                    sale_date?: string;
                    latitude?: number;
                    longitude?: number;
                    similarityScore?: number;
                    property_type?: string;
                    isOutlier?: boolean;
                    // New fields for both sale and rental events
                    lastSalePrice?: number | null;
                    lastSaleDate?: string | null;
                    lastRentalPrice?: number | null;
                    lastRentalDate?: string | null;
                    rentalStatus?: string | null;
                    [key: string]: any;
                }
                
                interface PropertyData {
                    address: {
                        street1: string;
                        street2: string;
                        city: string;
                        state: string;
                        zip: string;
                        formattedAddress: string;
                        lat: number;
                        lng: number;
                    };
                    addressData: any;
                    neighborhoodProperties: Array<{
                        id: number | string;
                        address: string;
                        city: string;
                        state: string;
                        zipCode: string;
                        price: number;
                        squareFootage: number;
                        bedrooms: number;
                        bathrooms: number;
                        yearBuilt: number;
                        distance: number;
                        status: string;
                        soldDate: string;
                        latitude: number;
                        longitude: number;
                        similarityScore?: number;
                        isOutlier?: boolean;
                    }>;
                    allProperties: Array<{
                        id: number | string;
                        address: string;
                        city: string;
                        state: string;
                        zipCode: string;
                        price: number;
                        squareFootage: number;
                        bedrooms: number;
                        bathrooms: number;
                        yearBuilt: number;
                        distance: number;
                        status: string;
                        soldDate: string;
                        latitude: number;
                        longitude: number;
                        similarityScore?: number;
                        isOutlier?: boolean;
                    }>;
                    radiusUsed: number;
                    monthsUsed: number;
                    usedFallbackCriteria?: boolean;
                }
                
                // Create a properly structured data object for our Redux store
                const propertyData: PropertyData = {
                    address: {
                        street1: targetAddress.street1,
                        street2: targetAddress.street2,
                        city: targetAddress.city,
                        state: targetAddress.state,
                        zip: targetAddress.zip,
                        formattedAddress: targetAddress.formattedAddress,
                        lat: targetAddress.lat,
                        lng: targetAddress.lng,
                    },
                    addressData: {
                        items: Array.isArray(apiData.targetProperty) 
                            ? apiData.targetProperty 
                            : apiData.targetProperty ? [apiData.targetProperty] : []
                    },
                    neighborhoodProperties: [],
                    allProperties: [],
                    radiusUsed: apiData.radiusUsed || 0.5,
                    monthsUsed: apiData.monthsUsed || 3,
                    usedFallbackCriteria: apiData.usedFallbackCriteria || false
                };
                
                // Map the properties from the API response to neighborhoodProperties
                if (apiData.properties && Array.isArray(apiData.properties) && apiData.properties.length > 0) {
                    // The API returned properties - map them directly
                    propertyData.neighborhoodProperties = apiData.properties.map((prop: ApiProperty) => {
                        // Ensure each property has required fields with the correct naming
                        return {
                            id: prop.id || prop.parcl_property_id || Math.random(),
                            address: prop.address || 'Unknown Address',
                            city: prop.city || targetAddress.city,
                            state: prop.state_abbreviation || prop.state || targetAddress.state,
                            zipCode: prop.zip_code || prop.zipCode || targetAddress.zip,
                            price: prop.price || prop.list_price || prop.sale_price || 0,
                            squareFootage: prop.square_footage || prop.squareFootage || 0,
                            bedrooms: prop.bedrooms || 0,
                            bathrooms: prop.bathrooms || 0,
                            yearBuilt: prop.year_built || prop.yearBuilt || 0,
                            distance: prop.distance || 0,
                            status: prop.status || 'Unknown',
                            soldDate: prop.soldDate || prop.sale_date || '',
                            latitude: prop.latitude || 0,
                            longitude: prop.longitude || 0,
                            similarityScore: prop.similarityScore || 0
                        };
                    });
                } else if (apiData.comparableProperties && Array.isArray(apiData.comparableProperties) && apiData.comparableProperties.length > 0) {
                    // The API returned comparable properties - map them
                    propertyData.neighborhoodProperties = apiData.comparableProperties.map((prop: ApiProperty) => {
                        // Check for price data from different sources
                        const price = prop.price || 
                                    (prop.eventDetails && prop.eventDetails.price) || 
                                    prop.list_price || 
                                    prop.sale_price || 
                                    0;
                        
                        // Check for status value and map PRICE_CHANGE to RENTAL
                        let listingStatus = prop.eventDetails.event_name || 'Unknown';
                        if (listingStatus === 'PRICE_CHANGE') {
                            listingStatus = 'RENTAL';
                        }
                        
                        // Format and return the property
                        return {
                            id: prop.id || prop.parcl_property_id || Math.random(),
                            address: prop.address || 'Unknown Address',
                            city: prop.city || targetAddress.city,
                            state: prop.state_abbreviation || prop.state || targetAddress.state,
                            zipCode: prop.zip_code || prop.zipCode || targetAddress.zip,
                            price: price,
                            squareFootage: prop.square_footage || prop.squareFootage || 0,
                            bedrooms: prop.bedrooms || 0,
                            bathrooms: prop.bathrooms || 0,
                            yearBuilt: prop.year_built || prop.yearBuilt || 0,
                            distance: prop.distance || 0,
                            status: listingStatus,
                            soldDate: prop.eventDetails.event_date || '',
                            latitude: prop.latitude || 0,
                            longitude: prop.longitude || 0,
                            similarityScore: prop.similarityScore || 0,
                            isOutlier: prop.isOutlier || false
                        };
                    });
                } else {
                    // Don't generate sample data, just leave as empty array
                    propertyData.neighborhoodProperties = [];
                }

                // Map the allProperties from the API response
                if (apiData.allProperties && Array.isArray(apiData.allProperties) && apiData.allProperties.length > 0) {
                    // The API returned all properties within radius - map them
                    propertyData.allProperties = apiData.allProperties.map((prop: ApiProperty) => {
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
                        } else if (prop.status) {
                            listingStatus = prop.status;
                        }
                        
                        // Map PRICE_CHANGE to RENTAL for display purposes
                        if (listingStatus === 'PRICE_CHANGE') {
                            listingStatus = 'RENTAL';
                        }
                        
                        // Format and return the property with both sale and rental event data
                        return {
                            id: prop.id || prop.parcl_property_id || Math.random(),
                            address: prop.address || 'Unknown Address',
                            city: prop.city || targetAddress.city,
                            state: prop.state_abbreviation || prop.state || targetAddress.state,
                            zipCode: prop.zip_code || prop.zipCode || targetAddress.zip,
                            price: price,
                            squareFootage: prop.square_footage || prop.squareFootage || 0,
                            bedrooms: prop.bedrooms || 0,
                            bathrooms: prop.bathrooms || 0,
                            yearBuilt: prop.year_built || prop.yearBuilt || 0,
                            distance: prop.distance || 0,
                            status: listingStatus,
                            soldDate: (prop.eventDetails && prop.eventDetails.event_date) || prop.soldDate || '',
                            latitude: prop.latitude || 0,
                            longitude: prop.longitude || 0,
                            similarityScore: prop.similarityScore || 0,
                            isOutlier: prop.isOutlier || false,
                            // Add new fields for both sale and rental events
                            lastSalePrice: prop.lastSalePrice || null,
                            lastSaleDate: prop.lastSaleDate || null,
                            lastRentalPrice: prop.lastRentalPrice || null,
                            lastRentalDate: prop.lastRentalDate || null,
                            rentalStatus: prop.rentalStatus || null
                        };
                    });
                } else {
                    propertyData.allProperties = [];
                }
                
                // Store the complete data in Redux
                dispatch(addProperty(propertyData));

                // Check if the property is a single-family home
                const targetProperty = propertyData.addressData?.items?.[0];
                const propType = targetProperty?.property_type || '';
                setPropertyType(propType);
                
                // Consider single-family homes and OTHER supported property types as valid
                const isSingleFamily = 
                    propType.toLowerCase().includes('single') || 
                    propType.toUpperCase() === 'OTHER';
                
                setIsSingleFamilyHome(isSingleFamily);
                

                
                // Important: Don't trigger any step changes here!
                // Let the user control navigation
            } else {
                
                // Create a minimal property structure for steps to continue working
                const fallbackProperty = {
                    address: {
                        street1: targetAddress.street1 || '',
                        street2: targetAddress.street2 || '',
                        city: targetAddress.city || '',
                        state: targetAddress.state || '',
                        zip: targetAddress.zip || '',
                        formattedAddress: targetAddress.formattedAddress || '',
                        lat: targetAddress.lat || 0,
                        lng: targetAddress.lng || 0,
                    },
                    addressData: { items: [] },
                    neighborhoodProperties: [],
                    allProperties: [],
                    radiusUsed: 0.5,
                    monthsUsed: 3,
                    usedFallbackCriteria: false,
                    errorStatus: response.status,
                    errorMessage: `API error: ${response.status} ${response.statusText}`
                };
                
                // Store the fallback data in Redux so other components can detect and handle the error
                dispatch(addProperty(fallbackProperty));
                dispatch(setError(`Failed to fetch property data: ${response.status} ${response.statusText}`));
            }
        } catch (error: any) {
            
            // Create an error fallback property
            const errorProperty = {
                address: {
                    street1: targetAddress.street1 || '',
                    street2: targetAddress.street2 || '',
                    city: targetAddress.city || '',
                    state: targetAddress.state || '',
                    zip: targetAddress.zip || '',
                    formattedAddress: targetAddress.formattedAddress || '',
                    lat: targetAddress.lat || 0,
                    lng: targetAddress.lng || 0,
                },
                addressData: { items: [] },
                neighborhoodProperties: [],
                allProperties: [],
                radiusUsed: 0.5,
                monthsUsed: 3,
                usedFallbackCriteria: false,
                errorStatus: 'exception',
                errorMessage: `Exception: ${error}`
            };
            
            // Store the error property in Redux
            dispatch(addProperty(errorProperty));
            dispatch(setError(`Error fetching property data: ${error}`));
        } finally {
            setIsPropertyDataLoading(false);
            setPropertyDataLoaded(true);
        }
    };

    // Reset loading state when property data finishes loading
    useEffect(() => {
        // If property data loaded but minimum loading time isn't complete
        if (!isPropertyDataLoading && loadingStartTime !== null) {
            const elapsedTime = Date.now() - loadingStartTime;
            
            // If we haven't reached the minimum time yet
            if (elapsedTime < 3000 && showMinimumLoading) {
                
                // Keep loading screen for the remaining time
                const remainingTime = 3000 - elapsedTime;
                setTimeout(() => {
                    // Only hide if we're not in property update mode
                    if (!isPropertyUpdateLoading) {
                        setShowMinimumLoading(false);
                        setLoadingStartTime(null);
                    }
                }, remainingTime);
            } else if (elapsedTime >= 3000 && showMinimumLoading) {
                // We've exceeded the minimum time, can hide loading
                // Only hide if we're not in property update mode
                if (!isPropertyUpdateLoading) {
                    setShowMinimumLoading(false);
                    setLoadingStartTime(null);
                }
            }
        }
    }, [isPropertyDataLoading, loadingStartTime, showMinimumLoading, isPropertyUpdateLoading]);
    
    // Reset loading state when step changes (especially back to previous steps)
    useEffect(() => {
        // If we navigate away from step 3, reset loading states
        if (step !== 3) {
            if (showMinimumLoading) {
                setShowMinimumLoading(false);
                setLoadingStartTime(null);
            }
            if (isPropertyUpdateLoading) {
                setIsPropertyUpdateLoading(false);
                setPropertyUpdateStartTime(null);
            }
        }
    }, [step, showMinimumLoading, isPropertyUpdateLoading]);
    
    // Simple approach: Hide loading overlay after a fixed time when property update is in progress
    useEffect(() => {
        if (isPropertyUpdateLoading && propertyUpdateStartTime) {
            const elapsedTime = Date.now() - propertyUpdateStartTime;
            const minLoadingTime = 8000; // 8 seconds minimum loading time for property updates
            
            if (elapsedTime >= minLoadingTime) {
                setIsPropertyUpdateLoading(false);
                setPropertyUpdateStartTime(null);
                setShowMinimumLoading(false);
            } else {
                const remainingTime = minLoadingTime - elapsedTime;
                setTimeout(() => {
                    setIsPropertyUpdateLoading(false);
                    setPropertyUpdateStartTime(null);
                    setShowMinimumLoading(false);
                }, remainingTime);
            }
        }
    }, [isPropertyUpdateLoading, propertyUpdateStartTime]);

    // Step 1 -> Step 2: After selecting the address
    const handleSelectCondition = async (addressToUse?: AddressComponents) => {
        const targetAddress = addressToUse || selectedAddress;
        if (targetAddress) {
            // Save the selected address and condition to Redux
            dispatch(setAddressData({
                street1: targetAddress.street1 || '',
                street2: targetAddress.street2 || '',
                city: targetAddress.city || '',
                state: targetAddress.state || '',
                zip: targetAddress.zip || '',
                formattedAddress: targetAddress.formattedAddress || '',
                lat: targetAddress.lat || 0,
                lng: targetAddress.lng || 0,
            }));

            // Add to search history if user is logged in
            if (user.isLoggedIn && user.user_id) {
                SearchHistoryService.addSearch(user.user_id, targetAddress.formattedAddress);
            }

            updateStep(2);

            // Fetch property data when user clicks "Get My Offer"
            await fetchPropertyData(targetAddress);

            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }
    };

    // Step 2 -> Step 3: User clicks "Get My Offer"
    const handleGetMyOffer = async () => {
        if (!selectedCondition) {
            return; // Don't proceed if no condition is selected
        }
        
        // Show loading state
        setIsButtonLoading(true);
        
        // Start minimum loading timer (3 seconds)
        setShowMinimumLoading(true);
        setLoadingStartTime(Date.now());
        
        try {
            // We'll handle saving condition data in EstimatedOfferStep instead
            // This ensures that underwrite values are only loaded when condition is actually used
            
            // Force the navigation to step 3
            setIsTransitioning(true);
            
            // First update the URL parameter
            setSearchParams({ step: '3' }, { replace: true });
            
            // Then update the step state
            setStep(3);
            
            // If we have property data, pre-fetch rental values for the underwrite sliders
            if (propertyState.properties.length > 0) {
                const property = propertyState.properties[0];
                const rentalProperties = property.neighborhoodProperties?.filter(p => 
                    p.status === 'LISTED_RENT'// || 
                    //p.status === 'LISTING_REMOVED'
                );
                
                // Get address data for market calculations
                const addressData = property.addressData?.items?.[0] || null;
                

                
                // This won't block the UI as the EstimatedOfferStep will handle loading state
            }
            
            // Calculate remaining loading time to ensure at least 3 seconds of loading
            const remainingLoadTime = Math.max(0, 3000 - (Date.now() - (loadingStartTime || Date.now())));
            
            // Give some time for the step change to take effect, ensuring at least 3 seconds of loading
            setTimeout(() => {
                window.scrollTo(0, 0);
        
                // Reset transition flag
                setIsTransitioning(false);
                
                // Keep showing loading for 3 seconds minimum
                const elapsedTime = Date.now() - (loadingStartTime || Date.now());
                if (elapsedTime >= 3000) {
                    setShowMinimumLoading(false);
                } else {
                    const remainingTime = 3000 - elapsedTime;
                    setTimeout(() => {
                        setShowMinimumLoading(false);
                    }, remainingTime);
                }
            }, Math.max(100, remainingLoadTime));
        } catch (err) {
            setIsTransitioning(false); // Make sure to reset the flag in case of error
            setShowMinimumLoading(false);
        } finally {
            setIsButtonLoading(false);
        }
    };

    // Handle going back to Step 1 from any step
    const handleGetAnotherEstimate = () => {
        // Clear address, condition, and property data
        setSelectedAddress(null);
        setAddressInput('');
        setSelectedCondition('');
        dispatch(clearPropertyData());
        dispatch(clearDetailedRehabValues()); // Clear detailed rehab calculations
        setPropertyDataLoaded(false);
        
        // Navigate to step 1
        updateStep(1);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    // Step 3 -> Step 4: Continue to Executive Services
    const handleContinueToNeighborhoodAnalysis = () => {
        updateStep(4);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    // Step 4 -> Step 5: Continue to Verify
    const handleContinueToVerify = () => {
        updateStep(5);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    // Handle final submission
    const handleSubmit = () => {
        alert("Thank you for submitting your property! Our team will contact you soon.");
        navigate("/dashboard");
    };

    // Open the callback modal
    const handleOpenCallbackModal = () => {
        setIsCallbackModalOpen(true);
    };

    // Navigation handlers for moving back between steps
    const handleBackToStep1 = () => {
        // Clear condition selection when going back to step 1
        setSelectedCondition('');
        dispatch(clearDetailedRehabValues()); // Clear detailed rehab calculations when clearing condition
        updateStep(1);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    const handleBackToStep2 = () => {
        updateStep(2);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    const handleBackToStep3 = () => {
        updateStep(3);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    const handleBackToStep4 = () => {
        updateStep(4);
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    // Create a function to handle address selection that also resets relevant state
    const handleAddressSelect = (address: AddressComponents) => {
        setSelectedAddress(address);
        setAddressInput(address.formattedAddress);
        
        // Store address data in Redux
        dispatch(setAddressData({
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            formattedAddress: address.formattedAddress,
            lat: address.lat,
            lng: address.lng
        }));

        // Add to search history if user is logged in
        if (user.isLoggedIn && user.user_id) {
            SearchHistoryService.addSearch(user.user_id, address.formattedAddress);
            loadSearchHistory();
        }
    };

    // Parse formatted address into individual components
    const parseFormattedAddress = (formattedAddress: string): AddressComponents => {
        try {
            const parts = formattedAddress.split(', ');
            
            // Extract street address (first part)
            const street = parts[0] || '';
            
            // Extract city (second part)
            const city = parts[1] || '';
            
            // Extract state and zip (third part)
            const stateZip = parts[2] || '';
            const stateZipParts = stateZip.split(' ');
            const state = stateZipParts[0] || '';
            const zip = stateZipParts[1] || '';
            

            
            return {
                street1: street,
                street2: '',
                city: city,
                state: state,
                zip: zip,
                formattedAddress: formattedAddress,
                lat: 0,
                lng: 0
            };
        } catch (error) {
            // Return empty components if parsing fails
            return {
                street1: '',
                street2: '',
                city: '',
                state: '',
                zip: '',
                formattedAddress: formattedAddress,
                lat: 0,
                lng: 0
            };
        }
    };

    // Handle showing manual address form
    const handleShowManualAddress = (address: AddressComponents) => {
        // Parse the formatted address to get individual components
        const parsedAddress = parseFormattedAddress(address.formattedAddress);
        
        // Merge with original address to keep lat/lng
        const enhancedAddress = {
            ...parsedAddress,
            lat: address.lat,
            lng: address.lng
        };
        
        setOriginalAddress(enhancedAddress);
        setShowManualAddress(true);
    };

    // State validation helper
    const isValidState = (state: string | boolean): boolean => {
        // Allow all states
        return Boolean(state) && String(state).trim().length > 0;
    };

    // Handle address validation with state checking
    const handleFindYourBuyer = async () => {
        if (!selectedAddress) return;

        // First check if the state is Tennessee
        const addressState = selectedAddress.state;
        if (!isValidState(addressState)) {
            setOutOfStateName(addressState);
            setIsOutOfStateModalOpen(true);
            return;
        }
        
        // Set loading state
        setIsAddressValidating(true);

        try {
            const validationResult = await validateAddress(selectedAddress);
            
            if (validationResult.isValid) {
                // Address is valid, proceed to next step
                handleSelectCondition();
            } else {
                // Address not found, show manual address form
                
                // Parse the formatted address to get individual components
                const parsedAddress = parseFormattedAddress(selectedAddress.formattedAddress);
                
                // Merge with original address to keep lat/lng
                const enhancedAddress = {
                    ...parsedAddress,
                    lat: selectedAddress.lat,
                    lng: selectedAddress.lng
                };
                setOriginalAddress(enhancedAddress);
                setShowManualAddress(true);
            }
        } catch (error) {
            // Show manual address form on error
            
            // Parse the formatted address to get individual components
            const parsedAddress = parseFormattedAddress(selectedAddress.formattedAddress);
            
            // Merge with original address to keep lat/lng
            const enhancedAddress = {
                ...parsedAddress,
                lat: selectedAddress.lat,
                lng: selectedAddress.lng
            };
            
            setOriginalAddress(enhancedAddress);
            setShowManualAddress(true);
        } finally {
            // Clear loading state
            setIsAddressValidating(false);
        }
    };

    // Handle manual address submission
    const handleManualAddressSubmit = async (address: AddressComponents) => {
        // Set loading state
        setIsAddressValidating(true);
        
        // Update state immediately
        setSelectedAddress(address);
        setAddressInput(address.formattedAddress);
        setShowManualAddress(false);
        
        // Store address data in Redux
        dispatch(setAddressData({
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            formattedAddress: address.formattedAddress,
            lat: address.lat,
            lng: address.lng
        }));

        // Add to search history if user is logged in
        if (user.isLoggedIn && user.user_id) {
            SearchHistoryService.addSearch(user.user_id, address.formattedAddress);
            loadSearchHistory();
        }

        // Validate the address directly instead of relying on state
        try {
            const validationResult = await validateAddress(address);
            
            if (validationResult.isValid) {
                // Address is valid, proceed to condition page
                handleSelectCondition(address);
            } else {
                // Address is invalid, show manual form again
                setOriginalAddress(address);
                setShowManualAddress(true);
            }
        } catch (error) {
            // On error, show manual form again
            setOriginalAddress(address);
            setShowManualAddress(true);
        } finally {
            // Clear loading state
            setIsAddressValidating(false);
        }
    };

    // Handle back to address input
    const handleBackToAddress = () => {
        setShowManualAddress(false);
        setOriginalAddress(null);
    };

    // Search History handlers
    const handleHistoryToggle = () => {
        setIsHistoryVisible(!isHistoryVisible);
    };

    const handleHistoryAddressSelect = async (address: AddressComponents) => {
        // If the address has 0 coordinates (from search history), try to geocode it
        if (address.lat === 0 && address.lng === 0) {
            try {
                // Use Google Places API to geocode the address
                const geocodedAddress = await geocodeAddress(address.formattedAddress);
                if (geocodedAddress) {
                    // Use the geocoded address with proper coordinates
                    address = geocodedAddress;
                }
            } catch (error) {
                // Continue with the original address if geocoding fails
            }
        }

        // Update the address input
        setAddressInput(address.formattedAddress);
        
        // Set the selected address
        setSelectedAddress(address);
        
        // Store address data in Redux
        dispatch(setAddressData({
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            formattedAddress: address.formattedAddress,
            lat: address.lat,
            lng: address.lng
        }));

        // Add to search history if user is logged in
        if (user.isLoggedIn && user.user_id) {
            SearchHistoryService.addSearch(user.user_id, address.formattedAddress);
        }

        // Don't automatically proceed to next step - let user click "Find Your Buyer" button
    };

    // Banner and modal handlers
    const handleDismissBanner = () => {
        setIsBannerVisible(false);
        setBannerDismissed(true);
        // Use session storage so it only persists for this session, not across users/logins
        try {
            sessionStorage.setItem('tennessee-banner-dismissed', 'true');
        } catch (e) {
            // Silently handle sessionStorage error
        }
    };

    const handleBannerNotifyClick = () => {
        setIsStateNotificationModalOpen(true);
    };

    const handleOutOfStateNotifyClick = () => {
        setIsOutOfStateModalOpen(false);
        setIsStateNotificationModalOpen(true);
    };

    // Check if banner should be shown (not dismissed in this session)
    useEffect(() => {
        try {
            const dismissed = sessionStorage.getItem('tennessee-banner-dismissed');
            if (dismissed === 'true') {
                setIsBannerVisible(false);
                setBannerDismissed(true);
            }
        } catch (e) {
            // Silently handle sessionStorage error
        }
    }, []);

    // Helper function to geocode an address using Google Places API
    const geocodeAddress = async (fullAddress: string): Promise<AddressComponents | null> => {
        return new Promise((resolve) => {
            if (!window.google || !window.google.maps) {
                resolve(null);
                return;
            }

            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
                if (status === 'OK' && results && results[0]) {
                    const result = results[0];
                    const addressComponents = result.address_components;
                    
                    let street1 = '';
                    let city = '';
                    let state = '';
                    let zip = '';

                    // Parse address components
                    for (const component of addressComponents) {
                        const types = component.types;
                        if (types.includes('street_number') || types.includes('route')) {
                            street1 += component.long_name + ' ';
                        } else if (types.includes('locality')) {
                            city = component.long_name;
                        } else if (types.includes('administrative_area_level_1')) {
                            state = component.short_name;
                        } else if (types.includes('postal_code')) {
                            zip = component.long_name;
                        }
                    }

                    street1 = street1.trim();

                    const geocodedAddress: AddressComponents = {
                        street1,
                        street2: '',
                        city,
                        state,
                        zip,
                        formattedAddress: fullAddress,
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                    };

                    resolve(geocodedAddress);
                } else {
                    resolve(null);
                }
            });
        });
    };

    const loadSearchHistory = async () => {
        if (user.isLoggedIn && user.user_id) {
            try {
                const history = await SearchHistoryService.getSearchHistory(user.user_id);
                setSearchHistory(history);
            } catch (error) {
                setSearchHistory([]);
            }
        }
    };

    // Load search history on component mount
    useEffect(() => {
        loadSearchHistory();
    }, [user.user_id]);

    // Create a function to handle condition selection that clears detailed rehab when condition changes
    const handleConditionSelect = (condition: string) => {
        // If this is a different condition, clear detailed rehab values
        if (selectedCondition && selectedCondition !== condition) {
            dispatch(clearDetailedRehabValues());
        }
        setSelectedCondition(condition);
    };

    // Function to focus the address input
    const handleFocusAddressInput = () => {
        if (addressInputStepRef.current) {
            addressInputStepRef.current.focusInput();
        }
    };
    
    // Handle rehab values change from condition step
    const handleRehabValuesChange = (values: Record<string, number>) => {
        setConditionRehabValues(values);
    };

    // Pass this handler to EstimatedOfferStep (and thus to PropertyHeaderCard)
    const [previousPropertyDetails, setPreviousPropertyDetails] = useState<{beds: number, baths: number, sqft: number, year: number} | null>(null);
    const [expectedPropertyDetails, setExpectedPropertyDetails] = useState<{beds: number, baths: number, sqft: number, year: number} | null>(null);

    const handlePropertyUpdate = (isComplete = false, expectedDetails?: {beds: number, baths: number, sqft: number, year: number}) => {
        if (!isComplete) {
            // Start loading overlay when update starts (button click)
            setIsPropertyUpdateLoading(true);
            
            // Store the expected property details
            if (expectedDetails) {
                setExpectedPropertyDetails(expectedDetails);
            }
            
            // Store the current property details as "previous" before the update
            if (propertyState.properties.length > 0) {
                const currentProperty = propertyState.properties[0];
                const currentDetails = {
                    beds: currentProperty.addressData?.items?.[0]?.bedrooms || 0,
                    baths: currentProperty.addressData?.items?.[0]?.bathrooms || 0,
                    sqft: currentProperty.addressData?.items?.[0]?.square_footage || 0,
                    year: currentProperty.addressData?.items?.[0]?.year_built || 0
                };
                setPreviousPropertyDetails(currentDetails);
            }
        } else {
            // Update is complete, hide the loading overlay
            setIsPropertyUpdateLoading(false);
            setPreviousPropertyDetails(null);
            setExpectedPropertyDetails(null);
        }
    };

    // Note: Loading overlay is now managed directly by handlePropertyUpdate
    // No complex useEffect needed - loading shows when update starts, hides when complete

    // Render each step component
    const renderStep1 = () => (
        <AddressInputStep
            ref={addressInputStepRef}
            addressInput={addressInput}
            selectedAddress={selectedAddress}
            onAddressChange={setAddressInput}
            onAddressSelect={handleAddressSelect}
            onNext={handleSelectCondition}
            onHistoryToggle={handleHistoryToggle}
            isHistoryVisible={isHistoryVisible}
            onShowManualAddress={handleShowManualAddress}
            onFindYourBuyer={handleFindYourBuyer}
            isAddressValidating={isAddressValidating}
        />
    );

    // Get property data for rehab calculator (using existing propertyState)
    const property = propertyState.properties[0] || null;
    const addressData = property?.addressData?.items?.[0] || null;

    const renderStep2 = () => {
        // Only show loading when the button is clicked, not for background property data loading
        const isLoading = isButtonLoading;
        const loadingText = isButtonLoading ? "Processing..." : undefined;
        
        return (
            <ConditionStep
                selectedCondition={selectedCondition}
                onConditionSelect={handleConditionSelect}
                onBack={handleBackToStep1}
                onNext={handleGetMyOffer}
                isLoading={isLoading}
                loadingText={loadingText}
                propertyData={{
                    squareFootage: addressData?.square_footage || 2000,
                    address: selectedAddress?.formattedAddress || '',
                    bathrooms: addressData?.bathrooms || 1
                }}
                onRehabValuesChange={handleRehabValuesChange}
            />
        );
    };

    const renderStep3 = () => {
        // Check if we have property data
        const hasPropertyData = propertyState.properties.length > 0;
        const propertyData = propertyState.properties[0] || null;
        
        // Check for API errors
        const hasApiError = propertyData?.errorStatus !== undefined;
        
        if (!hasPropertyData || hasApiError) {
            // Determine error type and messaging based on status code
            const getErrorInfo = () => {
                if (!hasApiError) {
                    return {
                        title: 'No Property Data Available',
                        message: 'We couldn\'t retrieve data for this property.',
                        description: 'There is an issue with the property data service. Please try again later or select a different property.',
                        status: 'warning' as const
                    };
                }
                
                const statusCode = propertyData.errorStatus;
                
                switch (statusCode) {
                    case 422:
                        return {
                            title: 'Invalid Address Information',
                            message: 'The address you entered has validation issues and cannot be processed.',
                            description: 'Please check your address details and try again with a different address.',
                            status: 'error' as const
                        };
                    case 502:
                        return {
                            title: 'API Error: 502',
                            message: 'API error: 502',
                            description: 'There is an issue with the property data service. Please try again later or select a different property.',
                            status: 'warning' as const
                        };
                    default:
                        return {
                            title: `API Error: ${statusCode}`,
                            message: propertyData.errorMessage || 'Failed to fetch property data from API',
                            description: 'There is an issue with the property data service. Please try again later or select a different property.',
                            status: 'warning' as const
                        };
                }
            };
            
            const errorInfo = getErrorInfo();
                
            return (
                <Box 
                    p={6} 
                    borderRadius="md" 
                    bg={bgColor}
                    borderWidth="1px" 
                    borderColor={borderColor}
                    boxShadow="md"
                    width="100%"
                >
                    <VStack spacing={6} align="stretch">
                        <Alert
                            status={errorInfo.status}
                            variant="solid"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            textAlign="center"
                            borderRadius="md"
                            py={6}
                        >
                            <AlertIcon boxSize="40px" mr={0} />
                            <AlertTitle mt={4} mb={2} fontSize="xl">
                                {errorInfo.title}
                            </AlertTitle>
                            <AlertDescription maxWidth="md">
                                {errorInfo.message}
                            </AlertDescription>
                        </Alert>
                        
                        <Box>
                            <Text mb={4} fontSize="md" color={textPrimaryColor}>
                                {errorInfo.description}
                            </Text>
                            <Button
                                leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                                colorScheme="brand"
                                onClick={handleBackToStep2}
                                size="lg"
                                width="full"
                            >
                                Go Back
                            </Button>
                        </Box>
                    </VStack>
                </Box>
            );
        }
        
        if (isSingleFamilyHome) {
            return (
                <EstimatedOfferStep
                    selectedAddress={selectedAddress}
                    googleApiKey={googleApiKey}
                    addressState={{
                        ...addressState,
                        condition: selectedCondition
                    }}
                    handleOpenCallbackModal={handleOpenCallbackModal}
                    handleBackToStep2={handleBackToStep2}
                    onNext={handleContinueToNeighborhoodAnalysis}
                    onPropertyUpdate={handlePropertyUpdate}
                    conditionRehabValues={conditionRehabValues}
                />
            );
        } else {
            return (
                <Box 
                    p={6} 
                    borderRadius="md" 
                    bg={bgColor}
                    borderWidth="1px" 
                    borderColor={borderColor}
                    boxShadow="md"
                    width="100%"
                >
                    <VStack spacing={6} align="stretch">
                        <Alert
                            status="warning"
                            variant="solid"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            textAlign="center"
                            borderRadius="md"
                            py={6}
                        >
                            <AlertIcon boxSize="40px" mr={0} />
                            <AlertTitle mt={4} mb={2} fontSize="xl">
                                Property Type Not Supported
                            </AlertTitle>
                            <AlertDescription maxWidth="md">
                                We currently only support single-family homes for our estimates.
                                {propertyType && (
                                    <Text mt={2} fontWeight="bold">
                                        The selected property is a {propertyType.toLowerCase()}.
                                    </Text>
                                )}
                            </AlertDescription>
                        </Alert>
                        
                        <Box>
                            <Text mb={4} fontSize="md" color={textPrimaryColor}>
                                Please go back and select a different address for a single-family home.
                            </Text>
                            <Button
                                leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                                colorScheme="brand"
                                onClick={handleBackToStep2}
                                size="lg"
                                width="full"
                            >
                                Go Back
                            </Button>
                        </Box>
                    </VStack>
                </Box>
            );
        }
    };

    const renderStep4 = () => (
        <ExecutiveServicesStep
            selectedAddress={selectedAddress}
            googleApiKey={googleApiKey}
            addressState={{
                ...addressState,
                condition: selectedCondition
            }}
            handleBackToEstimate={handleBackToStep3}
            onNext={handleGetAnotherEstimate}
        />
    );

    // Update the steps array to match the screenshot
    const horizontalSteps = [
        { title: 'Address', description: 'Enter your address' },
        { title: 'Condition', description: 'Describe your home' },
        { title: 'Estimate/UW', description: 'View valuation & details' },
        { title: 'Get Offers', description: 'Finalize your offer' }
    ];

    // Define colors outside of conditional rendering
    const bgColor = 'background.primary';
    const bgSecondaryColor = 'background.secondary';
    const borderColor = 'border.primary';
    const textPrimaryColor = 'text.primary';
    const textSecondaryColor = 'text.secondary';
    const boxShadow = "lg";
    const borderRadius = "lg";

    // Enhanced loading component for Step 3 transition
    const EnhancedPropertyLoading = () => (
        <Box
            p={6}
            borderRadius="md"
            bg={bgColor}
            borderWidth="1px"
            borderColor={borderColor}
            boxShadow="md"
            width="100%"
            textAlign="center"
            minHeight="400px"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
        >
            <VStack spacing={8}>
                <Heading size="lg" color={textPrimaryColor}>
                    Generating Your Property Estimate
                </Heading>
                
                <Spinner 
                    size="xl" 
                    thickness="4px"
                    speed="0.65s"
                    color="brand.500"
                    mb={4}
                />
                
                <Box width="100%" maxWidth="500px">
                    <Text mb={2} fontWeight="bold" textAlign="left" color={textSecondaryColor}>
                        Analysis Progress
                    </Text>
                    <Progress
                        size="md"
                        isIndeterminate
                        colorScheme="brand"
                        borderRadius="md"
                        height="10px"
                        mb={6}
                    />
                </Box>
                
                <VStack spacing={4} width="100%" maxWidth="500px" align="start">
                    <HStack>
                        <Icon as={FaCheck as React.ElementType} color="green.500" />
                        <Text color={textSecondaryColor}>Analyzing property condition</Text>
                    </HStack>
                    <HStack>
                        <Icon as={FaCheck as React.ElementType} color="green.500" />
                        <Text color={textSecondaryColor}>Finding comparable properties</Text>
                    </HStack>
                    <HStack>
                        <Spinner size="sm" color="brand.500" />
                        <Text color={textSecondaryColor}>Calculating estimated value</Text>
                    </HStack>
                </VStack>
                
                <Text color={textSecondaryColor} fontStyle="italic" mt={4}>
                    This typically takes a few seconds. Please wait...
                </Text>
            </VStack>
        </Box>
    );

    // Property Update Loading Component - Using the new LoadingModal
    const PropertyUpdateLoading = () => (
        <LoadingModal visible={true} />
    );

    return (
        <>
            <APIProvider apiKey={googleApiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
                {/* State Notification Modal */}
                <StateNotificationModal
                    isOpen={isStateNotificationModalOpen}
                    onClose={() => setIsStateNotificationModalOpen(false)}
                    prefilledState={outOfStateName}
                    userEmail={user.email || ''}
                    isAuthenticated={user.isLoggedIn}
                />

                {/* Out of State Modal */}
                <OutOfStateModal
                    isOpen={isOutOfStateModalOpen}
                    onClose={() => setIsOutOfStateModalOpen(false)}
                    onGetNotified={handleOutOfStateNotifyClick}
                    stateName={outOfStateName}
                />

                {/* Horizontal Progress Bar - visible on all screen sizes */}
                <Box 
                    w="100%" 
                    bg={bgColor}
                    borderBottomWidth="1px"
                    borderColor={borderColor}
                    position="fixed"
                    top="80px"
                    zIndex="10"
                    px={{ base: 2, md: 4 }}
                    py={{ base: 2, md: 3 }}
                    shadow="sm"
                >
                    <Box maxW="container.lg" mx="auto">
                        <Stepper index={step - 1} colorScheme="brand" size={{ base: "sm", md: "md" }}>
                            {horizontalSteps.map((item, index) => {
                                // Determine if this step is accessible based on data availability
                                const stepNumber = index + 1;
                                const isAccessible = 
                                    (stepNumber === 1) ||
                                    (stepNumber === 2 && selectedAddress !== null) ||
                                    (stepNumber === 3 && selectedAddress !== null && 
                                        selectedCondition !== '') ||
                                    (stepNumber === 4 && selectedAddress !== null && 
                                        selectedCondition !== '' && 
                                        step >= 4);
                                
                                // Determine if this step is completed
                                const isCompleted = stepNumber < step;
                                
                                // Disable click handling during transitions
                                const handleStepClick = () => {
                                    if (isAccessible && !isTransitioning) {
                                        updateStep(stepNumber);
                                        setTimeout(() => {
                                            window.scrollTo(0, 0);
                                        }, 100);
                                    }
                                };
                                
                                return (
                                    <Step key={index} cursor={isAccessible && !isTransitioning ? "pointer" : "not-allowed"} onClick={handleStepClick}>
                                        <StepIndicator>
                                            <StepStatus
                                                complete={<CheckIcon />}
                                                incomplete={<StepNumber />}
                                                active={<StepNumber />}
                                            />
                                        </StepIndicator>
                                        <Box flexShrink={0} display={{ base: 'none', sm: 'block' }}>
                                            <StepTitle 
                                                fontSize={{ base: "xs", md: "sm" }} 
                                                fontWeight={step === stepNumber + 1 ? "bold" : "medium"}
                                                color={isAccessible ? textPrimaryColor : "gray.400"}
                                            >
                                                {item.title}
                                            </StepTitle>
                                        </Box>
                                        <StepSeparator />
                                    </Step>
                                );
                            })}
                        </Stepper>
                    </Box>
                </Box>

                <Flex minHeight="calc(100vh - 155px)">
                    {/* Main content area - scrollable */}
                    <Box 
                        flex="1" 
                        bgSize="cover"
                        bgPos="center"
                        p={{ base: 2, md: 8 }}
                        pt={{ base: "100px", md: "120px" }}
                        minH="calc(100vh - 155px)"
                        overflowX="hidden"
                        width="100%"
                    >
                        {/* Tennessee Banner - positioned between stepper and content */}
                        {step === 1 && isBannerVisible && !bannerDismissed && (
                            <Box 
                                w="100%" 
                                maxW={{ base: "100%", md: "700px" }}
                                mx="auto" 
                                mt={-10}
                                mb={4}
                            >
                                <TennesseeBanner
                                    onNotifyClick={handleBannerNotifyClick}
                                    onDismiss={handleDismissBanner}
                                    isVisible={true}
                                />
                            </Box>
                        )}

                        {/* Step 1 */}
                        <Box 
                            ref={step1Ref} 
                            w="100%" 
                            maxW={{ base: "100%", md: "700px" }}
                            mx="auto" 
                            p={{ base: 3, md: 4 }}
                            borderRadius={borderRadius}
                            bg={bgColor}
                            boxShadow={boxShadow}
                            mt={0}
                            mb={4}
                            display={step === 1 ? 'block' : 'none'}
                        >
                            {renderStep1()}
                        </Box>

                        {/* Manual Address Step */}
                        {step === 1 && showManualAddress && (
                            <Box 
                                w="100%" 
                                maxW={{ base: "100%", md: "700px" }}
                                mx="auto" 
                                p={{ base: 3, md: 6 }}
                                borderRadius={borderRadius}
                                bg={bgColor}
                                boxShadow={boxShadow}
                                mt={0}
                                mb={4}
                            >
                                <ManualAddressStep
                                    originalAddress={originalAddress}
                                    onAddressSubmit={handleManualAddressSubmit}
                                    onBack={handleBackToAddress}
                                />
                            </Box>
                        )}

                        {/* Search History Box - Step 1 */}
                        {step === 1 && user.isLoggedIn && user.user_id && (
                            <Box 
                                w="100%" 
                                maxW={{ base: "100%", md: "700px" }}
                                mx="auto" 
                                p={{ base: 3, md: 6 }}
                                borderRadius={borderRadius}
                                bg={bgColor}
                                boxShadow={boxShadow}
                                mt={0}
                                mb={4}
                            >
                                <SearchHistory
                                    userId={user.user_id}
                                    isVisible={isHistoryVisible}
                                    onToggle={handleHistoryToggle}
                                    onAddressSelect={handleHistoryAddressSelect}
                                    onNext={handleSelectCondition}
                                    onFocusInput={handleFocusAddressInput}
                                />
                            </Box>
                        )}
                        
                        {/* Step 2 */}
                        <Box 
                            ref={step2Ref} 
                            w="100%" 
                            maxW={{ base: "100%", md: "1200px" }}
                            mx="auto" 
                            p={{ base: 3, md: 6 }}
                            borderRadius={borderRadius}
                            bg={bgColor}
                            boxShadow={boxShadow}
                            mt={0}
                            mb={4}
                            display={step === 2 ? 'block' : 'none'}
                        >
                            {renderStep2()}
                        </Box>
                        
                        {/* Step 3 */}
                        <Box 
                            ref={step3Ref} 
                            w="100%" 
                            maxW={{ base: "100%", md: "1000px" }}
                            mx="auto" 
                            p={{ base: 3, md: 6 }}
                            borderRadius={borderRadius}
                            bg={bgColor}
                            boxShadow={boxShadow}
                            mt={0}
                            mb={4}
                            display={step === 3 ? 'block' : 'none'}
                        >
                            {isPropertyUpdateLoading ? (
                                <PropertyUpdateLoading />
                            ) : (showMinimumLoading || isPropertyDataLoading) ? (
                                <EnhancedPropertyLoading />
                            ) : (
                                renderStep3()
                            )}
                        </Box>

                        {/* Step 4 */}
                        <Box 
                            ref={step4Ref} 
                            w="100%" 
                            maxW={{ base: "100%", md: "900px" }}
                            mx="auto" 
                            p={{ base: 3, md: 6 }}
                            borderRadius={borderRadius}
                            bg={bgColor}
                            boxShadow={boxShadow}
                            mt={0}
                            mb={4}
                            display={step === 4 ? 'block' : 'none'}
                        >
                            {renderStep4()}
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
