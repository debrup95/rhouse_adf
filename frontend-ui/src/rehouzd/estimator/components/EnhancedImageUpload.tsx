import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
    Box,
    Text,
    Button,
    VStack,
    HStack,
    useColorModeValue,
    Icon,
    Progress,
    SimpleGrid,
    Image,
    IconButton,
    Tooltip,
    FormControl,
    FormLabel,
    FormErrorMessage,
    useDisclosure,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    CloseButton,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FaTrash, FaGoogle, FaTimes } from 'react-icons/fa';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import GooglePhotosSelector from '../estimates/components/GooglePhotosSelector';
import { uploadGooglePhotosToAzure } from '../services/googlePhotosService';
import { useAppSelector } from '../store/hooks';
import config from '../../../config';

interface UploadedImage {
    id: string;
    url: string;
    name: string;
    type: 'file' | 'url' | 'google';
    file?: File;
}

interface EnhancedImageUploadProps {
    label?: string;
    isRequired?: boolean;
    isInvalid?: boolean;
    errorMessage?: string;
    propertyAddress: string;
    propertyId?: string;
    type?: 'property' | 'underwrite' | 'getoffer';
    maxImages?: number;
    onImagesChange?: (images: UploadedImage[]) => void;
    value?: UploadedImage[];
}

const EnhancedImageUpload: React.FC<EnhancedImageUploadProps> = ({
    label = "Upload Photos",
    isRequired = false,
    isInvalid = false,
    errorMessage,
    propertyAddress,
    propertyId,
    type = 'property',
    maxImages = 10,
    onImagesChange,
    value = []
}) => {
    const [images, setImages] = useState<UploadedImage[]>(value);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
    const [uploadWarningMessage, setUploadWarningMessage] = useState<string | null>(null);
    const user = useAppSelector(state => state.user);

    // Modal states
    const {
        isOpen: isGooglePhotosModalOpen,
        onOpen: onOpenGooglePhotosModal,
        onClose: onCloseGooglePhotosModal
    } = useDisclosure();

    // Theme colors
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const hoverBorderColor = useColorModeValue('blue.400', 'blue.300');
    const bgColor = useColorModeValue('gray.50', 'gray.800');

    // Sync local state with prop value
    useEffect(() => {
        setImages(value);
    }, [value]);

    // Update parent component when images change
    const updateImages = (newImages: UploadedImage[]) => {
        setImages(newImages);
        onImagesChange?.(newImages);
    };

    // Upload files to Azure Blob Storage
    const uploadFilesToAzure = async (files: File[]): Promise<UploadedImage[]> => {
        const formData = new FormData();
        
        // Add files to form data
        files.forEach((file, index) => {
            formData.append('images', file);
        });
        
        // Add metadata
        formData.append('userId', user?.user_id?.toString() || '');
        formData.append('propertyAddress', propertyAddress);
        formData.append('type', type);

        const response = await fetch(`${config.apiUrl}/api/property/images/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMessage = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                // If response is not JSON, try to get text
                try {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                } catch (textError) {
                    // Use default error message
                }
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // Create UploadedImage objects with Azure URLs
        return files.map((file, index) => ({
            id: `azure-${Date.now()}-${index}`,
            url: result.imageUrls[index],
            name: file.name,
            type: 'file' as const
        }));
    };

    // Handle file drop
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        // Check if we're already at the limit
        if (images.length >= maxImages) {
            setUploadWarningMessage(`Maximum ${maxImages} images allowed. Please remove some images first.`);
            setTimeout(() => {
                setUploadWarningMessage(null);
            }, 3000);
            return;
        }

        const remainingSlots = maxImages - images.length;
        const filesToAdd = acceptedFiles.slice(0, remainingSlots);
        const rejectedCount = acceptedFiles.length - filesToAdd.length;

        if (filesToAdd.length === 0) {
            setUploadWarningMessage(`Maximum ${maxImages} images allowed. Please remove some images first.`);
            setTimeout(() => {
                setUploadWarningMessage(null);
            }, 3000);
            return;
        }

        try {
            setIsUploading(true);
            setUploadErrorMessage(null); // Clear any previous errors
            setUploadSuccessMessage(`Uploading ${filesToAdd.length} image(s)...`);

            // Upload files to Azure Blob Storage
            const uploadedImages = await uploadFilesToAzure(filesToAdd);
            
            // Update images state with new uploads
            const newImagesList = [...images, ...uploadedImages];
            updateImages(newImagesList);

            // Show success message
            let successMsg = `Successfully uploaded ${filesToAdd.length} image(s)`;
            if (rejectedCount > 0) {
                successMsg += `. ${rejectedCount} image(s) rejected due to limit.`;
            }
            
            setUploadSuccessMessage(successMsg);
            setTimeout(() => {
                setUploadSuccessMessage(null);
            }, 5000);

        } catch (error) {
            setUploadErrorMessage(error instanceof Error ? error.message : 'Failed to upload images');
            setTimeout(() => {
                setUploadErrorMessage(null);
            }, 5000);
        } finally {
            setIsUploading(false);
        }

        // Show warning if some files were rejected
        if (rejectedCount > 0) {
            setUploadWarningMessage(`${rejectedCount} image(s) were not uploaded due to the ${maxImages} image limit.`);
            setTimeout(() => {
                setUploadWarningMessage(null);
            }, 3000);
        }
    }, [images.length, maxImages, user?.user_id, propertyAddress, type]);

    // Handle rejected files (file size, type, etc.)
    const onDropRejected = useCallback((rejectedFiles: any[]) => {
        const errors: string[] = [];
        
        rejectedFiles.forEach(({ file, errors: fileErrors }) => {
            fileErrors.forEach((error: any) => {
                switch (error.code) {
                    case 'file-too-large':
                        errors.push(`"${file.name}" is too large. Maximum size is 10MB.`);
                        break;
                    case 'file-invalid-type':
                        errors.push(`"${file.name}" is not a supported image type. Supported: JPEG, PNG, GIF, WebP.`);
                        break;
                    case 'too-many-files':
                        errors.push(`Too many files selected. Maximum ${maxImages} images allowed.`);
                        break;
                    default:
                        errors.push(`"${file.name}" was rejected: ${error.message}`);
                        break;
                }
            });
        });

        if (errors.length > 0) {
            setUploadErrorMessage(errors.join('\n'));
            setTimeout(() => {
                setUploadErrorMessage(null);
            }, 7000); // Show for 7 seconds since it might be a longer message
        }
    }, [maxImages]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            'image/webp': ['.webp']
        },
        maxSize: 10485760, // 10MB
        disabled: isUploading || images.length >= maxImages,
        noClick: isUploading || images.length >= maxImages,
        noDrag: isUploading || images.length >= maxImages
    });

    // Remove image
    const removeImage = async (id: string) => {
        const imageToRemove = images.find(img => img.id === id);
        
        if (imageToRemove) {
            // If it's a blob URL, revoke it
            if (imageToRemove.type === 'file' && imageToRemove.url.startsWith('blob:')) {
                URL.revokeObjectURL(imageToRemove.url);
            }
            
            // If it's an Azure URL (SAS URL), delete from Azure Blob Storage
            if (imageToRemove.url.includes('blob.core.windows.net') || imageToRemove.url.includes('azure')) {
                try {
                    // Extract blob information from the URL
                    const url = new URL(imageToRemove.url);
                    const pathParts = url.pathname.split('/');
                    const containerName = pathParts[1]; // e.g., 'rehouzd-media'
                    const blobPath = pathParts.slice(2).join('/'); // e.g., 'underwrite/temp-123-1234567890/image.jpg'
                    
                    // Remove SAS token from blob path
                    const cleanBlobPath = blobPath.split('?')[0];
                    
                    // Call backend to delete the blob
                    const response = await fetch(`${config.apiUrl}/api/property/images/delete`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            containerName,
                            blobName: cleanBlobPath,
                            userId: user?.user_id
                        }),
                    });
                    

                } catch (error) {
                    // Silently handle Azure deletion error
                }
            }
        }
        
        // Remove from local state
        const newImages = images.filter(img => img.id !== id);
        updateImages(newImages);
    };

    // Handle Google Photos selection
    const handleGooglePhotosSelection = async (photos: { url: string; id: string; filename: string }[]) => {
        if (photos.length === 0) return;

        // Check if we're already at the limit
        if (images.length >= maxImages) {
            setUploadWarningMessage(`Maximum ${maxImages} images allowed. Please remove some images first.`);
            setTimeout(() => {
                setUploadWarningMessage(null);
            }, 3000);
            return;
        }

        const remainingSlots = maxImages - images.length;
        const photosToAdd = photos.slice(0, remainingSlots);
        const rejectedCount = photos.length - photosToAdd.length;

        try {
            setIsUploading(true);
            setUploadErrorMessage(null); // Clear any previous errors
            setUploadSuccessMessage(`Processing ${photosToAdd.length} photos from Google Photos...`);

            // Get property ID (you may need to adjust this based on your property structure)
            const propId = propertyId || 'temp-property-id';
            const userId = user?.user_id;

            // Convert photos to the format expected by the service
            const googlePhotos = photosToAdd.map(photo => ({
                id: photo.id,
                url: photo.url,
                filename: photo.filename
            }));

            // Upload to Azure Blob Storage
            const result = await uploadGooglePhotosToAzure(
                googlePhotos,
                propId,
                propertyAddress,
                userId
            );

            if (result.success) {
                // Create image objects from the uploaded photos
                const newImages: UploadedImage[] = photosToAdd.map((photo, index) => ({
                    id: `google-${Date.now()}-${index}`,
                    url: result.azureUrls?.[index] || photo.url,
                    name: photo.filename,
                    type: 'google'
                }));

                // Update images state with new uploads
                const newImagesList = [...images, ...newImages];
                updateImages(newImagesList);

                // Show success message
                let successMsg = `${photosToAdd.length} photos added from Google Photos`;
                if (rejectedCount > 0) {
                    successMsg += `. ${rejectedCount} photo(s) rejected due to limit.`;
                }
                
                setUploadSuccessMessage(successMsg);
                setTimeout(() => {
                    setUploadSuccessMessage(null);
                }, 5000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            setUploadErrorMessage(error instanceof Error ? error.message : 'Failed to process photos');
            setTimeout(() => {
                setUploadErrorMessage(null);
            }, 5000);
        } finally {
            setIsUploading(false);
        }

        // Show warning if some photos were rejected
        if (rejectedCount > 0) {
            setUploadWarningMessage(`${rejectedCount} photo(s) were not added due to the ${maxImages} image limit.`);
            setTimeout(() => {
                setUploadWarningMessage(null);
            }, 3000);
        }
    };

    return (
        <FormControl isRequired={isRequired} isInvalid={isInvalid}>
            <FormLabel>{label}</FormLabel>
            
            {/* Upload Error Message */}
            {uploadErrorMessage && (
                <Alert status="error" borderRadius="md" mb={2}>
                    <AlertIcon />
                    <Box flex="1">
                        <AlertTitle mr={2}>Upload Failed!</AlertTitle>
                        <AlertDescription>
                            {uploadErrorMessage.split('\n').map((line, index) => (
                                <Text key={index} mb={index < uploadErrorMessage.split('\n').length - 1 ? 1 : 0}>
                                    {line}
                                </Text>
                            ))}
                        </AlertDescription>
                    </Box>
                    <CloseButton
                        alignSelf="flex-start"
                        position="relative"
                        right={-1}
                        top={-1}
                        onClick={() => setUploadErrorMessage(null)}
                    />
                </Alert>
            )}

            {/* Upload Success Message */}
            {uploadSuccessMessage && (
                <Alert status="success" borderRadius="md" mb={2}>
                    <AlertIcon />
                    <Box flex="1">
                        <AlertTitle mr={2}>Success!</AlertTitle>
                        <AlertDescription>{uploadSuccessMessage}</AlertDescription>
                    </Box>
                    <CloseButton
                        alignSelf="flex-start"
                        position="relative"
                        right={-1}
                        top={-1}
                        onClick={() => setUploadSuccessMessage(null)}
                    />
                </Alert>
            )}

            {/* Upload Warning Message */}
            {uploadWarningMessage && (
                <Alert status="warning" borderRadius="md" mb={2}>
                    <AlertIcon />
                    <Box flex="1">
                        <AlertTitle mr={2}>Warning!</AlertTitle>
                        <AlertDescription>{uploadWarningMessage}</AlertDescription>
                    </Box>
                    <CloseButton
                        alignSelf="flex-start"
                        position="relative"
                        right={-1}
                        top={-1}
                        onClick={() => setUploadWarningMessage(null)}
                    />
                </Alert>
            )}
            
            <VStack spacing={4} align="stretch">
                {/* Main upload area with embedded thumbnails */}
                <Box
                    {...getRootProps()}
                    border="2px dashed"
                    borderColor={isDragActive ? hoverBorderColor : borderColor}
                    borderRadius="md"
                    p={6}
                    textAlign="center"
                    bg={isDragActive ? bgColor : 'transparent'}
                    cursor={isUploading || images.length >= maxImages ? 'not-allowed' : 'pointer'}
                    opacity={isUploading || images.length >= maxImages ? 0.5 : 1}
                    transition="all 0.2s"
                    _hover={{
                        borderColor: isUploading || images.length >= maxImages ? borderColor : hoverBorderColor,
                        bg: isUploading || images.length >= maxImages ? 'transparent' : bgColor
                    }}
                    minHeight="200px"
                >
                    <input {...getInputProps()} />
                    
                    {images.length === 0 ? (
                        // Show upload instructions when no images
                        <>
                            <Icon as={AiOutlineCloudUpload as React.ElementType} color="blue.500" boxSize={12} mb={2} />
                            <Text color="gray.600" mb={1}>
                                {isDragActive ? 'Drop the images here...' : 'Drag & Drop images here'}
                            </Text>
                            <Text color="gray.500" fontSize="sm">
                                or click to browse ({images.length}/{maxImages} images)
                            </Text>
                            <Text color="gray.400" fontSize="xs" mt={2}>
                                Supports JPEG, PNG, GIF, WebP (max 10MB each)
                            </Text>
                            <Text color="gray.500" fontSize="xs" mt={1} fontWeight="medium">
                                File size limit: 10MB per image
                            </Text>
                        </>
                    ) : (
                        // Show thumbnails when images are present (regardless of limit)
                        <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={4} color="gray.600">
                                Selected Images ({images.length}/{maxImages}) - {images.length < maxImages ? 'Click here or drag more images to add' : 'Maximum limit reached'}
                            </Text>
                            {images.length >= maxImages && (
                                <Text fontSize="sm" color="orange.500" mb={3} fontWeight="medium">
                                    Maximum {maxImages} images reached. Remove some images to add more.
                                </Text>
                            )}
                            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
                                {images.map((image) => (
                                    <Box key={image.id} position="relative">
                                        <Image
                                            src={image.url}
                                            alt={image.name}
                                            objectFit="cover"
                                            width="100px"
                                            height="100px"
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor="gray.200"
                                        />
                                        <Tooltip label={`Remove ${image.name}`}>
                                            <IconButton
                                                aria-label="Remove image"
                                                icon={<Icon as={FaTimes as React.ElementType} />}
                                                size="sm"
                                                colorScheme="red"
                                                position="absolute"
                                                top={1}
                                                right={1}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(image.id);
                                                }}
                                                isDisabled={isUploading}
                                            />
                                        </Tooltip>
                                        <Text
                                            fontSize="xs"
                                            color="gray.600"
                                            mt={1}
                                            noOfLines={1}
                                            textAlign="center"
                                        >
                                            {image.name}
                                        </Text>
                                        <Text
                                            fontSize="xs"
                                            color="gray.400"
                                            textAlign="center"
                                        >
                                            {image.type === 'file' ? 'File' : 
                                             image.type === 'url' ? 'URL' : 'Google Photos'}
                                        </Text>
                                    </Box>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}
                </Box>

                {/* Action buttons
                <HStack spacing={2}>
                    <Button
                        leftIcon={<Icon as={FaGoogle as React.ElementType} />}
                        onClick={onOpenGooglePhotosModal}
                        colorScheme="red"
                        variant="outline"
                        size="sm"
                        flex={1}
                        isDisabled={images.length >= maxImages || isUploading}
                    >
                        Google Photos
                    </Button>
                </HStack> */}

                {/* Loading state */}
                {isUploading && (
                    <Box>
                        <Progress isIndeterminate colorScheme="blue" size="sm" />
                        <Text fontSize="sm" color="gray.600" mt={1} textAlign="center">
                            Processing images...
                        </Text>
                    </Box>
                )}
            </VStack>

            {isInvalid && <FormErrorMessage>{errorMessage}</FormErrorMessage>}

            {/* Google Photos Selector Modal */}
            <GooglePhotosSelector
                isOpen={isGooglePhotosModalOpen}
                onClose={onCloseGooglePhotosModal}
                onSelectPhotos={handleGooglePhotosSelection}
            />
        </FormControl>
    );
};

export default EnhancedImageUpload; 