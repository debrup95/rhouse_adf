import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredits } from '../store/skipTraceSlice';
import paymentService from '../services/paymentService';

interface UsePaymentFlowProps {
  onPaymentSuccess?: () => void;
  onPaymentCancelled?: () => void;
}

export const usePaymentFlow = ({ onPaymentSuccess, onPaymentCancelled }: UsePaymentFlowProps = {}) => {
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const user = useAppSelector(state => state.user);

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
        cleanupPayment();
        
        toast({
          title: 'Payment Cancelled',
          description: 'Payment was cancelled. You can try again.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        
        onPaymentCancelled?.();
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [paymentWindow, pollInterval, currentSessionId, toast, onPaymentCancelled]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupPayment();
    };
  }, []);

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
      setCurrentSessionId(null);
      
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
      });
      
      // Call success callback
      onPaymentSuccess?.();
      
    } catch (error: any) {
      if (isFinalCheck) {
        // If final check after window closed, show error
        toast({
          title: 'Payment Issue',
          description: 'Payment was not completed. Please try again.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        onPaymentCancelled?.();
      }
      // Otherwise, continue polling (payment might still be in progress)
    } finally {
      // Always reset the checking flag
      setIsCheckingPayment(false);
    }
  };

  const startPaymentFlow = async (creditsToPurchase: number, onProcessingStart?: () => void) => {
    try {
      if (!user?.user_id) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to purchase credits',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return false;
      }

      const purchaseAmount = creditsToPurchase * 0.15; // $0.15 per credit

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
      
      // Call processing start callback
      onProcessingStart?.();

      // Start polling for payment status
      const intervalId = setInterval(() => {
        if (newPaymentWindow?.closed) {
          // Window closed, do final check
          clearInterval(intervalId);
          setPollInterval(null);
          setPaymentWindow(null);
          setCurrentSessionId(null);
          
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
      return true;

    } catch (error) {
      toast({
        title: 'Payment Error',
        description: 'Unable to initiate payment. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  };

  const cleanupPayment = () => {
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    setPaymentWindow(null);
    setCurrentSessionId(null);
    
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    
    setPaymentProcessed(false);
    setIsCheckingPayment(false);
  };

  const cancelPayment = () => {
    cleanupPayment();
    onPaymentCancelled?.();
  };

  return {
    paymentWindow,
    isPaymentProcessing: !!paymentWindow,
    startPaymentFlow,
    cancelPayment,
    cleanupPayment
  };
};

export default usePaymentFlow; 