// ImageUploadModal.tsx
import React, { useCallback, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Box,
    Text,
    Button,
    VStack,
    HStack,
    useColorModeValue, Icon,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import {FaArrowLeft, FaUpload} from 'react-icons/fa';

interface ImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleUpload = () => {
        onUpload(files);
        // Optionally clear the list:
        setFiles([]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Upload Images</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Box
                        {...getRootProps()}
                        border="2px dashed"
                        borderColor={useColorModeValue('gray.400', 'gray.600')}
                        borderRadius="md"
                        p={8}
                        textAlign="center"
                        cursor="pointer"
                        bg={isDragActive ? useColorModeValue('gray.200', 'gray.700') : 'transparent'}
                    >
                        <input {...getInputProps()} />
                        {isDragActive ? (
                            <Text>Drop the files here ...</Text>
                        ) : (
                            <Text>
                                Drag & drop some files here, or click to select files
                            </Text>
                        )}
                    </Box>
                    {files.length > 0 && (
                        <VStack align="start" mt={4}>
                            <Text fontWeight="bold">Files to be uploaded:</Text>
                            {files.map((file, idx) => (
                                <HStack key={idx} spacing={2}>
                                    <Text fontSize="sm">
                                        {file.name} ({Math.round(file.size / 1024)} KB)
                                    </Text>
                                </HStack>
                            ))}
                        </VStack>
                    )}
                    <HStack mt={6} justify="flex-end">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="teal"
                            leftIcon={<Icon as={FaUpload as React.ElementType} />}
                            onClick={handleUpload}
                            isDisabled={files.length === 0}
                        >
                            Upload
                        </Button>
                    </HStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default ImageUploadModal;
