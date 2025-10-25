import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Progress,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Badge,
  useToast,
  Spinner,
  SimpleGrid,
  Icon,
  Flex
} from '@chakra-ui/react';
import { FaCheckCircle, FaTimesCircle, FaEye, FaCreditCard } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredits } from '../store/skipTraceSlice';
import skipTraceService from '../services/skipTraceService';
import paymentService from '../services/paymentService';
import { Buyer } from '../store/buyerSlice';
import config from '../../../config';
import TermsAndConditionsModal from './TermsAndConditionsModal';

interface BulkSkipTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBuyers: Buyer[];
  onComplete: (results: BulkSkipTraceResult[]) => void;
  breakdown?: {
    total: number;
    inNetwork: number;
    alreadyTraced: number;
    newToTrace: number;
  };
  onStartBackgroundProcessing?: () => void;
}

interface BulkSkipTraceResult {
  buyer: Buyer;
  success: boolean;
  result?: any;
  error?: string;
}

interface BulkSkipTraceProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentBuyer?: string;
  results: BulkSkipTraceResult[];
}

type ModalPhase = 'validation' | 'payment' | 'processing_payment' | 'processing' | 'results';

const CREDIT_COST_PER_TRACE = 0.15;

const BulkSkipTraceModal: React.FC<BulkSkipTraceModalProps> = ({
  isOpen,
  onClose,
  selectedBuyers,
  onComplete,
  breakdown,
  onStartBackgroundProcessing
}) => {
  const [phase, setPhase] = useState<ModalPhase>('validation');
  const [progress, setProgress] = useState<BulkSkipTraceProgress>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    results: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCancelled, setProcessingCancelled] = useState(false);
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const skipTraceCredits = useAppSelector(state => state.skipTrace.credits);
  const user = useAppSelector(state => state.user);

  const totalCreditsNeeded = breakdown?.newToTrace || selectedBuyers.length;
  const totalCost = totalCreditsNeeded * CREDIT_COST_PER_TRACE;
  const availableCredits = skipTraceCredits.free + skipTraceCredits.paid;
  const creditsShortfall = Math.max(0, totalCreditsNeeded - availableCredits);
  const hasEnoughCredits = creditsShortfall === 0;

  // Calculate bundled credits to purchase
  const creditBundles = [10, 25, 50, 100];
  const creditsToPurchase = (() => {
    const bundle = creditBundles.find(bundle => bundle >= creditsShortfall);
    if (bundle) {
      return bundle;
    }
    const largestBundle = creditBundles[creditBundles.length - 1];
    return Math.ceil(creditsShortfall / largestBundle) * largestBundle;
  })();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('validation');
      setProgress({
        total: selectedBuyers.length,
        completed: 0,
        successful: 0,
        failed: 0,
        results: []
      });
      setIsProcessing(false);
      setProcessingCancelled(false);
      setPaymentProcessed(false);
      setIsCheckingPayment(false);
      setCurrentSessionId(null);
      setCountdown(null);
      
      // Clean up any existing payment window and polling
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.close();
      }
      setPaymentWindow(null);
      
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }

      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
    }
  }, [isOpen, selectedBuyers.length]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [paymentWindow, pollInterval, countdownInterval]);

  // Listen for payment messages from child window
  useEffect(() => {
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
        
        toast({
          title: 'Payment Cancelled',
          description: 'Payment was cancelled. You can try again.',
          status: 'info',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
        
        setPhase('validation');
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [paymentWindow, pollInterval, currentSessionId, toast]);

  // Start countdown when results phase is reached
  useEffect(() => {
    if (phase === 'results' && countdown === null) {
      setCountdown(3);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Auto-close modal when countdown reaches 0
            clearInterval(interval);
            setCountdownInterval(null);
            setTimeout(() => {
              onClose();
            }, 1000); // Small delay to show "0" briefly
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setCountdownInterval(interval);
    }
    
    // Cleanup on phase change away from results
    if (phase !== 'results') {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
      setCountdown(null);
    }
  }, [phase, onClose]);

  const checkPaymentStatus = async (sessionId: string, isFinalCheck: boolean = false) => {
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
      
      // Show success message
      toast({
        title: 'Payment Successful',
        description: `Added ${result.creditsAdded} credits to your account`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      
      // Go back to validation phase so user can proceed with skip trace
      setPhase('validation');
      
    } catch (error: any) {
      if (isFinalCheck) {
        // If final check after window closed, show error
        toast({
          title: 'Payment Issue',
          description: 'Payment was not completed. Please try again.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
        setPhase('validation');
      }
      // Otherwise, continue polling (payment might still be in progress)
    } finally {
      // Always reset the checking flag
      setIsCheckingPayment(false);
    }
  };

  const handlePurchaseCredits = async () => {
    try {
      if (!user?.user_id) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to purchase credits',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
        return;
      }

      // Use the component-level bundled credits calculation
      const purchaseAmount = creditsToPurchase * CREDIT_COST_PER_TRACE;

      const session = await paymentService.createSkipTraceCheckout(
        parseInt(user.user_id.toString()),
        {
          credits: creditsToPurchase,
          price: purchaseAmount
        }
      );

      // Open payment in new window
      const newPaymentWindow = window.open(session.url, 'payment', 'width=600,height=700,scrollbars=yes,resizable=yes');
      setPaymentWindow(newPaymentWindow);
      setPaymentProcessed(false);
      setCurrentSessionId(session.sessionId);
      setPhase('processing_payment'); // Switch to processing payment phase

      // Start polling for payment status
      const intervalId = setInterval(() => {
        if (newPaymentWindow?.closed) {
          // Window closed, do final check
          clearInterval(intervalId);
          setPollInterval(null);
          setPaymentWindow(null);
          
          // Only do final check if payment hasn't been processed yet
          if (!paymentProcessed) {
            checkPaymentStatus(session.sessionId, true);
          }
        } else {
          // Window still open, check payment status
          checkPaymentStatus(session.sessionId, false);
        }
      }, 2000);

      setPollInterval(intervalId);

    } catch (error) {
      toast({
        title: 'Payment Error',
        description: 'Unable to initiate payment. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };

  const performBulkSkipTrace = async () => {
    try {
      // Show initial confirmation toast
      toast({
        title: 'Skip Trace Started',
        description: `Starting skip trace for ${totalCreditsNeeded} buyers in the background...`,
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });

      // Close modal and start background processing
      onClose();
      
      // Start background processing
      if (onStartBackgroundProcessing) {
        onStartBackgroundProcessing();
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start bulk skip trace',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };

  const cancelProcessing = () => {
    setProcessingCancelled(true);
    setIsProcessing(false);
    setPhase('results');
  };

  const handleModalClose = () => {
    // Clean up payment window and polling when modal is closed
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    setPaymentWindow(null);
    setCurrentSessionId(null);
    
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setCountdown(null);
    
    onClose();
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
  };

  const renderValidationPhase = () => (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={3}>
          Skip Trace Confirmation
        </Text>
        
        {breakdown && (
          <Box mb={4} p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
            <Text fontSize="sm" fontWeight="semibold" color="blue.700" mb={2}>
              Buyer Analysis
            </Text>
            <SimpleGrid columns={2} spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="blue.600">Total Selected:</Text>
                <Text fontSize="sm" fontWeight="bold">{breakdown.total}</Text>
              </HStack>
              {breakdown.inNetwork > 0 && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="green.600">In-Network (Free):</Text>
                  <Text fontSize="sm" fontWeight="bold" color="green.600">{breakdown.inNetwork}</Text>
                </HStack>
              )}
              {breakdown.alreadyTraced > 0 && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="orange.600">Already Skip Traced:</Text>
                  <Text fontSize="sm" fontWeight="bold" color="orange.600">{breakdown.alreadyTraced}</Text>
                </HStack>
              )}
              <HStack justify="space-between">
                <Text fontSize="sm" color="purple.600">New to Trace:</Text>
                <Text fontSize="sm" fontWeight="bold" color="purple.600">{breakdown.newToTrace}</Text>
              </HStack>
            </SimpleGrid>
          </Box>
        )}
        
        <SimpleGrid columns={2} spacing={4}>
          <Box p={4} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" color="gray.600">Buyers to Skip Trace</Text>
            <Text fontSize="2xl" fontWeight="bold">{totalCreditsNeeded}</Text>
          </Box>
          <Box p={4} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" color="gray.600">Total Cost</Text>
            <Text fontSize="2xl" fontWeight="bold">${totalCost.toFixed(2)}</Text>
          </Box>
        </SimpleGrid>
      </Box>

      <Divider />

      <Box>
        <Text fontSize="md" fontWeight="semibold" mb={3}>
          Credit Balance
        </Text>
        <HStack justify="space-between" mb={2}>
          <Text>Available Credits:</Text>
          <Badge colorScheme={hasEnoughCredits ? 'green' : 'orange'} size="lg">
            {availableCredits} credits
          </Badge>
        </HStack>
        <HStack justify="space-between" mb={2}>
          <Text>Credits Needed:</Text>
          <Text fontWeight="semibold">{totalCreditsNeeded} credits</Text>
        </HStack>
        {creditsShortfall > 0 && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Additional Credits Needed</AlertTitle>
              <AlertDescription>
                You need {creditsShortfall} more credits. You'll need to purchase {creditsToPurchase} credits (${(creditsToPurchase * CREDIT_COST_PER_TRACE).toFixed(2)}) - the smallest available bundle.
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </Box>

      <Divider />

      <Box>
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
            id="bulk-skiptrace-terms-checkbox"
          />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" color="gray.700">
              You are only charged for searches that return at least one piece of contact information. <br/>
              I have read and agree to the{' '}
              <Text 
                as="span" 
                color="blue.600" 
                textDecoration="underline"
                cursor="pointer"
                onClick={() => setIsTermsModalOpen(true)}
              >
                Terms & Conditions
              </Text>{' '}and authorize this charge.
            </Text>
            {!termsAccepted && (
              <Text fontSize="xs" color="orange.600" mt={1}>
                Click "Terms & Conditions" above to read and accept
              </Text>
            )}
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );

  const renderProcessingPaymentPhase = () => (
    <VStack spacing={6} align="stretch" textAlign="center">
      <Spinner size="xl" color="purple.500" thickness="4px" />
      <Text fontSize="xl" fontWeight="bold">
        Waiting for Payment
      </Text>
      <Text color="gray.500">
        Complete your payment in the checkout window
      </Text>
      <Progress colorScheme="purple" isIndeterminate />
      
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
          setCurrentSessionId(null);
          setPhase('validation');
        }}
        size="sm"
      >
        Cancel Payment
      </Button>
    </VStack>
  );

  const renderProcessingPhase = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          Skip Tracing Buyers...
        </Text>
        <Progress 
          value={(progress.completed / progress.total) * 100} 
          colorScheme="brand" 
          size="lg" 
          borderRadius="md"
          mb={3}
        />
        <Text fontSize="sm" color="gray.600">
          {progress.completed} of {progress.total} completed
        </Text>
      </Box>

      {progress.currentBuyer && (
        <Box p={4} bg="blue.50" borderRadius="md" textAlign="center">
          <HStack justify="center" spacing={2}>
            <Spinner size="sm" color="blue.500" />
            <Text>Currently processing: <strong>{progress.currentBuyer}</strong></Text>
          </HStack>
        </Box>
      )}

      <SimpleGrid columns={2} spacing={4}>
        <Box p={4} bg="green.50" borderRadius="md" textAlign="center">
          <Icon as={FaCheckCircle as React.ElementType} color="green.500" boxSize={6} mb={2} />
          <Text fontSize="sm" color="green.600">Successful</Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.700">
            {progress.successful}
          </Text>
        </Box>
        <Box p={4} bg="red.50" borderRadius="md" textAlign="center">
          <Icon as={FaTimesCircle as React.ElementType} color="red.500" boxSize={6} mb={2} />
          <Text fontSize="sm" color="red.600">Failed</Text>
          <Text fontSize="2xl" fontWeight="bold" color="red.700">
            {progress.failed}
          </Text>
        </Box>
      </SimpleGrid>
    </VStack>
  );

  const renderResultsPhase = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Icon 
          as={FaCheckCircle as React.ElementType} 
          color="green.500" 
          boxSize={12} 
          mb={4} 
        />
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          Bulk Skip Trace Complete
        </Text>
        {countdown !== null && countdown > 0 && (
          <Text fontSize="sm" color="gray.500">
            Automatically closing in {countdown} second{countdown !== 1 ? 's' : ''}
          </Text>
        )}
      </Box>

      <SimpleGrid columns={2} spacing={4}>
        <Box p={4} bg="green.50" borderRadius="md" textAlign="center">
          <Text fontSize="sm" color="green.600">Successful Traces</Text>
          <Text fontSize="3xl" fontWeight="bold" color="green.700">
            {progress.successful}
          </Text>
        </Box>
        <Box p={4} bg="red.50" borderRadius="md" textAlign="center">
          <Text fontSize="sm" color="red.600">Failed Traces</Text>
          <Text fontSize="3xl" fontWeight="bold" color="red.700">
            {progress.failed}
          </Text>
        </Box>
      </SimpleGrid>

      <Box p={4} bg="gray.50" borderRadius="md">
        <Text fontSize="sm" color="gray.600" mb={2}>Summary</Text>
        <Text>Credits used: {progress.successful}</Text>
        <Text>Total processed: {progress.completed}</Text>
        {progress.completed < progress.total && (
          <Text color="orange.600">
            Processing was {processingCancelled ? 'cancelled' : 'interrupted'} early
          </Text>
        )}
      </Box>
    </VStack>
  );

  const getModalTitle = () => {
    switch (phase) {
      case 'validation': return 'Bulk Skip Trace';
      case 'payment': return 'Purchase Credits';
      case 'processing_payment': return 'Processing Payment';
      case 'processing': return 'Processing Skip Traces';
      case 'results': return 'Skip Trace Results';
      default: return 'Bulk Skip Trace';
    }
  };

    const renderFooterButtons = () => {
    switch (phase) {
      case 'validation':
        return (
          <HStack spacing={3}>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            {hasEnoughCredits ? (
              <Button 
                colorScheme="brand" 
                leftIcon={<Icon as={FaEye as React.ElementType} />}
                onClick={performBulkSkipTrace}
                isDisabled={!termsAccepted}
              >
                Skip Trace {totalCreditsNeeded} Buyers
              </Button>
            ) : (
              <Button 
                colorScheme="blue" 
                leftIcon={<Icon as={FaCreditCard as React.ElementType} />}
                onClick={handlePurchaseCredits}
                isDisabled={!termsAccepted}
              >
                Buy {creditsToPurchase} Credits (${(creditsToPurchase * CREDIT_COST_PER_TRACE).toFixed(2)})
              </Button>
            )}
          </HStack>
        );
      case 'processing_payment':
        return null; // No buttons during payment processing
      case 'processing':
        return (
          <Button 
            variant="outline" 
            onClick={cancelProcessing}
            isDisabled={!isProcessing}
          >
            Cancel Remaining
          </Button>
        );
      case 'results':
        return (
          <Button colorScheme="brand" onClick={handleModalClose}>
            {countdown !== null && countdown > 0 ? `Close (${countdown})` : 'Close'}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} size="lg" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{getModalTitle()}</ModalHeader>
        {phase !== 'processing' && phase !== 'processing_payment' && <ModalCloseButton />}
        
        <ModalBody>
          {phase === 'validation' && renderValidationPhase()}
          {phase === 'processing_payment' && renderProcessingPaymentPhase()}
          {phase === 'processing' && renderProcessingPhase()}
          {phase === 'results' && renderResultsPhase()}
        </ModalBody>

        <ModalFooter>
          {renderFooterButtons()}
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

export default BulkSkipTraceModal; 