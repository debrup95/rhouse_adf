import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  SimpleGrid,
  Image,
  Spinner,
  Flex,
  VStack,
  HStack,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { FaGoogle, FaCheck } from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';
import config from '../../../../config';

// Types
interface MediaItem {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
}

interface GooglePhotosSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhotos: (photos: { url: string; id: string; filename: string }[]) => void;
}

// Constants
const GOOGLE_PHOTOS_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.sharing'
].join(' ');

const TOKEN_STORAGE_KEY = 'googlePhotosToken';
const TOKEN_EXPIRY_KEY = 'googlePhotosTokenExpiry';
const TOKEN_DURATION = 3600 * 1000; // 1 hour

const GooglePhotosSelector: React.FC<GooglePhotosSelectorProps> = ({
  isOpen,
  onClose,
  onSelectPhotos
}) => {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<{ [id: string]: boolean }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if Google Client ID is configured
  const hasGoogleClientId = Boolean(
    config.googleClientId && 
    config.googleClientId.trim() && 
    config.googleClientId !== 'dummy-client-id'
  );

  // Clear stored tokens
  const clearStoredTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }, []);

  // Store token with expiry
  const storeToken = useCallback((accessToken: string) => {
    const expiryTime = Date.now() + TOKEN_DURATION;
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }, []);

  // Check if stored token is valid
  const getStoredToken = useCallback((): string | null => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedTokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (storedToken && storedTokenExpiry) {
      if (Date.now() < parseInt(storedTokenExpiry, 10)) {
        return storedToken;
      } else {
        clearStoredTokens();
      }
    }
    return null;
  }, [clearStoredTokens]);

  // Fetch photos from Google Photos API
  const fetchPhotos = useCallback(async (accessToken: string) => {
    if (!hasGoogleClientId) return;
    
    setIsLoadingPhotos(true);
    setAuthError(null);
    
    try {
      const response = await fetch(
        'https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=100',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          setAuthError('Authentication expired. Please sign in again.');
          clearStoredTokens();
          setToken(null);
        } else if (response.status === 403) {
          setAuthError('Access denied. Please ensure the Photos Library API is enabled and you have granted all required permissions.');
        } else {
          setAuthError(`Error fetching photos: ${response.status}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setPhotos(data.mediaItems || []);
      
    } catch (error) {
      // Error fetching photos
      if (!authError) {
        setAuthError('Failed to load photos. Please try again.');
      }
    } finally {
      setIsLoadingPhotos(false);
      setIsLoading(false);
    }
  }, [hasGoogleClientId, authError, clearStoredTokens]);

  // Google login configuration
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (!hasGoogleClientId) return;
      
      // Google OAuth succeeded
      storeToken(tokenResponse.access_token);
      setToken(tokenResponse.access_token);
      fetchPhotos(tokenResponse.access_token);
      setAuthError(null);
    },
    onError: (errorResponse) => {
      if (!hasGoogleClientId) return;
      
      // Google login failed
      
      // Handle different types of errors
      const errorType = (errorResponse as any).type || (errorResponse as any).error;
      
      if (errorType === 'access_denied') {
        setAuthError('Authentication failed: You must approve all requested permissions to access your photos.');
      } else if (errorType === 'popup_closed') {
        setAuthError('Authentication popup was closed. Please try again and keep the popup open until completion.');
      } else {
        setAuthError(`Authentication failed: ${errorType || 'Unknown error'}`);
      }
      
      clearStoredTokens();
      setIsLoading(false);
    },
    scope: GOOGLE_PHOTOS_SCOPES,
    flow: 'implicit',
  });

  // Handle Google authentication
  const handleGoogleLogin = useCallback(() => {
    if (!hasGoogleClientId) return;
    
    setIsLoading(true);
    setAuthError(null);
    clearStoredTokens();
    
    // Small delay to ensure user-initiated action
    setTimeout(() => {
      window.focus();
      login();
    }, 100);
  }, [hasGoogleClientId, clearStoredTokens, login]);

  // Handle photo selection
  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotos(prev => ({
      ...prev,
      [photoId]: !prev[photoId]
    }));
  }, []);

  // Handle confirm selection
  const handleConfirmSelection = useCallback(() => {
    const selected = photos.filter(photo => selectedPhotos[photo.id]);
    const formattedPhotos = selected.map(photo => ({
      url: photo.baseUrl,
      id: photo.id,
      filename: photo.filename
    }));
    
    onSelectPhotos(formattedPhotos);
    onClose();
  }, [photos, selectedPhotos, onSelectPhotos, onClose]);

  // Check for stored token on mount
  useEffect(() => {
    if (!hasGoogleClientId || !isOpen) return;
    
    const storedToken = getStoredToken();
    if (storedToken) {
      // Using stored Google Photos token
      setToken(storedToken);
      fetchPhotos(storedToken);
    }
  }, [hasGoogleClientId, isOpen, getStoredToken, fetchPhotos]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPhotos({});
      setAuthError(null);
    }
  }, [isOpen]);

  // Early return if not configured
  if (!hasGoogleClientId) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Google Photos Integration</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  <Text fontSize="sm" mb={2}>
                    Google Photos integration is not configured. Please set up the Google Client ID.
                  </Text>
                  <Code p={2} mt={1} fontSize="xs" width="100%">
                    REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
                  </Code>
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  const selectedCount = Object.values(selectedPhotos).filter(Boolean).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Photos from Google</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {authError ? (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>
                  <Text mb={2}>{authError}</Text>
                  <Text fontSize="sm" color="gray.600">
                    Common solutions:
                  </Text>
                  <UnorderedList fontSize="sm" mt={1} spacing={1}>
                    <ListItem>Ensure Photos Library API is enabled in Google Cloud Console</ListItem>
                    <ListItem>Check that your domain is in Authorized JavaScript origins</ListItem>
                    <ListItem>Disable popup blockers for this site</ListItem>
                    <ListItem>Grant all requested permissions during authentication</ListItem>
                  </UnorderedList>
                  <Button 
                    size="sm" 
                    colorScheme="blue" 
                    mt={3}
                    onClick={handleGoogleLogin}
                    isLoading={isLoading}
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Box>
            </Alert>
          ) : !token ? (
            <Box textAlign="center" py={10}>
              <VStack spacing={4}>
                <Text mb={4}>Connect to your Google Photos to select images</Text>
                <Button
                  leftIcon={<Icon as={FaGoogle as React.ElementType } />}
                  colorScheme="blue"
                  onClick={handleGoogleLogin}
                  isLoading={isLoading}
                  loadingText="Connecting..."
                  size="lg"
                >
                  Sign in with Google
                </Button>
              </VStack>
            </Box>
          ) : isLoadingPhotos ? (
            <Flex justify="center" align="center" direction="column" py={10}>
              <Spinner size="xl" mb={4} />
              <Text>Loading your photos...</Text>
            </Flex>
          ) : photos.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text mb={4}>No photos found in your Google Photos account.</Text>
              <Button 
                size="sm" 
                colorScheme="blue" 
                leftIcon={<Icon as={FaGoogle as React.ElementType} />}
                onClick={handleGoogleLogin}
                isLoading={isLoading}
              >
                Try Again
              </Button>
            </Box>
          ) : (
            <>
              <Text mb={4}>
                Select photos from your Google Photos library ({photos.length} photos found)
              </Text>
              <SimpleGrid columns={3} spacing={3}>
                {photos.map(photo => (
                  <Box 
                    key={photo.id} 
                    position="relative" 
                    cursor="pointer"
                    onClick={() => togglePhotoSelection(photo.id)}
                    borderWidth={selectedPhotos[photo.id] ? 3 : 1}
                    borderColor={selectedPhotos[photo.id] ? "blue.500" : "gray.200"}
                    borderRadius="md"
                    overflow="hidden"
                    transition="all 0.2s"
                    _hover={{ borderColor: "blue.300" }}
                  >
                    <Image
                      src={`${photo.baseUrl}=w200-h200-c`}
                      alt={photo.filename}
                      objectFit="cover"
                      w="100%"
                      h="120px"
                      loading="lazy"
                    />
                    {selectedPhotos[photo.id] && (
                      <Box 
                        position="absolute" 
                        top={2} 
                        right={2} 
                        bg="blue.500" 
                        color="white"
                        borderRadius="full"
                        w="24px"
                        h="24px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        boxShadow="md"
                      >
                        <Icon as={FaCheck as React.ElementType} boxSize={3} />
                      </Box>
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirmSelection}
              isDisabled={!token || selectedCount === 0}
            >
              Select {selectedCount} Photo{selectedCount !== 1 ? 's' : ''}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GooglePhotosSelector; 