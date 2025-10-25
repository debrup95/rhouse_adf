import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  Spacer,
  Spinner,
  Badge,
  HStack,
  Icon,
  Center,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Container,
  VStack,
  SimpleGrid,
  useDisclosure,
  TableContainer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import { FaSearch, FaEye, FaTrash, FaMapMarkerAlt, FaCalendar, FaHome, FaDollarSign, FaBed, FaBath, FaRulerCombined, FaThLarge, FaList } from 'react-icons/fa';
import { LuRefreshCcw } from "react-icons/lu";
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import SavedEstimateModal from './SavedEstimateModal';
import config from '../../../../config';
import { 
  updateRentValues, 
  updateFlipValues, 
  setActiveStrategy, 
  updateOfferRange, 
  updateRentARV,
  updateFlipARV
} from '../../store/underwriteSlice';

interface SavedEstimate {
  id: number;
  user_id: number;
  property_address: string;
  estimate_data: {
    property?: any;
    address?: any;
    addressState?: any;
    offer_range_low?: number;
    offer_range_high?: number;
    rent_underwrite_values?: {
      rent: number;
      expense: number;
      capRate: number;
      highRehab: number;
    };
    flip_underwrite_values?: {
      sellingCosts: number;
      holdingCosts: number;
      margin: number;
      highRehab: number;
    };
    notes?: string;
    active_investment_strategy?: string;
    timestamp?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

const SavedEstimatesPage = () => {
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<SavedEstimate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [investmentStrategy, setInvestmentStrategy] = useState<'rent' | 'flip'>('rent'); // Default to rental, removed 'all' option
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedEstimate, setSelectedEstimate] = useState<SavedEstimate | null>(null);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const user = useAppSelector(state => state.user);
  const navigate = useNavigate();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();
  const dispatch = useAppDispatch();
  
  const bgColor = 'background.primary';
  const borderColor = 'border.primary';
  const borderFocusColor = 'brand.500';
  const textColor = 'text.primary';
  const textSecondaryColor = 'text.secondary';
  const bgSecondaryColor = 'background.secondary';
  
  // Table styling for list view
  const headerBgColor = '#1A3C20'; // Dark green background for table header
  
  // Fetch saved estimates on component mount
  useEffect(() => {
    if (user.isLoggedIn && user.user_id) {
      fetchSavedEstimates();
    }
  }, [user.isLoggedIn, user.user_id]);
  
  // Filter estimates when search term or investment strategy changes
  useEffect(() => {
    let filtered = [...savedEstimates];
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(estimate => 
        estimate.property_address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by investment strategy (removed 'all' option)
    filtered = filtered.filter(estimate => {
      const strategy = estimate.estimate_data.active_investment_strategy;
      if (investmentStrategy === 'rent') {
        return strategy === 'rent' || strategy === 'rental';
      } else if (investmentStrategy === 'flip') {
        return strategy === 'flip';
      }
      return false; // Changed from true to false since we removed 'all'
    });
    
    setFilteredEstimates(filtered);
  }, [searchTerm, investmentStrategy, savedEstimates]);
  
  const fetchSavedEstimates = async () => {
    if (!user.user_id) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Add cache busting parameter to prevent caching issues
      const cacheBuster = `_=${new Date().getTime()}`;
      const response = await fetch(`${config.apiUrl}/api/saved-estimates/user/${user.user_id}?${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch saved estimates');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Data estimates processed
        
        // Process the estimates to ensure they have the offer range data
        const processedEstimates = data.estimates.map((estimate: SavedEstimate) => {
          // If the estimate doesn't have offer range values, add default values
          if (!estimate.estimate_data.offer_range_low || !estimate.estimate_data.offer_range_high) {
            return {
              ...estimate,
              estimate_data: {
                ...estimate.estimate_data,
                offer_range_low: 0,
                offer_range_high: 0
              }
            };
          }
          return estimate;
        });
        
        setSavedEstimates(processedEstimates);
        setFilteredEstimates(processedEstimates);
      } else {
        setErrorMessage(data.message || 'Failed to fetch saved estimates');
      }
    } catch (error) {
      // Error fetching saved estimates
      setErrorMessage('Failed to fetch saved estimates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleViewEstimate = (estimate: SavedEstimate) => {
    setSelectedEstimate(estimate);
    onViewModalOpen();
  };
  
  const openDeleteDialog = (estimateId: number) => {
    setSelectedEstimateId(estimateId);
    setIsDeleteDialogOpen(true);
  };
  
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedEstimateId(null);
  };
  
  const handleDeleteEstimate = async () => {
    if (!selectedEstimateId) return;
    
    try {
      // Add cache busting parameter
      const cacheBuster = `_=${new Date().getTime()}`;
      const response = await fetch(`${config.apiUrl}/api/saved-estimates/${selectedEstimateId}?${cacheBuster}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete estimate');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the deleted estimate from state
        setSavedEstimates(savedEstimates.filter(e => e.id !== selectedEstimateId));
        setFilteredEstimates(filteredEstimates.filter(e => e.id !== selectedEstimateId));
        
        setSuccessMessage('Estimate deleted successfully');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setErrorMessage(data.message || 'Failed to delete estimate');
      }
    } catch (error) {
      // Error deleting estimate
      setErrorMessage('Failed to delete estimate. Please try again.');
    } finally {
      closeDeleteDialog();
    }
  };

  const handleUpdateEstimate = async (updatedData: Partial<SavedEstimate>) => {
    if (!selectedEstimate) return;
    
    setIsUpdateLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Starting to update estimate in SavedEstimatesPage
      
      // Add cache busting parameter
      const cacheBuster = `_=${new Date().getTime()}`;
      const apiUrl = `${config.apiUrl}/api/saved-estimates/${selectedEstimate.id}?${cacheBuster}`;
      // Making API call
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      // API response status received
      
      if (!response.ok) {
        const errorText = await response.text();
        // API error response
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      // API response data received
      
      if (data.success) {
        // Update successful, updating local state
        
        // Create a properly merged updated estimate to ensure we have all fields
        const updatedEstimate = {
          ...selectedEstimate,
          ...updatedData,
          ...(data.estimate || {})
        };
        
        // Update the estimate in the local state
        const updatedEstimates = savedEstimates.map(est => 
          est.id === selectedEstimate.id ? updatedEstimate : est
        );
        
        setSavedEstimates(updatedEstimates);
        setFilteredEstimates(updatedEstimates);
        
        // Update Redux with the values from the updated estimate
        const estimateData = updatedData.estimate_data;
        
        if (estimateData) {
          // NOTE: Removed setActiveStrategy dispatch to prevent auto-switching the filter
          // when viewing/updating different estimate types
          
          // Update rent values in Redux if they've changed
          if (estimateData.rent_underwrite_values) {
            // Handle rent values separately from afterRepairValue to avoid type errors
            const { rent, expense, capRate, highRehab } = estimateData.rent_underwrite_values;
            
            // Update the basic rent values
            dispatch(updateRentValues({
              rent: rent || 0,
              expense: expense || 0,
              capRate: capRate || 0,
              highRehab: highRehab || 0,
              afterRepairValue: 0, // Set a default, will be updated next if available
              defaultHighRehab: highRehab || 0, // Use saved high rehab as default
              customHighRehab: 0, // Initialize with 0
              isUsingCustomHighRehab: false
            }));
            
            // If there's an ARV in the saved data, update it separately
            if ('afterRepairValue' in estimateData.rent_underwrite_values) {
              const arvValue = (estimateData.rent_underwrite_values as any).afterRepairValue || 0;
              dispatch(updateRentARV(arvValue));
            }
          }
          
          // Update flip values in Redux if they've changed
          if (estimateData.flip_underwrite_values) {
            // Handle flip values separately from afterRepairValue and estimatedOffer to avoid type errors
            const { sellingCosts, holdingCosts, margin, highRehab } = estimateData.flip_underwrite_values;
            
            // Update the basic flip values
            dispatch(updateFlipValues({
              sellingCosts: sellingCosts || 0,
              holdingCosts: holdingCosts || 0,
              margin: margin || 0,
              highRehab: highRehab || 0,
              afterRepairValue: 0, // Set defaults, will be updated next if available
              estimatedOffer: 0,
              defaultHighRehab: highRehab || 0, // Use saved high rehab as default
              customHighRehab: 0, // Initialize with 0
              isUsingCustomHighRehab: false
            }));
            
            // If there's an ARV in the saved data, update it separately
            if ('afterRepairValue' in estimateData.flip_underwrite_values) {
              const arvValue = (estimateData.flip_underwrite_values as any).afterRepairValue || 0;
              dispatch(updateFlipARV(arvValue));
            }
            
            // If there's an estimatedOffer, handle it separately
            if ('estimatedOffer' in estimateData.flip_underwrite_values) {
              const estimatedOfferValue = (estimateData.flip_underwrite_values as any).estimatedOffer || 0;
              // We would need a dedicated action for this, but for now we can update the entire flip values
              dispatch(updateFlipValues({
                sellingCosts: sellingCosts || 0,
                holdingCosts: holdingCosts || 0,
                margin: margin || 0,

                highRehab: highRehab || 0,
                afterRepairValue: (estimateData.flip_underwrite_values as any).afterRepairValue || 0,
                estimatedOffer: estimatedOfferValue,
                defaultHighRehab: highRehab || 0, // Use saved high rehab as default
                customHighRehab: 0, // Initialize with 0
                isUsingCustomHighRehab: false
              }));
            }
          }
          
          // Update offer range in Redux if it's changed
          if (estimateData.offer_range_low !== undefined && estimateData.offer_range_high !== undefined) {
            dispatch(updateOfferRange({
              low: estimateData.offer_range_low,
              high: estimateData.offer_range_high
            }));
          }
        }
        
        setSuccessMessage('Estimate updated successfully');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);

        // Close modal after a delay
        setTimeout(() => {
          onViewModalClose();
        }, 1000);
      } else {
        // API returned success: false
        setErrorMessage(data.message || 'Failed to update estimate: Server returned success=false');
        
        setTimeout(() => {
          onViewModalClose();
        }, 1000);
      }
    } catch (error) {
      // Error occurred during update
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update estimate. Please try again.');
      
      setTimeout(() => {
        onViewModalClose();
      }, 1000);
    } finally {
      setIsUpdateLoading(false);
    }
  };
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric'
    });
  };
  
  // Helper functions for rendering list view data
  const getSavedOfferRange = (estimate: SavedEstimate) => {
    if (estimate.estimate_data.offer_range_low && estimate.estimate_data.offer_range_high) {
      return `${formatPrice(estimate.estimate_data.offer_range_high)}`;
    }
    return 'N/A';
  };
  
  const getNotes = (estimate: SavedEstimate) => {
    return estimate.estimate_data.notes || '';
  };
  
  if (!user.isLoggedIn) {
    return (
      <Box p={8} textAlign="center">
        <Heading size="lg" mb={4}>Saved Estimates</Heading>
        <Text mb={4}>Please log in to view your saved estimates.</Text>
        <Button colorScheme="brand" onClick={() => navigate('/')}>Go to Home</Button>
      </Box>
    );
  }
  
  return (
    <Container maxW="container.xl" py={8} pt="100px">
      <VStack spacing={8} align="stretch">
        <HStack justifyContent="space-between" wrap="wrap">
          <Box>
            <Heading as="h1" size="xl" mb={2}>
              Saved Estimates
            </Heading>
            <Text mb={6} color={textSecondaryColor}>
              View and manage your saved real estate investment analysis
            </Text>
          </Box>
          <HStack spacing={4}>
            <Button 
              leftIcon={<Icon as={FaHome as React.ElementType} />}
              colorScheme="brand" 
              onClick={() => navigate('/estimate')}
            >
              New Estimate
            </Button>
            <HStack 
              spacing={1} 
              bg={bgSecondaryColor} 
              p={1} 
              borderRadius="md" 
              borderWidth="1px" 
              borderColor={borderColor}
            >
              <Button
                size="sm"
                leftIcon={<Icon as={FaThLarge as React.ElementType} />}
                onClick={() => setViewType('grid')}
                colorScheme={viewType === 'grid' ? 'brand' : 'gray'}
                variant={viewType === 'grid' ? 'solid' : 'ghost'}
              >
                Grid
              </Button>
              <Button
                size="sm"
                leftIcon={<Icon as={FaList as React.ElementType} />}
                onClick={() => setViewType('list')}
                colorScheme={viewType === 'list' ? 'brand' : 'gray'}
                variant={viewType === 'list' ? 'solid' : 'ghost'}
              >
                List
              </Button>
            </HStack>
          </HStack>
        </HStack>

        {errorMessage && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle mr={2}>Error!</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
            <CloseButton 
              position="absolute" 
              right="8px" 
              top="8px" 
              onClick={() => setErrorMessage(null)}
            />
          </Alert>
        )}

        {successMessage && (
          <Alert status="success">
            <AlertIcon />
            <AlertTitle mr={2}>Success!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
            <CloseButton 
              position="absolute" 
              right="8px" 
              top="8px" 
              onClick={() => setSuccessMessage(null)}
            />
          </Alert>
        )}

        <Flex mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }} gap={4}>
          <InputGroup maxW={{ base: 'full', md: '400px' }}>
            <InputLeftElement pointerEvents='none'>
              <Icon as={FaSearch as React.ElementType} color='gray.500' />
            </InputLeftElement>
            <Input 
              placeholder='Search by address...' 
              value={searchTerm}
              onChange={handleSearch}
              borderRadius="md"
              borderColor={borderColor}
              _hover={{ borderColor: borderFocusColor }}
              _focus={{ borderColor: borderFocusColor, boxShadow: `0 0 0 1px ${borderFocusColor}` }}
            />
          </InputGroup>
          
          {/* Investment Strategy Filter */}
          <HStack 
            spacing={1} 
            bg={bgSecondaryColor} 
            p={1} 
            borderRadius="md" 
            borderWidth="1px" 
            borderColor={borderColor}
          >
            <Button
              size="sm"
              onClick={() => setInvestmentStrategy('rent')}
              colorScheme={investmentStrategy === 'rent' ? 'brand' : 'gray'}
              variant={investmentStrategy === 'rent' ? 'solid' : 'ghost'}
            >
              Rental
            </Button>
            <Button
              size="sm"
              onClick={() => setInvestmentStrategy('flip')}
              colorScheme={investmentStrategy === 'flip' ? 'brand' : 'gray'}
              variant={investmentStrategy === 'flip' ? 'solid' : 'ghost'}
            >
              Flip
            </Button>
          </HStack>
          
          <Spacer />
          <HStack>
            <Badge colorScheme="blue" fontSize="md" p={2} borderRadius="md">
              Total: {filteredEstimates.length}
            </Badge>
            <Button 
              leftIcon={<Icon as={LuRefreshCcw as React.ElementType} />}
              colorScheme="brand" 
              size="md"
              onClick={fetchSavedEstimates}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>
        
        {isLoading ? (
          <Center py={10}>
            <Spinner size="xl" color="brand.500" />
          </Center>
        ) : filteredEstimates.length === 0 ? (
          <Box 
            p={8} 
            textAlign="center" 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={borderColor}
            bg={bgColor}
          >
            <Text fontSize="lg" mb={4}>
              {searchTerm ? 'No estimates match your search' : 'No saved estimates found'}
            </Text>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            )}
          </Box>
        ) : viewType === 'grid' ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredEstimates.map((estimate) => (
              <Box 
                key={estimate.id} 
                p={4} 
                borderWidth="1px" 
                borderRadius="lg" 
                borderColor={borderColor} 
                bg={bgColor} 
                transition="all 0.2s" 
                _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
                position="relative"
              >
                <VStack align="stretch" spacing={3}>
                  <Heading as="h3" size="md" color={textColor}>
                    <HStack>
                      <Icon as={FaMapMarkerAlt as React.ElementType} color="brand.500" />
                      <Text noOfLines={1}>{estimate.property_address}</Text>
                    </HStack>
                  </Heading>
                  
                  <Flex justifyContent="space-between" alignItems="center">
                    <Badge colorScheme="green" fontSize="md" p={1} borderRadius="md">
                      {estimate.estimate_data.offer_range_low && estimate.estimate_data.offer_range_high ? 
                        `${formatPrice(estimate.estimate_data.offer_range_high)}` :
                        estimate.estimate_data.estimated_value || '$0'
                      }
                    </Badge>
                    <Badge 
                      colorScheme={estimate.estimate_data.active_investment_strategy === 'flip' ? 'blue' : 'purple'} 
                      fontSize="sm" 
                      p={1} 
                      borderRadius="md"
                    >
                      {estimate.estimate_data.active_investment_strategy === 'flip' ? 'Flip' : 'Rental'}
                    </Badge>
                  </Flex>
                  
                  {estimate.estimate_data.property_details && (
                    <SimpleGrid columns={2} spacing={2} mt={2}>
                      <HStack>
                        <Icon as={FaBed as React.ElementType} color="text.secondary" />
                        <Text fontSize="sm">{estimate.estimate_data.property_details.beds || 0} bd</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaBath as React.ElementType} color="text.secondary" />
                        <Text fontSize="sm">{estimate.estimate_data.property_details.baths || 0} ba</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaRulerCombined as React.ElementType} color="text.secondary" />
                        <Text fontSize="sm">{estimate.estimate_data.property_details.sqft || 0} sqft</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaHome as React.ElementType} color="text.secondary" />
                        <Text fontSize="sm">{estimate.estimate_data.property_details.year_built || 'N/A'}</Text>
                      </HStack>
                    </SimpleGrid>
                  )}
                  
                  <HStack mt={2} spacing={2}>
                    <Button
                      variant="outline"
                      size="sm"
                      colorScheme="green"
                      leftIcon={<Icon as={FaEye as React.ElementType} />}
                      flex="1"
                      onClick={() => handleViewEstimate(estimate)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      leftIcon={<Icon as={FaTrash as React.ElementType} />}
                      flex="1"
                      onClick={() => openDeleteDialog(estimate.id)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <TableContainer 
            borderWidth="1px" 
            borderRadius="lg" 
            borderColor={borderColor} 
            bg={bgColor}
            overflowX="auto"
          >
            <Table variant="simple" size="sm" colorScheme="green">
              <Thead bg={bgSecondaryColor}>
                <Tr>
                  <Th 
                    _hover={{ cursor: 'pointer' }}
                    width="120px"
                  >
                    Date Saved
                  </Th>
                  <Th 
                    _hover={{ cursor: 'pointer' }}
                  >
                    Property Address
                  </Th>
                  <Th 
                    _hover={{ cursor: 'pointer' }}
                    width="100px"
                  >
                    Strategy
                  </Th>
                  <Th 
                    _hover={{ cursor: 'pointer' }}
                  >
                    Offer Price
                  </Th>
                  <Th 
                    _hover={{ cursor: 'pointer' }}
                  >
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredEstimates.map((estimate) => (
                  <Tr key={estimate.id} _hover={{ bg: "rgba(0, 128, 0, 0.1)" }}>
                    <Td>{formatDate(estimate.created_at)}</Td>
                    <Td>{estimate.property_address}</Td>
                    <Td>
                      <Badge 
                        colorScheme={estimate.estimate_data.active_investment_strategy === 'flip' ? 'blue' : 'purple'} 
                        fontSize="sm" 
                        p={1} 
                        borderRadius="md"
                      >
                        {estimate.estimate_data.active_investment_strategy === 'flip' ? 'Flip' : 'Rental'}
                      </Badge>
                    </Td>
                    <Td>{getSavedOfferRange(estimate)}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          variant="outline"
                          size="sm"
                          colorScheme="green"
                          leftIcon={<Icon as={FaEye as React.ElementType} />}
                          onClick={() => handleViewEstimate(estimate)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          leftIcon={<Icon as={FaTrash as React.ElementType} />}
                          onClick={() => openDeleteDialog(estimate.id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgSecondaryColor}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Estimate
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteEstimate} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* View/Edit Estimate Modal */}
      {selectedEstimate && (
        <SavedEstimateModal
          isOpen={isViewModalOpen}
          onClose={onViewModalClose}
          estimate={selectedEstimate}
          onUpdate={handleUpdateEstimate}
        />
      )}
    </Container>
  );
};

// Helper function to format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

export default SavedEstimatesPage; 