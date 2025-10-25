import React, { useState } from 'react';
import { Button, useDisclosure, Icon, HStack, Text, Box, SimpleGrid, Image } from '@chakra-ui/react';
import { FaGoogle, FaTrash } from 'react-icons/fa';
import GooglePhotosSelector from './GooglePhotosSelector';

interface GooglePhotosButtonProps {
  onPhotosSelected: (photos: Array<{ url: string; id: string; filename: string }>) => void;
  selectedPhotos: Array<{ url: string; id: string; filename: string }>;
  onRemovePhoto: (photoId: string) => void;
  onRemoveAllPhotos: () => void;
}

const GooglePhotosButton: React.FC<GooglePhotosButtonProps> = ({ 
  onPhotosSelected,
  selectedPhotos,
  onRemovePhoto,
  onRemoveAllPhotos
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleSelectPhotos = (photos: Array<{ url: string; id: string; filename: string }>) => {
    onPhotosSelected(photos);
    onClose();
  };

  return (
    <>
      <Box>
        {selectedPhotos.length > 0 ? (
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text color="green.500" fontWeight="medium">
                {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected from Google Photos
              </Text>
              <Button
                aria-label="Remove all photos"
                leftIcon={<Icon as={FaTrash as React.ComponentType} />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={onRemoveAllPhotos}
              >
                Remove All
              </Button>
            </HStack>
            <SimpleGrid columns={3} spacing={2} mt={2}>
              {selectedPhotos.map((photo) => (
                <Box
                  key={photo.id}
                  position="relative"
                  h="80px"
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Image
                    src={`${photo.url}=w200-h200`}
                    alt={photo.filename}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                  <Button
                    position="absolute"
                    top={0}
                    right={0}
                    size="xs"
                    colorScheme="red"
                    variant="solid"
                    opacity={0.8}
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    <Icon as={FaTrash as React.ComponentType} boxSize={3} />
                  </Button>
                </Box>
              ))}
            </SimpleGrid>
            <Button
              mt={2}
              size="sm"
              leftIcon={<Icon as={FaGoogle as React.ComponentType} />}
              colorScheme="blue"
              variant="outline"
              onClick={onOpen}
            >
              Add More Photos
            </Button>
          </Box>
        ) : (
          <Button
            leftIcon={<Icon as={FaGoogle as React.ComponentType} />}
            colorScheme="blue"
            variant="outline"
            onClick={onOpen}
            size="md"
            w="100%"
          >
            Choose from Google Photos
          </Button>
        )}
      </Box>

      <GooglePhotosSelector
        isOpen={isOpen}
        onClose={onClose}
        onSelectPhotos={handleSelectPhotos}
      />
    </>
  );
};

export default GooglePhotosButton; 