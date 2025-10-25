import React, { useState } from 'react';
import {
    Box,
    VStack,
    Text,
    Button,
    Input,
    FormControl,
    FormLabel,
    FormErrorMessage,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
} from '@chakra-ui/react';
import { useAppSelector } from '../../../store/hooks';

const SpecialistCallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
                                                                                     isOpen,
                                                                                     onClose,
                                                                                 }) => {
    const user = useAppSelector((state) => state.user);
    const [enteredPhoneNumber, setEnteredPhoneNumber] = useState(user.mobile || '');
    const [callbackRequested, setCallbackRequested] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const toast = useToast();

    const handleRequestCallback = async (phone: string) => {
        if (!phone.trim()) {
            toast({
                title: 'Phone number required',
                description: 'Please enter a phone number.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        setCallbackRequested(true);
        try {
            const response = await fetch('/api/property/request-callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user && user.isLoggedIn ? user.user_id : null,
                    phoneNumber: phone,
                    requestedAt: new Date().toISOString(),
                }),
            });
            if (!response.ok) {
                throw new Error('Request failed');
            }
            toast({
                title: 'Request Sent',
                description: 'A specialist will reach out to you shortly.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Unable to process your request. Please try again later.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCallbackRequested(false);
        }
    };

    const renderModalContent = () => (
        <VStack spacing={4}>
            <Box textAlign="center">
                <Text fontWeight="bold">Call us directly</Text>
                <Text fontSize="xl" fontWeight="bold" color="teal.500">
                    310-689-8695
                </Text>
            </Box>
            <Text textAlign="center">or</Text>
            <VStack spacing={4} width="100%">
                <FormControl isInvalid={!!errorMessage}>
                    <FormLabel alignContent="center" htmlFor="phone-number">Phone Number</FormLabel>
                    <Input
                        id="phone-number"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={enteredPhoneNumber}
                        onChange={(e) => setEnteredPhoneNumber(e.target.value)}
                    />
                    {errorMessage && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
                </FormControl>
                <Button
                    colorScheme="teal"
                    isLoading={callbackRequested}
                    onClick={() => handleRequestCallback(enteredPhoneNumber)}
                >
                    Confirm Callback Request
                </Button>
                <br/>
            </VStack>
        </VStack>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Speak Directly To A Specialist!</ModalHeader>
                <ModalCloseButton />
                <ModalBody>{renderModalContent()}</ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default SpecialistCallModal;
