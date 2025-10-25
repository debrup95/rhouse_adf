import React, { ChangeEvent, useState } from 'react';
import {
    Box,
    Heading,
    Input,
    HStack,
    Button,
    Spacer,
    Text,
    FormControl,
    useColorModeValue, Icon
} from '@chakra-ui/react';
import { FaArrowLeft } from 'react-icons/fa';

interface UploadImagesStepProps {
    selectedFiles: () => void;
    onUploadImages: () => void;
    onSkipUpload: () => void;
    onBack: () => void;
}

const UploadImagesStep: React.FC<UploadImagesStepProps> = ({
                                                               selectedFiles,
                                                               onUploadImages,
                                                               onSkipUpload,
                                                               onBack,
                                                           }) => {
    // Change type to File[] so we store an array of files.
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            // Convert FileList to an array of File
            const files = Array.from(event.target.files);
            setUploadedImages(files);
            console.log('Uploaded Images:', files);
        }
    };

    return (
        <Box mt={8} w="100%">
            <Heading size="lg" mb={4} color={useColorModeValue('gray.800', 'white')}>
                Upload Images
            </Heading>
            <FormControl>
                <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderRadius="md"
                    p={2}
                />
            </FormControl>
            {uploadedImages.length > 0 && (
                <Box mt={4}>
                    <Text fontWeight="bold" mb={2}>
                        Uploaded Images:
                    </Text>
                    <HStack spacing={2}>
                        {uploadedImages.map((file, index) => (
                            <Text key={index} fontSize="sm">
                                {file.name} ({Math.round(file.size / 1024)} KB)
                            </Text>
                        ))}
                    </HStack>
                </Box>
            )}
            <HStack mt={6} w="100%">
                <Button
                    variant="outline"
                    onClick={onBack}
                    flex="1"
                    leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
                >
                    Back
                </Button>
                <Spacer />
                <Button colorScheme="teal" flex="1" onClick={onUploadImages}>
                    Upload Images
                </Button>
                <Button variant="outline" flex="1" onClick={onSkipUpload}>
                    Skip
                </Button>
            </HStack>
        </Box>
    );
};

export default UploadImagesStep;
