import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    VStack,
    HStack,
    Button,
    useColorModeValue,
    Flex,
    Icon,
} from '@chakra-ui/react';
import { FaGoogle } from 'react-icons/fa';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    onSignUp: (email: string, password: string, confirm: string) => Promise<void>;
    onGoogleLogin: () => void;
    isForgotPassword: boolean;
    onForgotPassword: () => void;
    onBackToLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignUp, onGoogleLogin, isForgotPassword, onForgotPassword, onBackToLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const boxBg = useColorModeValue('white', 'gray.700');

    return (
        <Modal isOpen={isOpen} onClose={() => { onClose(); onBackToLogin(); setIsSignUp(false); }} isCentered>
            <ModalOverlay />
            <ModalContent p={4} bg={boxBg}>
                <ModalHeader textAlign="center">
                    {isSignUp ? 'Create your account' : isForgotPassword ? 'Reset Your Password' : 'Sign in to your account'}
                </ModalHeader>
                <ModalCloseButton onClick={() => { onClose(); onBackToLogin(); setIsSignUp(false); }} />
                <ModalBody>
                    {isForgotPassword ? (
                        <ForgotPasswordForm onClose={onClose} onBackToLogin={onBackToLogin} />
                    ) : isSignUp ? (
                        <SignUpForm onSignUp={onSignUp} onError={(message) => console.error(message)} onBackToLogin={() => setIsSignUp(false)} />
                    ) : (
                        <LoginForm onLogin={onLogin} onError={(message) => console.error(message)} onSignUp={() => setIsSignUp(true)} onForgotPassword={() => { onForgotPassword(); }} />
                    )}
                </ModalBody>
                <ModalFooter flexDir="column" pt={4}>
                    <HStack spacing={4} mb={4} w="100%" justifyContent="center">
                        {!isForgotPassword && !isSignUp && (
                            <>
                                <Button colorScheme="blue" type="submit" w="100%" onClick={() => {
                                    const form = document.querySelector('#login-form') as HTMLFormElement;
                                    form?.requestSubmit();
                                }}>
                                    Sign in
                                </Button>
                                <Button colorScheme="grey" variant="ghost" onClick={() => setIsSignUp(true)} w="100%">
                                    Sign up
                                </Button>
                            </>
                        )}
                        {!isForgotPassword && isSignUp && (
                            <>
                                <Button colorScheme="blue" type="submit" w="100%" onClick={() => {
                                    const form = document.querySelector('#signup-form') as HTMLFormElement;
                                    form?.requestSubmit();
                                }}>
                                    Sign up
                                </Button>
                                <Button variant="ghost" onClick={() => setIsSignUp(false)} w="100%">
                                    Back to Login
                                </Button>
                            </>
                        )}
                    </HStack>
                    {/* Google Login Button */}
                    {!isForgotPassword && (
                        <Button
                            leftIcon={<Icon as={FaGoogle as React.ElementType} />}
                            colorScheme="blue" // You might want to adjust the color scheme
                            variant="outline"
                            w="100%"
                            onClick={onGoogleLogin}
                            mt={2}
                        >
                            Sign in with Google
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default AuthModal;