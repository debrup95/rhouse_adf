import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Flex,
  Icon,
  useDisclosure,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  useBreakpointValue,
  IconButton,
} from '@chakra-ui/react';
import { FaArrowLeft, FaEye, FaCoins, FaHistory, FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import ContactInfoDrawer from './ContactInfoDrawer';
import config from '../../../config';

interface SkipTraceHistoryItem {
  lookupId: string;
  buyerId: string;
  buyerName: string;
  originalSearchAddress: string;
  lookupDate: string;
  creditUsed: 'free' | 'paid' | 'cached';
  apiResponseStatus: string;
  phoneCount: number;
  emailCount: number;
  phones: any[];
  emails: any[];
  addresses: any[];
  compliance: {
    dncStatus: string;
    litigatorStatus: string;
  };
}

interface CreditBalance {
  free: number;
  paid: number;
  total: number;
}

const SkipTraceHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.user);
  
  // State
  const [historyItems, setHistoryItems] = useState<SkipTraceHistoryItem[]>([]);
  const [creditBalance, setCreditBalance] = useState<CreditBalance>({ free: 0, paid: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  
  // Contact Info Drawer
  const { isOpen: isContactDrawerOpen, onOpen: onOpenContactDrawer, onClose: onCloseContactDrawer } = useDisclosure();
  
  // Responsive design
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Fetch data on component mount and when page changes
  useEffect(() => {
    if (user?.user_id && user.isLoggedIn) {
      fetchSkipTraceHistory(currentPage);
      if (currentPage === 1) {
        fetchCreditBalance(); // Only fetch credits on first page load
      }
    } else {
      setError('Please log in to view your skip trace history');
      setIsLoading(false);
    }
  }, [user?.user_id, user?.isLoggedIn, currentPage]);

  const fetchSkipTraceHistory = async (page: number = 1) => {
    // Fetching skip trace history for page
    setIsLoading(true);
    try {
      const userId = parseInt(user.user_id.toString(), 10);
      const offset = (page - 1) * itemsPerPage;
      const url = `${config.apiUrl}/api/skip-trace/history/${userId}?limit=${itemsPerPage}&offset=${offset}`;
      // API URL constructed
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch skip trace history: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // API Response received
      
      if (data.success) {
        setHistoryItems(data.results || []);
        setTotalCount(data.totalCount || data.results?.length || 0);
        setError(null); // Clear any previous errors
        // Set items and total count
      } else {
        throw new Error(data.message || 'Failed to load history');
      }
    } catch (error) {
      // Error fetching skip trace history
      setError(error instanceof Error ? error.message : 'Failed to load skip trace history');
      setHistoryItems([]); // Clear items on error
      setTotalCount(0);
    } finally {
      setIsLoading(false); // Always reset loading state
      // Loading complete for page
    }
  };

  const fetchCreditBalance = async () => {
    try {
      const userId = parseInt(user.user_id.toString(), 10);
      const response = await fetch(`${config.apiUrl}/api/skip-trace/credits/balance/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCreditBalance(data.credits);
      } else {
        throw new Error(data.message || 'Failed to load credits');
      }
    } catch (error) {
      // Error fetching credit balance
      // Don't set error for credits, just use default values
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getCreditTypeColor = (creditType: string) => {
    switch (creditType) {
      case 'free': return 'green';
      case 'paid': return 'blue';
      case 'cached': return 'gray';
      default: return 'gray';
    }
  };

  const getCreditTypeLabel = (creditType: string) => {
    switch (creditType) {
      case 'free': return 'Free Credit';
      case 'paid': return 'Paid Credit';
      case 'cached': return 'Cached (Free)';
      default: return creditType;
    }
  };

  // Pagination handlers
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewContact = (item: SkipTraceHistoryItem) => {
    // Create a buyer object for ContactInfoDrawer
    const buyer = {
      id: item.buyerId,
      name: item.buyerName,
      address: item.originalSearchAddress,
      type: [],
      priceRange: '',
      likelihood: 'Unknown',
      recentPurchases: 0,
      score: 0,
      matchDetails: {
        geographicScore: 0,
        recencyScore: 0,
        priceScore: 0,
        characteristicsScore: 0,
        activityScore: 0
      }
    };
    
    setSelectedBuyer(buyer);
    onOpenContactDrawer();
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text>Loading your skip trace history...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      {/* Header with Credits */}
      <Flex justify="space-between" align="start" mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <VStack align="start" spacing={1}>
          <HStack>
            <Button
              leftIcon={<Icon as={FaArrowLeft as React.ElementType} />}
              variant="ghost"
              onClick={() => navigate('/')}
              size="sm"
            >
              Back to Home
            </Button>
          </HStack>
          <Heading size="lg">Skip Trace History</Heading>
          <Text color="gray.600">View your contact lookup history and remaining credits</Text>
        </VStack>
        
        {/* Credits Display */}
        <Card>
          <CardBody>
            <VStack align="center" spacing={2}>
              <HStack>
                <Icon as={FaCoins as React.ElementType} color="brand.500" />
                <Text fontWeight="bold" color="brand.500">Credits Remaining</Text>
              </HStack>
              <SimpleGrid columns={3} spacing={4} textAlign="center">
                <Stat size="sm">
                  <StatLabel fontSize="xs">Free</StatLabel>
                  <StatNumber fontSize="lg" color="green.500">{creditBalance.free}</StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Paid</StatLabel>
                  <StatNumber fontSize="lg" color="blue.500">{creditBalance.paid}</StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Total</StatLabel>
                  <StatNumber fontSize="lg" color="brand.500">{creditBalance.total}</StatNumber>
                </Stat>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </Flex>

      {/* History Content */}
      {historyItems.length === 0 ? (
        <Center minH="300px">
          <VStack spacing={4}>
            <Icon as={FaHistory as React.ElementType} size="48px" color="gray.400" />
            <Heading size="md" color="gray.500">No Skip Trace History</Heading>
            <Text color="gray.500" textAlign="center">
              You haven't performed any skip traces yet. Start by finding buyers and accessing their contact information.
            </Text>
            <Button colorScheme="brand" onClick={() => navigate('/estimate')}>
              Get Started
            </Button>
          </VStack>
        </Center>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          {isMobile ? (
            <VStack spacing={4}>
              {historyItems.map((item) => (
                <Card key={item.lookupId} w="100%" variant="outline">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={1} flex="1">
                          <HStack>
                            <Icon as={FaUser as React.ElementType} color="brand.500" boxSize={4} />
                            <Text fontWeight="bold" fontSize="sm">{item.buyerName}</Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {formatDate(item.lookupDate)}
                          </Text>
                        </VStack>
                        <Badge colorScheme={getCreditTypeColor(item.creditUsed)} variant="solid">
                          {getCreditTypeLabel(item.creditUsed)}
                        </Badge>
                      </HStack>
                      
                      <HStack justify="flex-end">
                        <Button
                          leftIcon={<Icon as={FaEye as React.ElementType} />}
                          size="sm"
                          colorScheme="brand"
                          variant="outline"
                          onClick={() => handleViewContact(item)}
                        >
                          View Contact
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          ) : (
            /* Desktop: Table Layout */
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Buyer Name</Th>
                    <Th>Lookup Date</Th>
                    <Th>Credit Type</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {historyItems.map((item) => (
                    <Tr key={item.lookupId}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="semibold">{item.buyerName}</Text>
                          {/* <Text fontSize="sm" color="gray.500" isTruncated maxW="200px">
                            {item.originalSearchAddress}
                          </Text> */}
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{formatDate(item.lookupDate)}</Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={getCreditTypeColor(item.creditUsed)} variant="solid">
                          {getCreditTypeLabel(item.creditUsed)}
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          leftIcon={<Icon as={FaEye as React.ElementType} />}
                          size="sm"
                          colorScheme="brand"
                          variant="outline"
                          onClick={() => handleViewContact(item)}
                        >
                          View Contact
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
          
          {/* Pagination Controls */}
          {historyItems.length > 0 && totalPages > 1 && (
            <Flex justify="space-between" align="center" mt={6} wrap="wrap" gap={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
              </Text>
              
              <HStack spacing={1}>
                <IconButton
                  aria-label="Previous page"
                  icon={<Icon as={FaChevronLeft as React.ElementType} />}
                  size="sm"
                  variant="outline"
                  isDisabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                />
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNumber > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNumber}
                      size="sm"
                      variant={pageNumber === currentPage ? "solid" : "outline"}
                      colorScheme={pageNumber === currentPage ? "brand" : "gray"}
                      onClick={() => handlePageChange(pageNumber)}
                      isDisabled={isLoading}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                
                <IconButton
                  aria-label="Next page"
                  icon={<Icon as={FaChevronRight as React.ElementType} />}
                  size="sm"
                  variant="outline"
                  isDisabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                />
              </HStack>
            </Flex>
          )}
        </>
      )}

      {/* Contact Info Drawer */}
      {selectedBuyer && (
        <ContactInfoDrawer
          isOpen={isContactDrawerOpen}
          onClose={onCloseContactDrawer}
          buyer={selectedBuyer}
          skipTraceCredits={{ free: creditBalance.free, paid: creditBalance.paid }}
        />
      )}
    </Container>
  );
};

export default SkipTraceHistoryPage; 