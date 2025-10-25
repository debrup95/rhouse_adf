import React, { useState } from 'react';
import {
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    Button,
    FormErrorMessage,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import { isValidEmail, isValidPassword } from '../../utils/validationUtils';
import config from '../../../../config';
import OTPInput from './OTPInput';

// Helper function to make API calls with proper base URL
const fetchApi = async (url: string, options: RequestInit = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${config.apiUrl}${url}`;
  const response = await fetch(fullUrl, options);
  return response;
};

interface ForgotPasswordFormProps {
    onClose: () => void;
    onBackToLogin: () => void;
    onSubmit?: () => void; // Optional callback for when reset is successful
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onClose, onBackToLogin, onSubmit }) => {
    const [resetStep, setResetStep] = useState<'request' | 'verify' | 'reset'>('request');
    const [resetEmail, setResetEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetSuccessMessage, setResetSuccessMessage] = useState('');
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [isResending, setIsResending] = useState(false);
    const [isRequestingReset, setIsRequestingReset] = useState(false);
    const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    
    // Field-specific errors
    const [emailError, setEmailError] = useState('');
    const [tokenError, setTokenError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const validateEmail = () => {
        if (!resetEmail) {
            setEmailError('Email is required');
            return false;
        }
        if (!isValidEmail(resetEmail)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validateToken = () => {
        if (!resetToken.trim()) {
            setTokenError('OTP is required');
            return false;
        }
        if (!/^\d{6}$/.test(resetToken.trim())) {
            setTokenError('OTP must be a 6-digit number');
            return false;
        }
        setTokenError('');
        return true;
    };

    const validatePassword = () => {
        if (!newPassword) {
            setPasswordError('New password is required');
            return false;
        }
        if (!isValidPassword(newPassword)) {
            setPasswordError('Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const validateConfirmPassword = () => {
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            return false;
        }
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            return false;
        }
        setConfirmPasswordError('');
        return true;
    };

    const handleBlur = (field: string) => {
        setTouchedFields({ ...touchedFields, [field]: true });
        if (field === 'email') validateEmail();
        if (field === 'token') validateToken();
        if (field === 'password') validatePassword();
        if (field === 'confirmPassword') validateConfirmPassword();
    };

    const handleRequestReset = async () => {
        setResetError('');
        setResetSuccessMessage('');
        setIsRequestingReset(true);
        
        // Validate email before submission
        if (!validateEmail()) {
            setIsRequestingReset(false);
            return;
        }
        
        try {
            const res = await fetchApi('/api/auth/request-password-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                setResetError(errorData.message || 'Request failed');
                return;
            }
            setResetSuccessMessage('Password reset OTP sent. Check your email for the 6-digit verification code.');
            
            // Always proceed to the OTP verification step
            setResetStep('verify');
            
            // Notify parent component of success if onSubmit is provided
            if (onSubmit) {
                onSubmit();
            }
        } catch (error) {
            setResetError('Error requesting password reset');
        } finally {
            setIsRequestingReset(false);
        }
    };

    const handleVerifyOTP = async () => {
        setResetError('');
        setResetSuccessMessage('');
        setIsVerifyingOTP(true);
        
        // Validate OTP before submission
        if (!validateToken()) {
            setIsVerifyingOTP(false);
            return;
        }
        
        try {
            const res = await fetchApi('/api/auth/verify-password-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, otp: resetToken }),
            });
            if (!res.ok) {
                try {
                    const errorData = await res.json();
                    setResetError(errorData.message || 'OTP verification failed');
                } catch (jsonError) {
                    setResetError('Server error: Unable to verify OTP');
                }
                return;
            }
            setResetSuccessMessage('OTP verified successfully. Please set your new password.');
            
            // Proceed to password reset step
            setResetStep('reset');
        } catch (error) {
            setResetError('Error verifying OTP');
        } finally {
            setIsVerifyingOTP(false);
        }
    };

    const handleResetPasswordSubmit = async () => {
        setResetError('');
        setResetSuccessMessage('');
        setIsResettingPassword(true);
        
        // Validate password fields before submission
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        
        if (!isPasswordValid || !isConfirmPasswordValid) {
            setIsResettingPassword(false);
            return;
        }
        
        try {
            const res = await fetchApi('/api/auth/reset-password-with-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, otp: resetToken, newPassword }),
            });
            if (!res.ok) {
                try {
                    const errorData = await res.json();
                    setResetError(errorData.message || 'Password reset failed');
                } catch (jsonError) {
                    setResetError('Server error: Unable to reset password');
                }
                return;
            }
            setResetSuccessMessage('Password reset successful. You can now log in with your new password.');
            
            // Clear the form fields
            setResetEmail('');
            setResetToken('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Close the modal after successful reset
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            setResetError('Error resetting password');
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleResendOTP = async () => {
        setIsResending(true);
        setResetError('');
        
        try {
            const res = await fetchApi('/api/auth/request-password-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                setResetError(errorData.message || 'Failed to resend OTP');
                return;
            }
            setResetSuccessMessage('New OTP sent. Check your email for the 6-digit verification code.');
        } catch (error) {
            setResetError('Error resending OTP');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <VStack spacing={4} align="stretch">
            {resetStep === 'request' ? (
                <>
                    {resetError && (
                        <Alert status="error" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetError}
                        </Alert>
                    )}
                    {resetSuccessMessage && (
                        <Alert status="success" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetSuccessMessage}
                        </Alert>
                    )}
                    
                    <FormControl id="reset-email" isRequired isInvalid={touchedFields.email && !!emailError}>
                        <FormLabel>Email</FormLabel>
                        <Input
                            type="email"
                            placeholder="Your email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            onBlur={() => handleBlur('email')}
                        />
                        {touchedFields.email && emailError && (
                            <FormErrorMessage>{emailError}</FormErrorMessage>
                        )}
                    </FormControl>
                    <Button 
                        bg="green.800"
                        color="white"
                        onClick={handleRequestReset} 
                        isDisabled={!resetEmail || !!emailError}
                        isLoading={isRequestingReset}
                        loadingText="Requesting..."
                        _hover={{
                            bg: "brand.500",
                            transform: "translateY(-2px)",
                            boxShadow: "lg"
                        }}
                        _active={{
                            bg: "brand.600"
                        }}
                        _loading={{
                            bg: "green.800",
                            _hover: {
                                bg: "green.800"
                            }
                        }}
                    >
                        Request Reset
                    </Button>
                    <Button variant="ghost" onClick={onBackToLogin}>
                        Back to Login
                    </Button>
                </>
            ) : resetStep === 'verify' ? (
                <>
                    {resetError && (
                        <Alert status="error" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetError}
                        </Alert>
                    )}
                    {resetSuccessMessage && (
                        <Alert status="success" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetSuccessMessage}
                        </Alert>
                    )}
                    
                    <OTPInput
                        value={resetToken}
                        onChange={(value) => {
                            setResetToken(value);
                            // Auto-validate when OTP changes
                            if (value.length === 6) {
                                setTouchedFields({ ...touchedFields, token: true });
                                // Clear any previous errors when we have 6 digits
                                if (/^\d{6}$/.test(value)) {
                                    setTokenError('');
                                } else {
                                    setTokenError('OTP must be a 6-digit number');
                                }
                            } else if (value.length > 0) {
                                setTouchedFields({ ...touchedFields, token: true });
                                setTokenError('OTP must be a 6-digit number');
                            } else {
                                setTokenError('');
                            }
                        }}
                        isInvalid={touchedFields.token && !!tokenError}
                        errorMessage={tokenError}
                        email={resetEmail}
                        onResendCode={handleResendOTP}
                        isResending={isResending}
                        onComplete={(otp) => {
                            // Auto-submit when all 6 digits are entered and valid
                            if (otp.length === 6 && /^\d{6}$/.test(otp)) {
                                setTokenError('');
                                // Optional: Auto-submit here if you want
                                // handleVerifyOTP();
                            }
                        }}
                    />
                    
                    <Button 
                        bg="green.800"
                        color="white"
                        onClick={handleVerifyOTP} 
                        isDisabled={resetToken.length !== 6 || !/^\d{6}$/.test(resetToken)} 
                        isLoading={isVerifyingOTP}
                        loadingText="Verifying..."
                        size="lg" 
                        width="100%"
                        _hover={{
                            bg: "brand.500",
                            transform: "translateY(-2px)",
                            boxShadow: "lg"
                        }}
                        _active={{
                            bg: "brand.600"
                        }}
                        _loading={{
                            bg: "green.800",
                            _hover: {
                                bg: "green.800"
                            }
                        }}
                    >
                        Verify Code
                    </Button>
                    <Button variant="ghost" onClick={() => setResetStep('request')}>
                        Back to Request
                    </Button>
                </>
            ) : (
                <>
                    {resetError && (
                        <Alert status="error" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetError}
                        </Alert>
                    )}
                    {resetSuccessMessage && (
                        <Alert status="success" borderRadius="md" mb={2}>
                            <AlertIcon />
                            {resetSuccessMessage}
                        </Alert>
                    )}
                    
                    <FormControl id="new-password" isRequired isInvalid={touchedFields.password && !!passwordError}>
                        <FormLabel>New Password</FormLabel>
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                        />
                        {touchedFields.password && passwordError && (
                            <FormErrorMessage>{passwordError}</FormErrorMessage>
                        )}
                    </FormControl>
                    <FormControl id="confirm-password" isRequired isInvalid={touchedFields.confirmPassword && !!confirmPasswordError}>
                        <FormLabel>Confirm Password</FormLabel>
                        <Input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                        />
                        {touchedFields.confirmPassword && confirmPasswordError && (
                            <FormErrorMessage>{confirmPasswordError}</FormErrorMessage>
                        )}
                    </FormControl>
                    <Button 
                        bg="green.800"
                        color="white"
                        onClick={handleResetPasswordSubmit} 
                        isDisabled={!newPassword || !confirmPassword || !!passwordError || !!confirmPasswordError}
                        isLoading={isResettingPassword}
                        loadingText="Resetting..."
                        _hover={{
                            bg: "brand.500",
                            transform: "translateY(-2px)",
                            boxShadow: "lg"
                        }}
                        _active={{
                            bg: "brand.600"
                        }}
                        _loading={{
                            bg: "green.800",
                            _hover: {
                                bg: "green.800"
                            }
                        }}
                    >
                        Reset Password
                    </Button>
                    <Button variant="ghost" onClick={() => setResetStep('verify')}>
                        Back to Verify OTP
                    </Button>
                </>
            )}
        </VStack>
    );
};

export default ForgotPasswordForm;