import React, { useState, useEffect } from 'react';
import {
    Box,
    Heading,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Button,
    useToast,
    HStack,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setUserData } from '../../store/userSlice';
import { useNavigate } from 'react-router-dom';

const AccountSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const dispatch = useAppDispatch();

    // Retrieve user data from Redux (which is set by your login handler)
    const { user_id, fname, lname, email, mobile } = useAppSelector((state) => state.user);

    // Local state for editable form fields
    const [firstName, setFirstName] = useState(fname);
    const [lastName, setLastName] = useState(lname);
    const [mobileNumber, setMobileNumber] = useState(mobile);

    // Determines if fields are in editing mode (editable) or read-only
    const [isEditing, setIsEditing] = useState(false);

    // When Redux user data changes, update the local state
    useEffect(() => {
        setFirstName(fname);
        setLastName(lname);
        setMobileNumber(mobile);
    }, [fname, lname, mobile]);

    // Check if any changes have been made compared to the original values from Redux
    const hasChanges =
        firstName !== fname || lastName !== lname || mobileNumber !== mobile;
    // Check if all editable fields are empty (using fallback empty strings to avoid errors)
    const isEmpty =
        !((firstName || '').trim() || (lastName || '').trim() || (mobileNumber || '').trim());

    // Handler to update the profile on the backend
    const handleUpdateProfile = async () => {
        if (!user_id) {
            toast({
                title: 'User id is missing',
                description: 'User id is required to update profile.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        // Construct payload matching what the backend expects
        const payload = {
            user_id, // the user id from the Redux store
            email, // email remains the same
            first_name: firstName,
            last_name: lastName,
            mobile_number: mobileNumber,
        };

        try {
            const response = await fetch('/api/auth/profile-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok) {
                toast({
                    title: 'Error updating profile',
                    description: data.message || 'An error occurred',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                const updatedUser = {
                    user_id: data.user.user_id,
                    fname: data.user.first_name, // mapping backend key to Redux key
                    lname: data.user.last_name,
                    email: data.user.email,
                    mobile: data.user.mobile_number,
                };
                // Update the Redux store with the new user data returned from the backend
                dispatch(setUserData(updatedUser));
                setFirstName(updatedUser.fname);
                setLastName(updatedUser.lname);
                setMobileNumber(updatedUser.mobile);
                toast({
                    title: 'Profile updated successfully',
                    description: 'Your profile has been updated',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                // Exit editing mode
                setIsEditing(false);
            }
        } catch (error) {
            toast({
                title: 'Network error',
                description: 'Unable to update profile',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handle button click: if not editing, toggle to edit mode; if editing, then update if changes exist
    const handleButtonClick = async () => {
        if (!isEditing) {
            setIsEditing(true);
        } else {
            if (hasChanges) {
                // Only attempt to update if fields are not all empty
                if (!isEmpty) {
                    await handleUpdateProfile();
                }
            } else {
                // If no changes were made, revert local state and exit editing mode
                setFirstName(fname);
                setLastName(lname);
                setMobileNumber(mobile);
                setIsEditing(false);
            }
        }
    };

    // Button label depends on whether we're editing and if there are changes
    const buttonLabel = !isEditing
        ? 'Edit Profile'
        : hasChanges
            ? 'Update Profile'
            : 'Edit Profile';

    return (
        <Box p={8} maxW="600px" mx="auto">
            <Heading as="h2" size="lg" mb={6}>
                Account Settings
            </Heading>
            <VStack spacing={4}>
                <FormControl id="fname">
                    <FormLabel>First Name</FormLabel>
                    <Input
                        placeholder="Not provided"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        isReadOnly={!isEditing}
                    />
                </FormControl>
                <FormControl id="lname">
                    <FormLabel>Last Name</FormLabel>
                    <Input
                        placeholder="Not provided"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        isReadOnly={!isEditing}
                    />
                </FormControl>
                <FormControl id="email">
                    <FormLabel>Email</FormLabel>
                    <Input placeholder="Not available" value={email || ''} isReadOnly />
                </FormControl>
                <FormControl id="mobile">
                    <FormLabel>Mobile Number</FormLabel>
                    <Input
                        placeholder="Not provided"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        isReadOnly={!isEditing}
                    />
                </FormControl>
                <HStack>
                    <Button
                        colorScheme="teal"
                        onClick={handleButtonClick}
                        isDisabled={isEditing && hasChanges && isEmpty}
                    >
                        {buttonLabel}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/estimate')}>
                        Go Back
                    </Button>
                </HStack>
            </VStack>
        </Box>
    );
};

export default AccountSettingsPage;
