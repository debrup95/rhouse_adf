import React, { useState } from 'react';
import {
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
} from '@chakra-ui/react';

interface SignUpFormProps {
    onSignUp: (email: string, password: string, confirm: string) => Promise<void>;
    onError: (message: string) => void;
    onBackToLogin: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSignUp, onError, onBackToLogin }) => {
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirm, setSignupConfirm] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await onSignUp(signupEmail, signupPassword, signupConfirm);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            onError(err.message || 'An error occurred');
        }
    };

    return (
        <form onSubmit={handleSubmit} id="signup-form"> {/* Added id */}
            <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        placeholder="Email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                        type="password"
                        placeholder="Password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel>Confirm Password</FormLabel>
                    <Input
                        type="password"
                        placeholder="Confirm Password"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                    />
                </FormControl>
                {error && (
                    <Text color="red.500" fontSize="sm">
                        {error}
                    </Text>
                )}
            </VStack>
        </form>
    );
};

export default SignUpForm;