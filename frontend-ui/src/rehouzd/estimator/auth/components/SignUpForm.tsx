import React, { useState } from 'react';
import {
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    FormErrorMessage,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import { isValidEmail, isValidName, isValidPassword, doPasswordsMatch } from '../../utils/validationUtils';

interface SignUpFormProps {
    onSignUp: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
    onError: (message: string) => void;
    onBackToLogin: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSignUp, onError, onBackToLogin }) => {
    const [signupFirstName, setSignupFirstName] = useState('');
    const [signupLastName, setSignupLastName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [error, setError] = useState('');
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    // Field-specific error messages
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateEmail = () => {
        if (!signupEmail) {
            setEmailError('Email is required');
            return false;
        }
        if (!isValidEmail(signupEmail)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = () => {
        if (!signupPassword) {
            setPasswordError('Password is required');
            return false;
        }
        if (!isValidPassword(signupPassword)) {
            setPasswordError('Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number');
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
        
        if (!isEmailValid || !isPasswordValid ) {
            return;
        }
        
        try {
            await onSignUp(signupFirstName, signupLastName, signupEmail, signupPassword);
        } catch (err: any) {
            let errorMessage = 'An error occurred during sign-up';
            
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
        <form onSubmit={handleSubmit} id="signup-form">
            <VStack spacing={4} align="stretch">
                {error && (
                    <Alert status="error" borderRadius="md" mb={2}>
                        <AlertIcon />
                        {error}
                    </Alert>
                )}
                
                <FormControl isInvalid={touchedFields.firstName && !!firstNameError}>
                    <FormLabel>First Name</FormLabel>
                    <Input
                        placeholder="First Name"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        onBlur={() => handleBlur('firstName')}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.firstName && firstNameError && (
                        <FormErrorMessage>{firstNameError}</FormErrorMessage>
                    )}
                </FormControl>
                <FormControl isInvalid={touchedFields.lastName && !!lastNameError}>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                        placeholder="Last Name"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        onBlur={() => handleBlur('lastName')}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.lastName && lastNameError && (
                        <FormErrorMessage>{lastNameError}</FormErrorMessage>
                    )}
                </FormControl>
                <FormControl isRequired isInvalid={touchedFields.email && !!emailError}>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        placeholder="Email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        onBlur={() => handleBlur('email')}
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
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.password && passwordError && (
                        <FormErrorMessage>{passwordError}</FormErrorMessage>
                    )}
                </FormControl>
            </VStack>
        </form>
    );
};

export default SignUpForm;
