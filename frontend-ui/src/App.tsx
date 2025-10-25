import { Routes, Route, useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import LandingPage from './rehouzd/estimator/landing/LandingPage';
import Navbar from './rehouzd/estimator/landing/components/Navbar';
import Footer from './rehouzd/estimator/landing/components/Footer';
import AccountSettingsPage from "./rehouzd/estimator/auth/components/AccountSettingsPage";
import EstimatePage from "./rehouzd/estimator/estimates/EstimatePage";
import PricingPage from './rehouzd/estimator/pricing/PricingPage';
import SavedEstimatesPage from './rehouzd/estimator/estimates/components/SavedEstimatesPage';
import SkipTraceHistoryPage from './rehouzd/estimator/components/SkipTraceHistoryPage';
import AuthModal from './rehouzd/estimator/auth/AuthModal';
import GoogleAuthHandler from './rehouzd/estimator/auth/components/GoogleAuthHandler';
import WelcomeModal from './rehouzd/estimator/auth/components/WelcomeModal';
import NotFoundPage from './rehouzd/estimator/components/NotFoundPage';
import PaymentSuccess from './rehouzd/estimator/components/PaymentSuccess';
import PaymentCancelled from './rehouzd/estimator/components/PaymentCancelled';
import SharedReportPage from './rehouzd/estimator/shared/SharedReportPage';
import SharedSellerReportPage from './rehouzd/estimator/shared/SharedSellerReportPage';
import config from './config';
import { useAppDispatch, useAppSelector } from './rehouzd/estimator/store/hooks';
import { setUserData, clearUserData } from './rehouzd/estimator/store/userSlice';
import { clearUserSkipTraceResults } from './rehouzd/estimator/store/skipTraceSlice';
import { clearAddressData } from './rehouzd/estimator/store/addressSlice';
import { clearPropertyData } from './rehouzd/estimator/store/propertySlice';
import { resetUnderwriteValues } from './rehouzd/estimator/store/underwriteSlice';
import { resetBuyerMatchingState } from './rehouzd/estimator/store/buyerMatchingSlice';
import { clearCreditData } from './rehouzd/estimator/store/creditSlice';
import { useAnalytics } from './hooks/useAnalytics';
import { initGA } from './utils/analytics';

// ScrollToTop component to handle scrolling to top on route change
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash in the URL, don't auto-scroll to top
    if (hash) {
      return;
    }
    
    // Auto scroll to top when changing routes (but not on initial load to homepage)
    if (pathname !== '/') {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
};

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAppSelector((state) => state.user);
  
  if (!user.isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const [successEmail, setSuccessEmail] = useState('');
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Get user state from Redux
  const user = useAppSelector((state) => state.user);
  const isLoggedIn = user.isLoggedIn;

  // Local state for navbar compatibility (will be removed when navbar is updated)
  const [localIsLoggedIn, setLocalIsLoggedIn] = useState(isLoggedIn);

  // Initialize analytics
  const { setUser, trackUserEngagement } = useAnalytics();

  // Initialize Google Analytics on app startup
  useEffect(() => {
    initGA();
  }, []);

  // Set user ID in analytics when user logs in
  useEffect(() => {
    if (user.isLoggedIn && user.user_id) {
      setUser(user.user_id.toString());
    }
  }, [user.isLoggedIn, user.user_id, setUser]);

  // Sync Redux state with local state for navbar
  useEffect(() => {
    setLocalIsLoggedIn(isLoggedIn);
  }, [isLoggedIn]);

  // Initialize user data from localStorage on app startup
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser && !user.isLoggedIn) {
      try {
        const userData = JSON.parse(storedUser);
        dispatch(setUserData(userData));
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, [dispatch, user.isLoggedIn]);

  const onAuthOpen = (plan?: string) => {
    setSelectedPlan(plan);
    setShowForgotPassword(false);
    setSignupSuccess(false);
    setIsAuthOpen(true);
  };

  const onAuthClose = () => {
    setIsAuthOpen(false);
    setShowForgotPassword(false);
    setSignupSuccess(false);
    setSelectedPlan(undefined);
  };

  const handleLogin = async (email: string, password: string, rememberMe: boolean, suppressRedirect?: boolean) => {
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      const res = await fetch(`${config.apiUrl}/api/auth/login?${cacheBuster}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await res.json();
      
      // Clear skip trace results for other users before setting new user data
      dispatch(clearUserSkipTraceResults(data.user.user_id?.toString()));
      
      dispatch(setUserData({ ...data.user, token: data.token }));
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('user', JSON.stringify({ ...data.user, token: data.token }));

      // Track successful login
      trackUserEngagement.login('email');

      onAuthClose();
      if (!suppressRedirect) {
        navigate('/estimate');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleSignUp = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      const res = await fetch(`${config.apiUrl}/api/auth/signup?${cacheBuster}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Sign-up failed');
      }

      setSuccessEmail(email);
      setSignupSuccess(true);
      //setShowSignUp(false);
      await handleLogin(email, password, true, true);
      
      // Track successful signup
      trackUserEngagement.signup('email');
      
      // Navigate to estimate page with welcome parameter to trigger delayed modal
      navigate('/estimate?welcome=true');
    } catch (error: any) {
      throw error;
    }
  };

  const handleGoogleLogin = () => {
    // Track Google login attempt
    trackUserEngagement.login('google');
    window.location.href = `${config.apiUrl}/api/auth/google`;
  };

  const handleForgotPasswordSubmit = () => {
    // Don't close the modal - let the user see the OTP field
    // The success message will be shown in the ForgotPasswordForm component
  };

  const handleLogout = () => {
    // Track logout
    trackUserEngagement.logout();
    
    // Clear all user-related data on logout
    dispatch(clearUserSkipTraceResults(undefined));
    dispatch(clearUserData());
    dispatch(clearAddressData());
    dispatch(clearPropertyData());
    dispatch(resetUnderwriteValues());
    
    // Clear buyer data
    dispatch({ type: 'buyers/clearBuyers' });
    
    // Clear buyer matching data
    dispatch(resetBuyerMatchingState());
    
    // Clear credit data
    dispatch(clearCreditData());
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('email'); // Keep this for backward compatibility
    
    // Navigate to home page
    navigate('/');
  };

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Add delay before showing welcome modal
      const timer = setTimeout(() => {
        setIsWelcomeOpen(true);
      }, 3000); // 3 seconds delay
      
      // Cleanup timer on component unmount
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (    
      <Box display="flex" flexDirection="column" minH="100vh">
        <Navbar isLoggedIn={localIsLoggedIn} setIsLoggedIn={setLocalIsLoggedIn} onAuthOpen={onAuthOpen} />
        <ScrollToTop />
        <Box flex="1">
          <Routes>
            <Route path="/" element={<LandingPage isLoggedIn={isLoggedIn} onAuthOpen={onAuthOpen} />} />
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountSettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/estimate" element={
              <ProtectedRoute>
                <EstimatePage />
              </ProtectedRoute>
            } />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/saved-estimates" element={
              <ProtectedRoute>
                <SavedEstimatesPage />
              </ProtectedRoute>
            } />
            <Route path="/skip-trace-history" element={
              <ProtectedRoute>
                <SkipTraceHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/auth/google/callback" element={<GoogleAuthHandler />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            {/* Public shared PDF report route - no authentication required */}
            <Route path="/shared/report/:shareToken" element={<SharedReportPage />} />
            <Route path="/shared/seller-report/:shareToken" element={<SharedSellerReportPage />} />
            {/* Catch-all route for 404 - must be last */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={onAuthClose}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onGoogleLogin={handleGoogleLogin}
          showForgotPassword={showForgotPassword}
          setShowForgotPassword={setShowForgotPassword}
          onForgotPasswordSubmit={handleForgotPasswordSubmit}
          showSignUp={showSignUp}
          setShowSignUp={setShowSignUp}
          planInfo={selectedPlan}
          signupSuccess={signupSuccess}
          successEmail={successEmail}
        />
        <WelcomeModal
          isOpen={isWelcomeOpen}
          onClose={() => {
            setIsWelcomeOpen(false);
            navigate('/estimate');
          }}
          onContinue={() => {
            setIsWelcomeOpen(false);
            navigate('/estimate');
          }}
        />
      </Box>
  );
}

export default App;
