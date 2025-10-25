import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  VStack,
  Text,
  Button,
  useToast,
  useColorModeValue,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaFilePdf, FaHome } from 'react-icons/fa';
import InvestorReport from '../report/InvestorReport';
import config from '../../../config';

interface SharedReportData {
  id: string;
  shareToken: string;
  isActive: boolean;
  expiresAt: string;
  viewCount: number;
  interactionCount: number;
  lastAccessed?: string;
  createdAt: string;
  propertyAddress: string;
  reportStrategy: 'rent' | 'flip';
  reportType?: 'investor' | 'seller'; // Add reportType field for backward compatibility
  presetValues?: Record<string, number>;
  estimateData: any;
}

interface SharedReportError {
  code: 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE' | 'INVALID_TOKEN' | 'SERVER_ERROR';
  message: string;
  details?: any;
}

const SharedReportPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // State
  const [sharedReport, setSharedReport] = useState<SharedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SharedReportError | null>(null);

  // Fetch shared report data
  useEffect(() => {
    const fetchSharedReport = async () => {
      if (!shareToken) {
        setError({
          code: 'INVALID_TOKEN',
          message: 'No share token provided',
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${config.apiUrl}/api/shared-estimates/${shareToken}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('NOT_FOUND');
          } else if (response.status === 410) {
            throw new Error('EXPIRED');
          } else if (response.status === 403) {
            throw new Error('INACTIVE');
          } else {
            throw new Error('SERVER_ERROR');
          }
        }

        const data = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || 'Failed to load report');
        }

        setSharedReport(data.data);
      } catch (error: any) {
        console.error('Error fetching shared report:', error);
        
        const errorCode = error.message || 'SERVER_ERROR';
        const errorMessages: Record<string, string> = {
          NOT_FOUND: 'This shared report could not be found.',
          EXPIRED: 'This shared report has expired.',
          INACTIVE: 'This shared report is no longer active.',
          INVALID_TOKEN: 'The shared report link is invalid.',
          SERVER_ERROR: 'An error occurred while loading the report.',
        };

        setError({
          code: errorCode as any,
          message: errorMessages[errorCode] || errorMessages.SERVER_ERROR,
          details: error,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedReport();
  }, [shareToken]);

  // Loading state
  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} py={8}>
        <Container maxW="container.xl">
          <Center minH="60vh">
            <VStack spacing={4}>
              <Spinner size="xl" color="brand.500" thickness="4px" />
              <Text fontSize="lg" color="gray.600">
                Loading shared report...
              </Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box minH="100vh" bg={bgColor} py={8}>
        <Container maxW="container.xl">
          <Center minH="60vh">
            <VStack spacing={6} maxW="md" textAlign="center">
              <Alert
                status="error"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                height="200px"
                borderRadius="lg"
              >
                <AlertIcon boxSize="40px" mr={0} />
                <AlertTitle mt={4} mb={1} fontSize="lg">
                  Report Not Available
                </AlertTitle>
                <AlertDescription maxWidth="sm" fontSize="md">
                  {error.message}
                </AlertDescription>
              </Alert>
              
              <Button
                leftIcon={<Icon as={FaHome as React.ElementType} />}
                colorScheme="brand"
                onClick={() => navigate('/')}
              >
                Go to Homepage
              </Button>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  // Success state - render the report
  if (!sharedReport) {
    return null;
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box bg={cardBg} borderBottom="1px" borderColor="gray.200" py={4} className="no-print">
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FaFilePdf as React.ElementType} color="red.500" boxSize={6} />
              <VStack align="start" spacing={0}>
                <Text fontSize="lg" fontWeight="bold">
                  Shared Property Report
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {sharedReport.propertyAddress}
                </Text>
              </VStack>
            </HStack>
            
            <HStack spacing={3}>
              <Text fontSize="sm" color="gray.500">
                Strategy: <strong>{sharedReport.reportStrategy === 'rent' ? 'BRRRR/Rental' : 'Fix & Flip'}</strong>
              </Text>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/')}
                leftIcon={<Icon as={FaHome as React.ElementType} />}
              >
                Rehouzd Home
              </Button>
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Report Content */}
      <Container maxW="container.xl" py={6}>
        <Box bg={cardBg} borderRadius="lg" overflow="hidden" boxShadow="lg">
          <InvestorReport 
            reportStrategy={sharedReport.reportStrategy}
            presetValues={sharedReport.presetValues}
            estimateData={sharedReport.estimateData}
            isSharedView={true}
          />
        </Box>
      </Container>

      {/* Footer */}
      <Box bg={cardBg} borderTop="1px" borderColor="gray.200" py={6} mt={8} className="no-print">
        <Container maxW="container.xl">
          <VStack spacing={4} textAlign="center">
            <Text fontSize="sm" color="gray.600">
              This report was generated by <strong>Rehouzd</strong> - Professional Real Estate Investment Analysis
            </Text>
            <Button
              colorScheme="brand"
              onClick={() => navigate('/')}
              size="lg"
            >
              Create Your Own Report
            </Button>
          </VStack>
        </Container>
      </Box>

      {/* Print-specific styles */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              background: white !important;
            }
            
            .chakra-container {
              max-width: none !important;
              padding: 0 !important;
            }
            
            .chakra-box {
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default SharedReportPage;
