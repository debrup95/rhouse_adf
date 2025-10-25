import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Input,
    HStack,
    Text,
    Button,
    VStack,
    useColorModeValue,
    FormControl,
    FormLabel,
    FormErrorMessage,
} from '@chakra-ui/react';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (otp: string) => void;
    onComplete?: (otp: string) => void;
    isInvalid?: boolean;
    errorMessage?: string;
    email?: string;
    onResendCode?: () => void;
    isResending?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
    length = 6,
    value,
    onChange,
    onComplete,
    isInvalid = false,
    errorMessage,
    email,
    onResendCode,
    isResending = false
}) => {
    const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Theme colors
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const focusColor = useColorModeValue('blue.500', 'blue.300');
    const errorColor = useColorModeValue('red.500', 'red.300');
    const bgColor = useColorModeValue('white', 'gray.800');

    // Update internal state when value prop changes
    useEffect(() => {
        const newOtp = value.split('').concat(Array(length).fill('')).slice(0, length);
        setOtp(newOtp);
    }, [value, length]);

    const handleChange = (index: number, digit: string) => {
        // Only allow numbers
        if (!/^\d*$/.test(digit)) return;

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        const otpString = newOtp.join('');
        onChange(otpString);

        // Auto-focus next input
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Call onComplete when all digits are filled
        if (otpString.length === length && onComplete) {
            onComplete(otpString);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Focus previous input on backspace if current is empty
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, length).split('');
        
        const newOtp = [...Array(length).fill('')];
        digits.forEach((digit, index) => {
            newOtp[index] = digit;
        });
        
        setOtp(newOtp);
        onChange(newOtp.join(''));
        
        // Focus the next empty input or the last input
        const nextIndex = Math.min(digits.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
    };

    return (
        <VStack spacing={4} align="stretch">
            <FormControl isInvalid={isInvalid}>
                <Box textAlign="center" mb={4}>
                    <Text fontSize="xl" fontWeight="semibold" mb={2}>
                        Reset Password
                    </Text>
                    {email && (
                        <Text fontSize="sm" color="gray.600">
                            Enter the verification code sent to
                        </Text>
                    )}
                    {email && (
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">
                            {email}
                        </Text>
                    )}
                </Box>

                <HStack spacing={3} justify="center" mb={4}>
                    {Array.from({ length }, (_, index) => (
                        <Input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            value={otp[index]}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            maxLength={1}
                            textAlign="center"
                            fontSize="lg"
                            fontWeight="bold"
                            width="50px"
                            height="50px"
                            borderColor={isInvalid ? errorColor : borderColor}
                            borderWidth={2}
                            borderRadius="md"
                            bg={bgColor}
                            _focus={{
                                borderColor: isInvalid ? errorColor : focusColor,
                                boxShadow: `0 0 0 1px ${isInvalid ? errorColor : focusColor}`,
                            }}
                            _hover={{
                                borderColor: isInvalid ? errorColor : 'gray.400',
                            }}
                        />
                    ))}
                </HStack>

                {isInvalid && errorMessage && (
                    <FormErrorMessage justifyContent="center">
                        {errorMessage}
                    </FormErrorMessage>
                )}
            </FormControl>

            {onResendCode && (
                <Box textAlign="center">
                    <Button
                        variant="link"
                        colorScheme="blue"
                        fontSize="sm"
                        onClick={onResendCode}
                        isLoading={isResending}
                        loadingText="Sending..."
                    >
                        Resend Code
                    </Button>
                </Box>
            )}
        </VStack>
    );
};

export default OTPInput; 