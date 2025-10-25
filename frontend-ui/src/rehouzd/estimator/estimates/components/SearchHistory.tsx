import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';

import { AddressComponents } from '../../address/components/PlaceAutocompleteInput';
import SearchHistoryService from '../../services/searchHistoryService';

interface SearchHistoryItem {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  searchedAt: string;
}

interface SearchHistoryProps {
  userId: string;
  isVisible: boolean;
  onToggle: () => void;
  onAddressSelect: (address: AddressComponents) => void;
  onNext: () => void;
  onFocusInput?: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ 
  userId, 
  isVisible, 
  onToggle, 
  onAddressSelect, 
  onNext,
  onFocusInput
}) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const textColor = useColorModeValue('gray.800', 'gray.800');
  const subTextColor = useColorModeValue('gray.500', 'gray.500');
  const dividerColor = useColorModeValue('gray.200', 'gray.200');

  const loadSearchHistory = async () => {
    try {
      const history = await SearchHistoryService.getSearchHistory(userId);
      setSearchHistory(history);
    } catch (error) {
      setSearchHistory([]);
    }
  };

  useEffect(() => {
    if (userId) {
      loadSearchHistory();
    }
  }, [userId]);

  // Refresh history when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadSearchHistory();
    }
  }, [isVisible, userId]);

  const handleAddressClick = (item: SearchHistoryItem) => {
    // Create AddressComponents using the structured data
    const addressComponents: AddressComponents = {
      street1: item.address || '',
      street2: '',
      city: item.city || '',
      state: item.state || '',
      zip: item.zip || '',
      formattedAddress: item.fullAddress,
      lat: 0, // Will be populated by the API call
      lng: 0,
    };

    // Only populate the address input - don't automatically proceed
    onAddressSelect(addressComponents);
    
    // Focus the input box with a small delay to ensure the address is populated first
    if (onFocusInput) {
      setTimeout(() => {
        onFocusInput();
      }, 100);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on the X button
    if ((e.target as HTMLElement).textContent === '✕') {
      return;
    }
    onToggle();
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent header click
    onToggle();
  };

  return (
    <Box 
      w="100%" 
      maxW="600px" 
      bg="transparent" 
      style={{ backgroundColor: 'transparent !important' }}
      pl="4"
    >
      {/* Header - Always Visible and Clickable */}
      <HStack 
        justify="space-between" 
        align="center" 
        pl="4"
        borderBottom={isVisible ? "1px solid" : "none"} 
        borderColor="gray.200"
        cursor="pointer"
        onClick={handleHeaderClick}
        bg="transparent"
        style={{ backgroundColor: 'transparent !important' }}
      >
        <Box pl={{ base: 4, md: 6 }}>
          <Text
            fontSize="18px"
            fontWeight="bold"
            color="#777777"
          >
            Search History
          </Text>
        </Box>
        <Box pr={{ base: 4, md: 6, lg: 8 }}>
          <Text
            fontSize="18px"
            color='#777777'
            cursor="pointer"
            onClick={handleCloseClick}
            _hover={{ opacity: 0.7 }}
            fontWeight="bold"
          >
            ✕
          </Text>
        </Box>
      </HStack>

      {/* Content - Expandable/Collapsible */}
      {isVisible && (
        <Box pl="4" bg="transparent" style={{ backgroundColor: 'transparent !important' }}>
          <VStack spacing={0} align="stretch">
            {searchHistory.length === 0 ? (
              <Box pl={{ base: 4, md: 6 }} pr={{ base: 2, md: 4 }}>
                <Text color={subTextColor} fontSize="14px" textAlign="center" py="20px">
                  No search history found
                </Text>
              </Box>
            ) : (
              searchHistory.map((item, index) => (
                <Box key={item.id} bg="transparent" style={{ backgroundColor: 'transparent !important' }}>
                  <Box
                    py="12px"
                    pl={{ base: 4, md: 6 }}
                    pr={{ base: 2, md: 4 }}
                    cursor="pointer"
                    onClick={() => handleAddressClick(item)}
                    bg="transparent"
                    style={{ backgroundColor: 'transparent !important' }}
                  >
                    <Text
                      fontSize="14px"
                      color={textColor}
                      fontWeight="medium"
                      noOfLines={1}
                      mb="4px"
                    >
                      {item.fullAddress}
                    </Text>
                    <Text
                      fontSize="12px"
                      color={subTextColor}
                    >
                      Searched on {formatDate(item.searchedAt)}
                    </Text>
                  </Box>
                  {index < searchHistory.length - 1 && (
                    <Divider borderColor={dividerColor} borderWidth="1px" />
                  )}
                </Box>
              ))
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default SearchHistory; 