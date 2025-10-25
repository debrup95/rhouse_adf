import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    Text,
    Button,
    Input,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Checkbox,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    CloseButton,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setUserData } from '../../store/userSlice';
import CommonModal from '../../components/CommonModal';
import { isValidPhoneNumber, formatPhoneNumber } from '../../utils/validationUtils';
import config from '../../../../config';

const SpecialistCallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
                                                                                     isOpen,
                                                                                     onClose,
                                                                                 }) => {
    const user = useAppSelector((state) => state.user);
    const addressState = useAppSelector((state) => state.address);
    const dispatch = useAppDispatch();
    const [enteredPhoneNumber, setEnteredPhoneNumber] = useState(user.mobile || '');
    const [callbackRequested, setCallbackRequested] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [saveToProfile, setSaveToProfile] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setEnteredPhoneNumber(user.mobile || '');
            setErrorMessage('');
            setTouchedFields({});
        }
    }, [isOpen, user.mobile]);

    useEffect(() => {
        if (enteredPhoneNumber === user.mobile) {
            setSaveToProfile(false);
        }
    }, [enteredPhoneNumber, user.mobile]);

    const shouldShowSaveOption = () => {
        return user.isLoggedIn && enteredPhoneNumber && enteredPhoneNumber !== user.mobile;
    };

    const validatePhoneNumber = () => {
        if (!enteredPhoneNumber.trim()) {
            setErrorMessage('Phone number is required');
            return false;
        }
        if (!isValidPhoneNumber(enteredPhoneNumber)) {
            setErrorMessage('Please enter a valid phone number');
            return false;
        }
        setErrorMessage('');
        return true;
    };

    const handleBlur = () => {
        setTouchedFields({ ...touchedFields, phoneNumber: true });
        validatePhoneNumber();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // Only update if input is empty or contains only digits, spaces, dashes, parentheses, or plus sign
        if (input === '' || /^[0-9\s\-\(\)\+]*$/.test(input)) {
            setEnteredPhoneNumber(input);
        }
    };

    const updateUserPhoneNumber = async (phoneNumber: string) => {
        try {
            // Convert user_id from string to number
            const userId = parseInt(user.user_id, 10);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const response = await fetch(`${config.apiUrl}/api/auth/profile-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, 
                    email: user.email,
                    first_name: user.fname,
                    last_name: user.lname,
                    mobile_number: phoneNumber,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const data = await response.json();
            dispatch(setUserData({
                ...user,
                mobile: data.user.mobile_number,
            }));

            setAlertMessage({ type: 'success', message: 'Your profile has been updated with the new phone number' });
            setTimeout(() => setAlertMessage(null), 3000);
        } catch (error) {
            // Error updating phone number
            setAlertMessage({ type: 'error', message: 'Failed to update your profile' });
            setTimeout(() => setAlertMessage(null), 3000);
        }
    };

    const handleRequestCallback = async (phone: string) => {
        if (!validatePhoneNumber()) {
            setTouchedFields({ phoneNumber: true });
            return;
        }

        setCallbackRequested(true);
        try {
            // Convert user_id to number if user is logged in, otherwise use null
            const userId = user && user.isLoggedIn && user.user_id ? parseInt(user.user_id, 10) : null;
            
            // Get property address from Redux store
            const propertyAddress = addressState.formattedAddress || '';

            const response = await fetch(`${config.apiUrl}/api/specialist-callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId, // Send as number or null
                    phoneNumber: phone,
                    propertyAddress: propertyAddress, // Add property address
                    requestedAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            if (saveToProfile && shouldShowSaveOption()) {
                await updateUserPhoneNumber(phone);
            }

            const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
            await sleep(3000)

            setAlertMessage({ type: 'success', message: 'A specialist will reach out to you shortly.' });
            setTimeout(() => {
                setAlertMessage(null);
                onClose();
            }, 2000);
        } catch (error) {
            setAlertMessage({ type: 'error', message: 'Unable to process your request. Please try again later.' });
            setTimeout(() => setAlertMessage(null), 5000);
        } finally {
            setCallbackRequested(false);
            setSaveToProfile(false);
        }
    };

    const renderModalContent = () => (
        <VStack spacing={4}>
            <Box textAlign="center">
                <Text fontWeight="bold" fontSize="lg">Call us directly</Text>
                <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                    310-689-8695
                </Text>
            </Box>
            <Text textAlign="center">or</Text>
            
            {/* Alert Message */}
            {alertMessage && (
                <Alert status={alertMessage.type} borderRadius="md" mb={4}>
                    <AlertIcon />
                    <Box flex="1">
                        <AlertTitle mr={2}>{alertMessage.type === 'success' ? 'Success!' : 'Error!'}</AlertTitle>
                        <AlertDescription>{alertMessage.message}</AlertDescription>
                    </Box>
                    <CloseButton
                        alignSelf="flex-start"
                        position="relative"
                        right={-1}
                        top={-1}
                        onClick={() => setAlertMessage(null)}
                    />
                </Alert>
            )}
            
            <VStack spacing={4} width="100%">
                <FormControl isInvalid={touchedFields.phoneNumber && !!errorMessage}>
                    <FormLabel htmlFor="phone-number">Phone Number</FormLabel>
                    <Input
                        id="phone-number"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={enteredPhoneNumber}
                        onChange={handlePhoneChange}
                        onBlur={handleBlur}
                        borderColor="border.primary"
                        _hover={{ borderColor: 'brand.500' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px brand.500` }}
                    />
                    {touchedFields.phoneNumber && errorMessage && (
                        <FormErrorMessage>{errorMessage}</FormErrorMessage>
                    )}
                </FormControl>

                {shouldShowSaveOption() && (
                    <Checkbox
                        colorScheme="teal"
                        isChecked={saveToProfile}
                        onChange={(e) => setSaveToProfile(e.target.checked)}
                        alignSelf="flex-start"
                    >
                        Save this number to my profile
                    </Checkbox>
                )}

                <Button
                    bg="green.800"
                    color="white"
                    isLoading={callbackRequested}
                    onClick={() => handleRequestCallback(enteredPhoneNumber)}
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
                    Confirm Callback Request
                </Button>
                <br/>
            </VStack>
        </VStack>
    );

    return (
        <CommonModal isOpen={isOpen} onClose={onClose} title="Speak Directly To A Specialist!">
            {renderModalContent()}
        </CommonModal>
    );
};

export default SpecialistCallModal;