import React, { useState, useEffect } from 'react';
import {
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    Flex,
    Checkbox,
    Link,
    FormErrorMessage,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import { isValidEmail } from '../../utils/validationUtils';

interface LoginFormProps {
    onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    onError: (message: string) => void;
    onSignUp: () => void;
    onForgotPassword: () => void;
    defaultEmail?: string; // Optional default email to prefill
}

const LoginForm: React.FC<LoginFormProps> = ({ 
    onLogin, 
    onError, 
    onSignUp, 
    onForgotPassword, 
    defaultEmail = '' 
}) => {
    const [loginEmail, setLoginEmail] = useState(defaultEmail);
    const [loginPassword, setLoginPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    // Validation errors
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    
    // Update email field when defaultEmail prop changes
    useEffect(() => {
        if (defaultEmail) {
            setLoginEmail(defaultEmail);
        }
    }, [defaultEmail]);

    const validateEmail = () => {
        if (!loginEmail) {
            setEmailError('Email is required');
            return false;
        }
        if (!isValidEmail(loginEmail)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = () => {
        if (!loginPassword) {
            setPasswordError('Password is required');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleBlur = (field: string) => {
        setTouchedFields({ ...touchedFields, [field]: true });
        if (field === 'email') validateEmail();
        if (field === 'password') validatePassword();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Validate all fields before submission
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        
        if (!isEmailValid || !isPasswordValid) {
            return;
        }
        
        try {
            await onLogin(loginEmail, loginPassword, rememberMe);
        } catch (err: any) {
            let errorMessage = 'An error occurred';
            
            // Handle different types of errors
            if (err.message) {
                // Try to parse JSON error message if needed
                if (err.message.includes("Unexpected token") && err.message.includes("not valid JSON")) {
                    errorMessage = "Server error: Unable to process your request";
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
            // Only call onError for logging, not for user display
            onError(errorMessage);
        }
    };

    return (
        <form onSubmit={handleSubmit} id="login-form">
            <VStack spacing={4} align="stretch">
                {error && (
                    <Alert status="error" borderRadius="md" mb={2}>
                        <AlertIcon />
                        {error}
                    </Alert>
                )}
                
                <FormControl isRequired isInvalid={touchedFields.email && !!emailError}>
                    <FormLabel>Email</FormLabel>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="Email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => handleBlur('email')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.email && emailError && (
                        <FormErrorMessage>{emailError}</FormErrorMessage>
                    )}
                </FormControl>
                <FormControl isRequired isInvalid={touchedFields.password && !!passwordError}>
                    <FormLabel>Password</FormLabel>
                    <Input
                        type="password"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.password && passwordError && (
                        <FormErrorMessage>{passwordError}</FormErrorMessage>
                    )}
                </FormControl>
                <Flex align="center" justify="space-between">
                    <Checkbox isChecked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                        colorScheme="blue"
                        sx={{
                                '.chakra-checkbox__control': {
                                borderColor: 'gray.400', // add border to make it visible
                                backgroundColor: 'white',
                                _hover: {
                                    borderColor: 'gray.600',
                                },
                                _checked: {
                                    backgroundColor: 'blue.500',
                                    borderColor: 'blue.500',
                                },
                                },
                            }}
                    >
                        Remember me
                    </Checkbox>
                    <Link fontSize="sm" onClick={onForgotPassword}>
                        Forgot password?
                    </Link>
                </Flex>
                {/* Hidden submit button to enable Enter key submission */}
                <input type="submit" style={{ display: 'none' }} />
            </VStack>
        </form>
    );
};

export default LoginForm;
