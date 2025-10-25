import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Image,
  Flex,
  IconButton,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

export interface GalleryImage {
  src: string;
  alt: string;
  isExterior?: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  condition: string;
  isOpen?: boolean;
  onClose?: () => void;
  initialIndex?: number;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  condition,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  initialIndex = 0
}) => {
  // Use internal state if external props aren't provided
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(initialIndex);
  
  // Determine if we're using external or internal modal state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const onClose = externalOnClose || (() => setInternalIsOpen(false));
  
  // Find the exterior image index, defaulting to 0 if not found
  const exteriorIndex = images.findIndex(img => img.isExterior) !== -1 
    ? images.findIndex(img => img.isExterior) 
    : 0;
  
  // Set the main display image (not in the modal)
  const [mainDisplayIndex, setMainDisplayIndex] = useState(exteriorIndex);
  
  // Reset current image when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen && isControlled) {
      setCurrentImageIndex(initialIndex);
    }
  }, [isOpen, isControlled, initialIndex]);
  
  // Use theme colors directly
  const borderColor = 'border.primary';
  const activeBorderColor = 'brand.500';
  const bgColor = 'background.primary';
  
  const handlePrevious = useCallback(() => {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);
  
  const handleNext = useCallback(() => {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);
  
  const handleThumbnailClick = useCallback((index: number) => {
    if (isOpen) {
      setCurrentImageIndex(index);
    } else {
      setMainDisplayIndex(index);
    }
  }, [isOpen]);
  
  const handleImageClick = useCallback(() => {
    setCurrentImageIndex(mainDisplayIndex);
    if (!isControlled) {
      setInternalIsOpen(true);
    }
  }, [mainDisplayIndex, isControlled]);

  // If we're only being used as a modal (controlled)
  if (isControlled) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg={bgColor} p={4}>
          <ModalCloseButton zIndex={2} />
          <ModalBody p={0}>
            <Flex direction="column" align="center">
              <Box position="relative" width="100%" height="70vh">
                <Image
                  src={images[currentImageIndex].src}
                  alt={images[currentImageIndex].alt}
                  width="100%"
                  height="100%"
                  objectFit="contain"
                />
                
                <IconButton
                  aria-label="Previous image"
                  icon={<ChevronLeftIcon boxSize={8} />}
                  position="absolute"
                  left={2}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={handlePrevious}
                  colorScheme="blackAlpha"
                  borderRadius="full"
                />
                
                <IconButton
                  aria-label="Next image"
                  icon={<ChevronRightIcon boxSize={8} />}
                  position="absolute"
                  right={2}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={handleNext}
                  colorScheme="blackAlpha"
                  borderRadius="full"
                />
              </Box>
              
              <HStack spacing={2} mt={4} overflowX="auto" width="100%" justifyContent="center" py={2}>
                {images.map((image, index) => (
                  <Box
                    key={`modal-thumb-${index}`}
                    borderWidth="2px"
                    borderRadius="md"
                    borderColor={currentImageIndex === index ? activeBorderColor : borderColor}
                    overflow="hidden"
                    cursor="pointer"
                    onClick={() => handleThumbnailClick(index)}
                    flexShrink={0}
                    width="80px"
                    height="60px"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width="100%"
                      height="100%"
                      objectFit="cover"
                    />
                  </Box>
                ))}
              </HStack>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <>
      {/* Main layout with large image and thumbnails */}
      <Box position="relative">
        <Box
          onClick={handleImageClick}
          cursor="pointer"
          borderRadius="md"
          overflow="hidden"
          position="relative"
          mb={4}
          height="300px"
        >
          <Image
            src={images[mainDisplayIndex].src}
            alt={images[mainDisplayIndex].alt}
            width="100%"
            height="100%"
            objectFit="cover"
          />
        </Box>
        
        <HStack spacing={2} width="100%" overflowX="auto" py={2}>
          {images.map((image, index) => (
            <Box
              key={`thumb-${index}`}
              borderWidth="2px"
              borderRadius="md"
              borderColor={mainDisplayIndex === index ? activeBorderColor : borderColor}
              overflow="hidden"
              cursor="pointer"
              onClick={() => handleThumbnailClick(index)}
              flexShrink={0}
              width="80px"
              height="60px"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width="100%"
                height="100%"
                objectFit="cover"
              />
            </Box>
          ))}
        </HStack>
      </Box>
      
      {/* Fullscreen modal gallery */}
      <Modal isOpen={internalIsOpen} onClose={() => setInternalIsOpen(false)} size="4xl" isCentered>
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg={bgColor} p={4}>
          <ModalCloseButton zIndex={2} />
          <ModalBody p={0}>
            <Flex direction="column" align="center">
              <Box position="relative" width="100%" height="70vh">
                <Image
                  src={images[currentImageIndex].src}
                  alt={images[currentImageIndex].alt}
                  width="100%"
                  height="100%"
                  objectFit="contain"
                />
                
                <IconButton
                  aria-label="Previous image"
                  icon={<ChevronLeftIcon boxSize={8} />}
                  position="absolute"
                  left={2}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={handlePrevious}
                  colorScheme="blackAlpha"
                  borderRadius="full"
                />
                
                <IconButton
                  aria-label="Next image"
                  icon={<ChevronRightIcon boxSize={8} />}
                  position="absolute"
                  right={2}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={handleNext}
                  colorScheme="blackAlpha"
                  borderRadius="full"
                />
              </Box>
              
              <HStack spacing={2} mt={4} overflowX="auto" width="100%" justifyContent="center" py={2}>
                {images.map((image, index) => (
                  <Box
                    key={`modal-thumb-${index}`}
                    borderWidth="2px"
                    borderRadius="md"
                    borderColor={currentImageIndex === index ? activeBorderColor : borderColor}
                    overflow="hidden"
                    cursor="pointer"
                    onClick={() => handleThumbnailClick(index)}
                    flexShrink={0}
                    width="80px"
                    height="60px"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width="100%"
                      height="100%"
                      objectFit="cover"
                    />
                  </Box>
                ))}
              </HStack>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ImageGallery; 