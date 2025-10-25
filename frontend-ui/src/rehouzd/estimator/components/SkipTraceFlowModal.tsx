import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  Flex,
  Badge,
  useColorModeValue,
  Divider,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Stack,
  Link as ChakraLink,
} from '@chakra-ui/react';
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEye,
  FaLock,
  FaCoins,
  FaCheck,
  FaExclamationTriangle,
  FaCreditCard,
  FaArrowLeft,
  FaArrowRight,
  FaShieldAlt,
} from 'react-icons/fa';
import { Buyer } from '../store/buyerSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addSkipTraceResult, useCredit, setCredits } from '../store/skipTraceSlice';
import { skipTraceService } from '../services/skipTraceService';
import paymentService from '../services/paymentService';
import TermsAndConditionsModal from './TermsAndConditionsModal';

interface SkipTraceFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer;
  skipTraceCredits: { free: number; paid: number };
  onSkipTraceComplete: (results: any) => void;
}

interface CreditBundle {
  credits: number;
  price: number;
  perLookup: number;
  popular?: boolean;
}

enum FlowStep {
  CONFIRMATION = 'confirmation',
  PAYMENT = 'payment',
  PROCESSING_PAYMENT = 'processing_payment',
  PROCESSING = 'processing',
  RESULTS = 'results',
}

const SkipTraceFlowModal = ({
  isOpen,
  onClose,
  buyer,
  skipTraceCredits,
  onSkipTraceComplete,
}: SkipTraceFlowModalProps) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>(FlowStep.CONFIRMATION);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<CreditBundle | null>(null);
  const [skipTraceResults, setSkipTraceResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);

  // Add state for terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.300');

  // Credit bundles
  const creditBundles: CreditBundle[] = [
    // { credits: 10, price: 1.50, perLookup: 0.15 },
    { credits: 25, price: 3.75, perLookup: 0.15 },
    // { credits: 50, price: 7.50, perLookup: 0.15 },
    { credits: 100, price: 15.00, perLookup: 0.15 },
  ];

  // Set default selected bundle to 50 Credits
  React.useEffect(() => {
    if (isOpen) {
      setSelectedBundle(creditBundles[1]); // 100 Credits
    }
  }, [isOpen]);

  const totalCredits = skipTraceCredits.free + skipTraceCredits.paid;
  const hasCredits = totalCredits > 0;

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(FlowStep.CONFIRMATION);
      setError(null);
      setSkipTraceResults(null);
      setIsProcessing(false);
      setCurrentSessionId(null);
    }
  }, [isOpen]);

  // Listen for payment messages from child window
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PAYMENT_SUCCESS' && paymentWindow && currentSessionId) {
        // Payment successful - trigger immediate check
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        // Do immediate payment status check
        checkPaymentStatus(currentSessionId, true);
      } else if (event.data.type === 'PAYMENT_CANCELLED' && paymentWindow) {
        // Payment cancelled - clean up immediately
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.close();
        }
        setPaymentWindow(null);
        setCurrentSessionId(null);
        
        setCurrentStep(FlowStep.PAYMENT);
        setError('Payment was cancelled. You can try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [paymentWindow, pollInterval, currentSessionId]);

  const handleConfirmSkipTrace = () => {
    // Clear any previous errors
    setError(null);
    
    if (hasCredits) {
      setCurrentStep(FlowStep.PROCESSING);
      performSkipTrace();
    } else {
      setCurrentStep(FlowStep.PAYMENT);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!selectedBundle || !user?.user_id) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      const userId = parseInt(user.user_id.toString(), 10);
      
      // Create checkout session
      const checkoutSession = await paymentService.createSkipTraceCheckout(userId, selectedBundle);
      setCheckoutSessionId(checkoutSession.sessionId);
      setCurrentSessionId(checkoutSession.sessionId);
      
      // Open checkout in new window
      const newWindow = window.open(
        checkoutSession.url,
        'stripe-checkout',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (newWindow) {
        setPaymentWindow(newWindow);
        setCurrentStep(FlowStep.PROCESSING_PAYMENT);
        startPaymentPolling(checkoutSession.sessionId, newWindow);
      } else {
        throw new Error('Unable to open payment window. Please allow popups and try again.');
      }
      
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to initiate payment. Please try again.';
      setError(errorMsg);
      setCurrentStep(FlowStep.CONFIRMATION);
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentPolling = (sessionId: string, window: Window) => {
    // Reset all payment-related flags
    setPaymentProcessed(false);
    setIsCheckingPayment(false);
    
    const interval = setInterval(async () => {
      // Check if window is closed
      if (window.closed) {
        clearInterval(interval);
        setPollInterval(null);
        setPaymentWindow(null);
        // Check payment status one final time
        if (!paymentProcessed && !isCheckingPayment) {
          await checkPaymentStatus(sessionId, true);
        }
        return;
      }

      // Poll payment status if not already processed or checking
      if (!paymentProcessed && !isCheckingPayment) {
        await checkPaymentStatus(sessionId, false);
      }
    }, 2000); // Check every 2 seconds

    setPollInterval(interval);

    // Cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollInterval(null);
      if (!window.closed) {
        window.close();
      }
      setPaymentWindow(null);
      setCurrentStep(FlowStep.PAYMENT);
      setError('Payment timeout. Please try again.');
    }, 600000); // 10 minutes
  };

  const checkPaymentStatus = async (sessionId: string, isFinalCheck: boolean) => {
    // Prevent multiple processing or simultaneous API calls
    if (paymentProcessed || isCheckingPayment) {
      return;
    }

    // Set checking flag to prevent duplicate API calls
    setIsCheckingPayment(true);

    try {
      const result = await paymentService.handleSkipTraceSuccess(sessionId);
      
      // Mark payment as processed IMMEDIATELY to prevent duplicates
      setPaymentProcessed(true);
      
      // Stop polling immediately
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      
      // Close payment window
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.close();
      }
      setPaymentWindow(null);
      
      // Update credits in Redux
      dispatch(setCredits({
        free: result.newBalance.free,
        paid: result.newBalance.paid
      }));
      
      // Proceed to skip trace
      setCurrentStep(FlowStep.PROCESSING);
      performSkipTrace();
      
    } catch (error: any) {
      if (isFinalCheck) {
        // If final check after window closed, go back to payment
        setCurrentStep(FlowStep.PAYMENT);
        setError('Payment was not completed. Please try again.');
      }
      // Otherwise, continue polling (payment might still be in progress)
    } finally {
      // Always reset the checking flag
      setIsCheckingPayment(false);
    }
  };

  const performSkipTrace = async () => {
    setIsProcessing(true);
    setError(null); // Clear any previous errors
    
    try {
      // Extract ONLY property addresses from buyer's purchase history (latest 3)
      const propertyAddresses = buyer.purchase_history?.map(purchase => {
        // Handle both legacy and new address formats
        const enhancedPurchase = purchase as any;
        
        // If we have enhanced backend fields, combine them into complete address
        if (enhancedPurchase.prop_address_line_txt) {
          const street = enhancedPurchase.prop_address_line_txt;
          const city = enhancedPurchase.prop_city_nm || '';
          const state = enhancedPurchase.prop_state_nm || '';
          const zip = enhancedPurchase.prop_zip_cd || '';
          
          // Combine into complete address format: "Street, City, State Zip"
          let fullAddress = street;
          if (city) fullAddress += `, ${city}`;
          if (state) fullAddress += `, ${state}`;
          if (zip) fullAddress += ` ${zip}`;
          
          return fullAddress;
        }
        
        // Fallback to legacy address field
        return enhancedPurchase.address || '';
      }).filter(address => address.trim() !== '')
      .slice(0, 3) || []; // Only take latest 3 properties
        // .slice(0, 1) || []; // TESTING: Only take latest 1 property (was 3 for production)

      // Don't use buyer's business address - only purchase history properties
      if (propertyAddresses.length === 0) {
        const errorMsg = 'No purchase history found for this buyer. Skip trace requires property purchase history.';
        setError(errorMsg);
        setCurrentStep(FlowStep.CONFIRMATION);
        return;
      }

      // Perform skip trace API call
      if (!user?.user_id) {
        const errorMsg = 'User authentication required';
        setError(errorMsg);
        setCurrentStep(FlowStep.CONFIRMATION);
        return;
      }
      
      const userId = parseInt(user.user_id.toString(), 10);
      const response = await skipTraceService.skipTrace(userId, {
        buyerId: buyer.id || `buyer_${Date.now()}`,
        buyerName: buyer.name,
        inputData: {
          ownerName: buyer.name, // Only pass the owner name, not business address
        },
        propertyAddresses: propertyAddresses // Only purchase history properties
      });

      if (response.success && response.result) {
        setSkipTraceResults(response.result);
        // Save result to Redux store with user ID
        const resultWithUserId = {
          ...response.result,
          userId: user?.user_id?.toString() // Associate result with current user
        };
        dispatch(addSkipTraceResult(resultWithUserId));
        
        // Update credits from backend response (backend already consumed the credit)
        if (response.remainingCredits && typeof response.remainingCredits === 'object') {
          dispatch(setCredits({
            free: response.remainingCredits.free,
            paid: response.remainingCredits.paid
          }));
        }
        
        setCurrentStep(FlowStep.RESULTS);
      } else {
        // Handle error response from backend
        const errorMsg = response.error || 'Skip trace lookup failed. Please try again.';
        setError(errorMsg);
        setCurrentStep(FlowStep.CONFIRMATION);
      }
    } catch (error: any) {
      // Handle network/API errors
      const errorMsg = error.message || 'Network error. Please check your connection and try again.';
      setError(errorMsg);
      setCurrentStep(FlowStep.CONFIRMATION);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    onSkipTraceComplete(skipTraceResults);
    onClose();
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
  };

  const renderConfirmationStep = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Icon as={FaEye as React.ElementType} color={brandColor} boxSize={12} mb={4} />
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          Skip Trace Contact
        </Text>
        <Text color={mutedTextColor}>
          You're about to skip trace {buyer.name}
        </Text>
      </Box>

      <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
        <VStack align="start" spacing={2}>
          <Text fontWeight="semibold" color="blue.700">
            What you'll get:
          </Text>
          <Text fontSize="sm" color="blue.600">• Minimum of 3 phone numbers</Text>
          <Text fontSize="sm" color="blue.600">• Up to 2 email addresses</Text>
          <Text fontSize="sm" color="blue.600">• Current and previous addresses</Text>
          <Text fontSize="sm" color="blue.600">• DNC and litigation status</Text>
        </VStack>
      </Box>

      <SimpleGrid columns={2} spacing={4}>
        <Stat>
          <StatLabel>Cost</StatLabel>
          <StatNumber fontSize="lg">1 Credit</StatNumber>
          <StatHelpText>($0.15 value)</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Available Credits</StatLabel>
          <StatNumber fontSize="lg" color={hasCredits ? 'green.500' : 'red.500'}>
            {totalCredits}
          </StatNumber>
          <StatHelpText>
            {skipTraceCredits.free} free, {skipTraceCredits.paid} paid
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {error && (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Skip Trace Failed</AlertTitle>
            <AlertDescription>
              {error.toLowerCase().includes('database') || error.toLowerCase().includes('sql')
                ? 'A temporary service issue occurred. Please refresh the page or try again in a few minutes.'
                : error}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {!hasCredits && (
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>No Credits Available</AlertTitle>
            <AlertDescription>
              You need to purchase credits to skip trace this contact.
            </AlertDescription>
          </Box>
        </Alert>
      )}
    </VStack>
  );

  const renderPaymentStep = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Icon as={FaCreditCard as React.ElementType} color={brandColor} boxSize={12} mb={4} />
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          Purchase Skip Trace Credits
        </Text>
        <Text color={mutedTextColor}>
          Choose a credit bundle to continue
        </Text>
      </Box>

      <RadioGroup 
        value={selectedBundle ? selectedBundle.credits.toString() : ''} 
        onChange={(value) => {
          const bundle = creditBundles.find(b => b.credits.toString() === value);
          setSelectedBundle(bundle || null);
        }}
      >
        <Stack spacing={3}>
          {creditBundles.map((bundle) => (
            <Box
              key={bundle.credits}
              p={4}
              borderWidth="2px"
              borderColor={selectedBundle?.credits === bundle.credits ? brandColor : borderColor}
              borderRadius="md"
              position="relative"
              cursor="pointer"
              onClick={() => setSelectedBundle(bundle)}
            >
              {bundle.popular && (
                <Badge
                  position="absolute"
                  top="-8px"
                  right="4"
                  colorScheme="brand"
                  variant="solid"
                  fontSize="xs"
                >
                  Popular
                </Badge>
              )}
              <Radio value={bundle.credits.toString()} colorScheme="brand">
                <HStack justify="space-between" w="100%">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">{bundle.credits} Credits</Text>
                    <Text fontSize="sm" color={mutedTextColor}>
                      ${bundle.perLookup.toFixed(2)} per lookup
                    </Text>
                  </VStack>
                  <Text fontWeight="bold" fontSize="lg">
                    ${bundle.price.toFixed(2)}
                  </Text>
                </HStack>
              </Radio>
            </Box>
          ))}
        </Stack>
      </RadioGroup>

        <HStack align="start">
          <input
            type="checkbox"
            checked={termsAccepted}
            readOnly
            style={{ 
              marginTop: 4, 
              cursor: 'default',
              opacity: termsAccepted ? 1 : 0.5,
              pointerEvents: 'none'
            }}
            id="skiptrace-terms-checkbox"
          />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" color="gray.700">
              You are only charged for searches that return at least one piece of contact information. <br/>
              I have read and agree to the{' '}
              <ChakraLink 
                color="blue.600" 
                textDecoration="underline"
                cursor="pointer"
                onClick={() => setIsTermsModalOpen(true)}
              >
                Terms & Conditions
              </ChakraLink>{' '}and authorize this charge.
            </Text>
            {!termsAccepted && (
              <Text fontSize="xs" color="orange.600" mt={1}>
                Click "Terms & Conditions" above to read and accept
              </Text>
            )}
          </VStack>
        </HStack>

      <Box p={4} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
        <HStack spacing={3}>
          <Icon as={FaShieldAlt as React.ElementType} color="green.500" />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold" color="green.700">
              Secure Payment
            </Text>
            <Text fontSize="sm" color="green.600">
              Payments are processed securely through Stripe. No card information is stored.
            </Text>
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );

  const renderProcessingStep = () => (
    <VStack spacing={6} align="stretch" textAlign="center">
      <Spinner size="xl" color={brandColor} thickness="4px" />
      <Text fontSize="xl" fontWeight="bold">
        {currentStep === FlowStep.PROCESSING ? 'Skip Tracing Contact...' : 'Processing Payment...'}
      </Text>
      <Text color={mutedTextColor}>
        {currentStep === FlowStep.PROCESSING 
          ? 'Searching multiple databases for contact information'
          : 'Securely processing your payment'
        }
      </Text>
      <Progress colorScheme="brand" isIndeterminate />
    </VStack>
  );

  const renderPaymentProcessingStep = () => (
    <VStack spacing={6} align="stretch" textAlign="center">
      <Spinner size="xl" color={brandColor} thickness="4px" />
      <Text fontSize="xl" fontWeight="bold">
        Waiting for Payment
      </Text>
      <Text color={mutedTextColor}>
        Complete your payment in the checkout window
      </Text>
      <Progress colorScheme="brand" isIndeterminate />
      
      {paymentWindow && (
        <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <Text fontSize="sm" color="blue.700">
            💳 Complete your payment in the Stripe checkout window
          </Text>
          <Text fontSize="xs" color="blue.600" mt={1}>
            This modal will automatically update when payment is complete
          </Text>
        </Box>
      )}
      
      <Button
        variant="outline"
        onClick={() => {
          // Clean up polling
          if (pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
          // Close payment window
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.close();
          }
          setPaymentWindow(null);
          setPaymentProcessed(false);
          setIsCheckingPayment(false);
          setCurrentStep(FlowStep.PAYMENT);
        }}
        size="sm"
      >
        Cancel Payment
      </Button>
    </VStack>
  );

  const renderResultsStep = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Icon as={FaCheck as React.ElementType} color="green.500" boxSize={12} mb={4} />
        <Text fontSize="xl" fontWeight="bold" mb={2}>
          Skip Trace Complete!
        </Text>
        <Text color={mutedTextColor}>
          Found contact information for {buyer.name}
        </Text>
      </Box>

      {skipTraceResults && (
        <VStack spacing={4} align="stretch">
          <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="md">
            <Text fontWeight="semibold" mb={2}>Phone Numbers ({skipTraceResults.phones.length})</Text>
            {skipTraceResults.phones.map((phone: any, index: number) => (
              <HStack key={index} justify="space-between" py={1}>
                <Text fontFamily="mono">{phone.number}</Text>
              </HStack>
            ))}
          </Box>

          <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="md">
            <Text fontWeight="semibold" mb={2}>Email Addresses ({skipTraceResults.emails.length})</Text>
            {skipTraceResults.emails.map((email: any, index: number) => (
              <HStack key={index} justify="space-between" py={1}>
                <Text fontFamily="mono">{email.email}</Text>
              </HStack>
            ))}
          </Box>

          <Box p={4} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
            <Text fontWeight="semibold" color="green.700" mb={1}>
              Compliance Status
            </Text>
            <Text fontSize="sm" color="green.600">
              ✓ {skipTraceResults.compliance.dncStatus}
            </Text>
            <Text fontSize="sm" color="green.600">
              ✓ {skipTraceResults.compliance.litigatorStatus}
            </Text>
          </Box>
        </VStack>
      )}
    </VStack>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case FlowStep.CONFIRMATION:
        return renderConfirmationStep();
      case FlowStep.PAYMENT:
        return renderPaymentStep();
      case FlowStep.PROCESSING_PAYMENT:
        return renderPaymentProcessingStep();
      case FlowStep.PROCESSING:
        return renderProcessingStep();
      case FlowStep.RESULTS:
        return renderResultsStep();
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case FlowStep.CONFIRMATION:
        return 'Confirm Skip Trace';
      case FlowStep.PAYMENT:
        return 'Purchase Credits';
      case FlowStep.PROCESSING_PAYMENT:
        return 'Processing Payment';
      case FlowStep.PROCESSING:
        return 'Processing';
      case FlowStep.RESULTS:
        return 'Results';
      default:
        return '';
    }
  };

  const canGoBack = currentStep === FlowStep.PAYMENT;
  const canGoNext = currentStep === FlowStep.CONFIRMATION && hasCredits;
  const canPurchase = currentStep === FlowStep.PAYMENT && selectedBundle && !isProcessing;
  const canComplete = currentStep === FlowStep.RESULTS;

  const handleModalClose = () => {
    // Clean up payment window and polling when modal is closed
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    setPaymentWindow(null);
    setPaymentProcessed(false);
    setIsCheckingPayment(false);
    setCurrentSessionId(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} size="lg" isCentered closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.400" />
      <ModalContent bg={bgColor} borderRadius="lg" boxShadow="xl">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor}>
          <Text fontSize="lg" fontWeight="bold">
            {getStepTitle()}
          </Text>
        </ModalHeader>
        <ModalCloseButton isDisabled={isProcessing} />

        <ModalBody py={6}>
          {getStepContent()}
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
          <HStack spacing={3} w="100%">
            {canGoBack && (
              <Button
                variant="outline"
                leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                onClick={() => setCurrentStep(FlowStep.CONFIRMATION)}
                isDisabled={isProcessing}
              >
                Back
              </Button>
            )}
            
            <Flex flex={1} />
            
            {currentStep === FlowStep.CONFIRMATION && (
              <Button
                colorScheme="brand"
                onClick={handleConfirmSkipTrace}
                rightIcon={<Icon as={FaArrowRight as React.ElementType} />}
                isDisabled={isProcessing}
              >
                {hasCredits ? 'Skip Trace Now' : 'Buy Credits'}
              </Button>
            )}

            {canPurchase && (
              <Button
                colorScheme="brand"
                onClick={handlePurchaseCredits}
                rightIcon={<Icon as={FaArrowRight as React.ElementType} />}
                isDisabled={!selectedBundle || !termsAccepted}
                isLoading={isProcessing}
                loadingText="Processing..."
              >
                Proceed to Payment
              </Button>
            )}

            {canComplete && (
              <Button
                colorScheme="green"
                onClick={handleComplete}
                rightIcon={<Icon as={FaCheck as React.ElementType} />}
              >
                Complete
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Terms & Conditions Modal */}
    <TermsAndConditionsModal
      isOpen={isTermsModalOpen}
      onClose={() => setIsTermsModalOpen(false)}
      onAccept={handleTermsAccept}
    />
    </>
  );
};

export default SkipTraceFlowModal; 