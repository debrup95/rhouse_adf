import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerBody,
  DrawerCloseButton,
  Button,
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  Flex,
  Badge,
  useColorModeValue,
  Divider,
  Link,
  useDisclosure,
  Spinner,
} from '@chakra-ui/react';
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEye,
  FaLock,
  FaBuilding,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import { Buyer } from '../store/buyerSlice';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addSkipTraceResult, selectSkipTraceResults } from '../store/skipTraceSlice';
import { skipTraceService } from '../services/skipTraceService';
import SkipTraceFlowModal from './SkipTraceFlowModal';
// Remove PhoneVerificationModal import
import phoneVerificationService from '../services/phoneVerificationService';
import emailVerificationService from '../services/emailVerificationService';

interface ContactInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer;
  skipTraceCredits: { free: number; paid: number };
}

interface ContactData {
  phones: any[]; // Can be strings or objects with verification data
  emails: string[];
  addresses: string[];
  ownerNames: string[];
  isSkipTraced: boolean;
  skipTraceDate?: string;
}

const ContactInfoDrawer: React.FC<ContactInfoDrawerProps> = ({
  isOpen,
  onClose,
  buyer,
  skipTraceCredits,
}) => {
  // Get skip trace results from Redux store
  const skipTraceResults = useAppSelector(selectSkipTraceResults);
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  
  // Local state for loading and backend results
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [backendSkipTraceResult, setBackendSkipTraceResult] = useState<any>(null);
  
  // Add state for fresh verification data
  const [freshVerificationData, setFreshVerificationData] = useState<any>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  
  // Add state for email verification
  const [freshEmailVerificationData, setFreshEmailVerificationData] = useState<any>(null);
  const [isLoadingEmailVerification, setIsLoadingEmailVerification] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  
  // Fetch skip trace history from backend when drawer opens
  useEffect(() => {
    const fetchSkipTraceHistory = async () => {
      if (isOpen && buyer && user?.user_id) {
        setIsLoadingHistory(true);
        try {
          const userId = parseInt(user.user_id.toString(), 10);
          
          // Clear potentially corrupted cache to ensure fresh data
          const cacheKey = `skipTrace_${userId}`;
          const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
          
          // For now, always clear cache to ensure we get fresh, correct data
          localStorage.removeItem(cacheKey);
          
          // Make API call to get fresh data
          const historyResponse = await skipTraceService.getSkipTraceHistory(userId);
          
          if (historyResponse.success && historyResponse.results) {
            // Cache the results for future use
            const cacheData = {
              results: historyResponse.results,
              timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            // Find any existing skip trace for this buyer by the current user
            const existingResult = historyResponse.results.find((result: any) => 
              result.buyerName?.toLowerCase().trim() === buyer.name?.toLowerCase().trim()
            );
            
            if (existingResult) {
              // Use the existing result as-is (backend already returns user-specific data)
              const resultWithUserId = {
                ...existingResult,
                userId: user?.user_id?.toString()
              };
              
              setBackendSkipTraceResult(resultWithUserId);
              
              // Also add to Redux store if not already there
              const reduxResult = skipTraceResults.find(result => 
                result.lookupId === existingResult.lookupId && 
                result.userId === user?.user_id?.toString()
              );
              
              if (!reduxResult) {
                dispatch(addSkipTraceResult(resultWithUserId));
              }
            }
          }
        } catch (error) {
          // Failed to fetch skip trace history
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };
    
    fetchSkipTraceHistory();
  }, [isOpen, buyer, user?.user_id, dispatch]);

  // Fetch fresh phone verification data when drawer opens for cached results
  useEffect(() => {
    const fetchFreshVerificationData = async () => {
      if (isOpen && buyer && user?.user_id) {
        // Check if we have cached skip trace results (indicating this buyer was already skip traced)
        const buyerSkipTraceResult = skipTraceResults.find(result => {
          const nameMatch = result.buyerName?.toLowerCase().trim() === buyer.name?.toLowerCase().trim();
          const idMatch = result.buyerId && buyer.id && (
            result.buyerId === buyer.id || 
            result.buyerId === buyer.id.toString() ||
            result.buyerId.toString() === buyer.id.toString()
          );
          const userMatch = result.userId === user?.user_id?.toString();
          return userMatch && (nameMatch || idMatch);
        }) || backendSkipTraceResult;

        // If we have cached results with phone numbers, fetch fresh verification data
        if (buyerSkipTraceResult && buyerSkipTraceResult.phones && buyerSkipTraceResult.phones.length > 0) {
          setIsLoadingVerification(true);
          try {
            // Fetching fresh phone verification data for cached result

            const phoneNumbers = buyerSkipTraceResult.phones.map((phone: any) => {
              const phoneNumber = typeof phone === 'string' ? phone : phone.number || phone;
              return phoneNumber.replace(/\D/g, ''); // Clean phone number
            });

            const freshStats = await phoneVerificationService.getPhoneVerificationStats(
              buyer.name,
              phoneNumbers
            );

            if (freshStats.success && freshStats.verificationStats) {
              // Fresh verification data fetched
              setFreshVerificationData(freshStats.verificationStats);
            } else {
              // Failed to fetch fresh verification data
            }
          } catch (error) {
            // Error fetching fresh verification data
          } finally {
            setIsLoadingVerification(false);
          }
        }
      }
    };

    fetchFreshVerificationData();
  }, [isOpen, buyer, user?.user_id, skipTraceResults, backendSkipTraceResult]);

  // Fetch fresh email verification data when drawer opens for cached results
  useEffect(() => {
    const fetchFreshEmailVerificationData = async () => {
      if (isOpen && buyer && user?.user_id) {
        // Check if we have cached skip trace results (indicating this buyer was already skip traced)
        const buyerSkipTraceResult = skipTraceResults.find(result => {
          const nameMatch = result.buyerName?.toLowerCase().trim() === buyer.name?.toLowerCase().trim();
          const idMatch = result.buyerId && buyer.id && (
            result.buyerId === buyer.id || 
            result.buyerId === buyer.id.toString() ||
            result.buyerId.toString() === buyer.id.toString()
          );
          const userMatch = result.userId === user?.user_id?.toString();
          return userMatch && (nameMatch || idMatch);
        }) || backendSkipTraceResult;

        // If we have cached results with emails, fetch fresh verification data
        if (buyerSkipTraceResult && buyerSkipTraceResult.emails && buyerSkipTraceResult.emails.length > 0) {
          setIsLoadingEmailVerification(true);
          try {
            console.log('🔄 Fetching fresh email verification data for cached result', {
              buyerName: buyer.name,
              emailCount: buyerSkipTraceResult.emails.length
            });

            const emails = buyerSkipTraceResult.emails.map((email: any) => {
              const emailAddress = typeof email === 'string' ? email : email.email || email;
              return emailVerificationService.cleanEmail(emailAddress);
            });

            const freshEmailStats = await emailVerificationService.getEmailVerificationStats(
              buyer.name,
              emails
            );

            if (freshEmailStats.success && freshEmailStats.verificationStats) {
              console.log('✅ Fresh email verification data fetched', {
                buyerName: buyer.name,
                statsCount: freshEmailStats.verificationStats.length,
                stats: freshEmailStats.verificationStats
              });
              setFreshEmailVerificationData(freshEmailStats.verificationStats);
            } else {
              console.warn('⚠️ Failed to fetch fresh email verification data', freshEmailStats);
            }
          } catch (error) {
            console.error('❌ Error fetching fresh email verification data:', error);
          } finally {
            setIsLoadingEmailVerification(false);
          }
        }
      }
    };

    fetchFreshEmailVerificationData();
  }, [isOpen, buyer, user?.user_id, skipTraceResults, backendSkipTraceResult]);
  
  // Find skip trace result for this buyer BY CURRENT USER with improved matching
  // Check both Redux store and backend results
  const buyerSkipTraceResult = skipTraceResults.find(result => {
    // Match by buyer name (most reliable)
    const nameMatch = result.buyerName?.toLowerCase().trim() === buyer.name?.toLowerCase().trim();
    
    // Match by buyer ID if both exist
    const idMatch = result.buyerId && buyer.id && (
      result.buyerId === buyer.id || 
      result.buyerId === buyer.id.toString() ||
      result.buyerId.toString() === buyer.id.toString()
    );
    
    // Must be for current user
    const userMatch = result.userId === user?.user_id?.toString();
    
    return userMatch && (nameMatch || idMatch);
  }) || backendSkipTraceResult; // Fallback to backend result if not in Redux
  
  // Contact data based on skip trace results with fresh verification data
  const contactData: ContactData = {
    phones: (() => {
      const basePhones = buyerSkipTraceResult?.phones || [];
      
      // If we have fresh verification data, merge it with the base phone data
      if (freshVerificationData && freshVerificationData.length > 0) {
        return basePhones.map((phone: any) => {
          const phoneNumber = typeof phone === 'string' ? phone : phone.number || phone;
          const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
          
          // Find matching verification data
          const verificationStat = freshVerificationData.find((stat: any) => 
            stat.phoneNumber === cleanedPhoneNumber
          );
          
          if (verificationStat) {
            // Merge fresh verification data
            const updatedPhone = typeof phone === 'string' 
              ? {
                  number: phone,
                  type: 'Unknown',
                  confidence: 'Medium'
                }
              : { ...phone };
            
            updatedPhone.verification = {
              verifiedCount: verificationStat.verifiedCount || 0,
              invalidCount: verificationStat.invalidCount || 0,
              netScore: verificationStat.netScore || 0,
              status: verificationStat.verificationStatus || 'unverified'
            };
            
            console.log('🔄 Updated phone with fresh verification', {
              phoneNumber: cleanedPhoneNumber,
              oldVerification: typeof phone === 'object' ? phone.verification : 'none',
              newVerification: updatedPhone.verification
            });
            
            return updatedPhone;
          }
          
          return phone;
        });
      }
      
      return basePhones;
    })(),
    emails: (() => {
      const baseEmails = buyerSkipTraceResult?.emails || [];
      
      // If we have fresh email verification data, merge it with the base email data
      if (freshEmailVerificationData && freshEmailVerificationData.length > 0) {
        return baseEmails.map((email: any) => {
          const emailAddress = typeof email === 'string' ? email : email.email || email;
          const cleanedEmail = emailVerificationService.cleanEmail(emailAddress);
          
          // Find matching verification data
          const verificationStat = freshEmailVerificationData.find((stat: any) => 
            stat.email === cleanedEmail
          );
          
          if (verificationStat) {
            // Merge fresh verification data
            const updatedEmail = typeof email === 'string' 
              ? {
                  email: email,
                  type: 'Unknown',
                  confidence: 'Medium'
                }
              : { ...email };
            
            updatedEmail.verification = {
              verifiedCount: verificationStat.verifiedCount || 0,
              invalidCount: verificationStat.invalidCount || 0,
              netScore: verificationStat.netScore || 0,
              status: verificationStat.verificationStatus || 'unverified'
            };
            
            console.log('🔄 Updated email with fresh verification', {
              email: cleanedEmail,
              oldVerification: typeof email === 'object' ? email.verification : 'none',
              newVerification: updatedEmail.verification
            });
            
            return updatedEmail;
          }
          
          return email;
        });
      }
      
      return baseEmails;
    })(),
    addresses: (() => {
      const addresses: string[] = [];
      
      // Add buyer's main address if it exists
      if (buyer.address) {
        addresses.push(buyer.address);
      }
      
      return addresses;
    })(),
    ownerNames: (() => {
      const names: string[] = [];
      

      
      // Extract owner names from matched owners (provider-agnostic)
      if (buyerSkipTraceResult?.matchedOwners) {
        
        buyerSkipTraceResult.matchedOwners.forEach((owner: any) => {
          // Case 1: Direct string name
          if (typeof owner === 'string') {
            if (!names.includes(owner)) {
              names.push(owner);
            }
          }
          // Case 2: Object with name property (BatchData format)
          else if (owner.name && typeof owner.name === 'string') {
            if (!names.includes(owner.name)) {
              names.push(owner.name);
            }
          }
          // Case 3: Object with owner.person_name (LeadSherpa format)
          else if (owner.owner && owner.owner.person_name) {
            const personName = owner.owner.person_name;
            const fullName = `${personName.first_name || ''} ${personName.last_name || ''}`.trim();
            if (fullName && !names.includes(fullName)) {
              names.push(fullName);
            }
          }
          // Case 4: Object is the name itself
          else if (owner.toString && typeof owner.toString() === 'string') {
            const nameStr = owner.toString().trim();
            if (nameStr && !names.includes(nameStr)) {
              names.push(nameStr);
            }
          }
        });
      }
      
      return names;
    })(),
    isSkipTraced: !!buyerSkipTraceResult,
    skipTraceDate: buyerSkipTraceResult?.lookupDate ? 
      new Date(buyerSkipTraceResult.lookupDate).toLocaleDateString() : undefined,
  };

  // Skip Trace Flow Modal state
  const { isOpen: isSkipTraceModalOpen, onOpen: onOpenSkipTraceModal, onClose: onCloseSkipTraceModal } = useDisclosure();


  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.300');

  // Function to blur text
  const blurText = (text: string) => {
    return text.replace(/./g, '●');
  };

  const handleSkipTrace = () => {
    onOpenSkipTraceModal();
  };

  const handleSkipTraceComplete = (results: any) => {
    // Add skip trace result to Redux store with user ID
    const resultWithUserId = {
      ...results,
      userId: user?.user_id?.toString() // Associate result with current user
    };
    dispatch(addSkipTraceResult(resultWithUserId));
    
    // Also update local backend result state
    setBackendSkipTraceResult(resultWithUserId);
    
    // Update localStorage cache to include the new result
    if (user?.user_id) {
      const userId = parseInt(user.user_id.toString(), 10);
      const cacheKey = `skipTrace_${userId}`;
      
      try {
        const cached = localStorage.getItem(cacheKey);
        let cachedData = { results: [], timestamp: Date.now() };
        
        if (cached) {
          cachedData = JSON.parse(cached);
        }
        
        // Add new result to cached data
        const updatedResults = [resultWithUserId, ...cachedData.results];
        const newCacheData = {
          results: updatedResults,
          timestamp: Date.now()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(newCacheData));
        console.log('Updated skip trace cache with new result');
      } catch (error) {
        console.error('Error updating skip trace cache:', error);
      }
    }
  };

  const handleVerifyPhone = async (phoneNumber: string, verificationStatus: 'verified' | 'invalid') => {
    if (!user?.user_id) {
      console.error('User authentication required for phone verification');
      return;
    }

    setVerifyingPhone(phoneNumber);

    try {
      console.log('🔄 Directly verifying phone number', {
        phoneNumber,
        buyerName: buyer.name,
        verificationStatus,
        userId: user.user_id
      });

      const response = await phoneVerificationService.verifyPhone({
        user_id: parseInt(user.user_id.toString(), 10),
        phoneNumber,
        buyerName: buyer.name,
        verificationStatus,
      });

      if (response.success) {
        console.log('✅ Phone verification successful:', response);
        
                 // Update the fresh verification data state
         if (freshVerificationData && response.verification) {
           const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
           
           setFreshVerificationData((prevData: any) => {
             return prevData.map((stat: any) => {
               if (stat.phoneNumber === cleanedPhoneNumber) {
                 return {
                   ...stat,
                                     verifiedCount: response.verification?.verifiedCount || 0,
                  invalidCount: response.verification?.invalidCount || 0,
                  netScore: response.verification?.netScore || 0,
                  verificationStatus: verificationStatus // Use the user's verification choice, not the overall status
                 };
               }
               return stat;
             });
           });
           
           console.log('✅ Updated fresh verification data for phone:', cleanedPhoneNumber);
         }
        
                 // Update the contact data with new verification status
         if (contactData && response.verification) {
           const updatedContactData = { ...contactData };
           
           // Find and update the specific phone number
           updatedContactData.phones = updatedContactData.phones.map((phone: any) => {
             const phoneNumberStr = typeof phone === 'string' ? phone : phone.number || phone;
             const cleanedPhoneNumber = phoneNumberStr.replace(/\D/g, '');
             const verificationPhoneNumber = phoneNumber.replace(/\D/g, '');
             
             if (cleanedPhoneNumber === verificationPhoneNumber) {
               // Update this phone's verification data
               if (typeof phone === 'string') {
                 // Convert string format to object format with verification
                 return {
                   number: phone,
                   type: 'Unknown',
                   confidence: 'Medium',
                   verification: {
                     verifiedCount: response.verification?.verifiedCount || 0,
                     invalidCount: response.verification?.invalidCount || 0,
                     netScore: response.verification?.netScore || 0,
                     status: verificationStatus // Use the user's verification choice, not the overall status
                   }
                 };
               } else {
                 // Update existing object format
                 return {
                   ...phone,
                   verification: {
                     verifiedCount: response.verification?.verifiedCount || 0,
                     invalidCount: response.verification?.invalidCount || 0,
                     netScore: response.verification?.netScore || 0,
                     status: verificationStatus // Use the user's verification choice, not the overall status
                   }
                 };
               }
             }
             return phone;
           });
          
          // Update backend skip trace result if it exists
          if (backendSkipTraceResult) {
            const updatedBackendResult = { ...backendSkipTraceResult };
            updatedBackendResult.phones = updatedContactData.phones;
            setBackendSkipTraceResult(updatedBackendResult);
            
            // Also update Redux store
            dispatch(addSkipTraceResult(updatedBackendResult));
          }
          
          console.log('Updated contact data with verification:', updatedContactData);
        }
             } else {
         console.error('❌ Phone verification failed:', response.message);
       }
     } catch (error: any) {
       console.error('❌ Error verifying phone:', error);
     } finally {
       setVerifyingPhone(null);
     }
   };

  const handleVerifyEmail = async (email: string, verificationStatus: 'verified' | 'invalid') => {
    if (!user?.user_id) {
      console.error('User authentication required for email verification');
      return;
    }

    setVerifyingEmail(email);

    try {
      console.log('🔄 Directly verifying email', {
        email,
        buyerName: buyer.name,
        verificationStatus,
        userId: user.user_id
      });

      const response = await emailVerificationService.verifyEmail({
        user_id: parseInt(user.user_id.toString(), 10),
        email,
        buyerName: buyer.name,
        verificationStatus,
      });

      if (response.success) {
        console.log('✅ Email verification successful:', response);
        
        // Update the fresh email verification data state
        if (freshEmailVerificationData && response.verification) {
          const cleanedEmail = emailVerificationService.cleanEmail(email);
          
          setFreshEmailVerificationData((prevData: any) => {
            return prevData.map((stat: any) => {
              if (stat.email === cleanedEmail) {
                return {
                  ...stat,
                  verifiedCount: response.verification?.verifiedCount || 0,
                  invalidCount: response.verification?.invalidCount || 0,
                  netScore: response.verification?.netScore || 0,
                  verificationStatus: verificationStatus // Use the user's verification choice, not the overall status
                };
              }
              return stat;
            });
          });
          
          console.log('✅ Updated fresh email verification data for email:', cleanedEmail);
        }
        
        // Update the contact data with new verification status
        if (contactData && response.verification) {
          const updatedContactData = { ...contactData };
          
          // Find and update the specific email
          updatedContactData.emails = updatedContactData.emails.map((emailItem: any) => {
            const emailAddress = typeof emailItem === 'string' ? emailItem : emailItem.email || emailItem;
            const cleanedEmailAddress = emailVerificationService.cleanEmail(emailAddress);
            const verificationEmail = emailVerificationService.cleanEmail(email);
            
            if (cleanedEmailAddress === verificationEmail) {
              // Update this email's verification data
              if (typeof emailItem === 'string') {
                // Convert string format to object format with verification
                return {
                  email: emailItem,
                  type: 'Unknown',
                  confidence: 'Medium',
                  verification: {
                    verifiedCount: response.verification?.verifiedCount || 0,
                    invalidCount: response.verification?.invalidCount || 0,
                    netScore: response.verification?.netScore || 0,
                    status: verificationStatus // Use the user's verification choice, not the overall status
                  }
                };
              } else {
                // Update existing object format
                return {
                  ...emailItem,
                  verification: {
                    verifiedCount: response.verification?.verifiedCount || 0,
                    invalidCount: response.verification?.invalidCount || 0,
                    netScore: response.verification?.netScore || 0,
                    status: verificationStatus // Use the user's verification choice, not the overall status
                  }
                };
              }
            }
            return emailItem;
          });
          
          // Update backend skip trace result if it exists
          if (backendSkipTraceResult) {
            const updatedBackendResult = { ...backendSkipTraceResult };
            updatedBackendResult.emails = updatedContactData.emails;
            setBackendSkipTraceResult(updatedBackendResult);
            
            // Also update Redux store
            dispatch(addSkipTraceResult(updatedBackendResult));
          }
          
          console.log('Updated contact data with email verification:', updatedContactData);
        }
      } else {
        console.error('❌ Email verification failed:', response.message);
      }
    } catch (error: any) {
      console.error('❌ Error verifying email:', error);
    } finally {
      setVerifyingEmail(null);
    }
  };

  // Remove handleVerificationComplete function since we're not using the modal anymore

  const totalCredits = skipTraceCredits.free + skipTraceCredits.paid;
  const hasCredits = totalCredits > 0;

  return (
    <>
      <Drawer 
        isOpen={isOpen} 
        onClose={onClose} 
        placement="left" 
        size="md"
        autoFocus={false}
      >
        <DrawerOverlay 
          backdropFilter="blur(4px)" 
          bg="blackAlpha.300" 
        />
        <DrawerContent 
          bg={bgColor} 
          boxShadow="dark-lg" 
          maxH="100vh"
          onWheel={(e) => e.stopPropagation()} // Fix scrolling by preventing event interference
        >
          <DrawerCloseButton
            size="lg"
            color="brand.500"
            bg="white"
            borderRadius="full"
            zIndex={10}
            top={4}
            right={4}
            _hover={{ bg: "gray.100" }}
          />
          
          <DrawerHeader borderBottomWidth="1px" borderColor={borderColor} py={6}>
            <VStack align="stretch" spacing={2}>
              <HStack>
                <Text fontSize="lg" fontWeight="bold">
                  {buyer.name} - Contact Information
                </Text>
                {(isLoadingHistory || isLoadingVerification) && <Spinner size="sm" color="brand.500" />}
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme={contactData.isSkipTraced ? 'green' : 'gray'} variant="solid">
                  {contactData.isSkipTraced ? 'Skip Traced' : 'Not Skip Traced'}
                </Badge>
                {contactData.skipTraceDate && (
                  <Badge colorScheme="blue" variant="outline">
                    {contactData.skipTraceDate}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </DrawerHeader>

          <DrawerBody 
            py={6} 
            overflowY="auto"
            sx={{
              scrollBehavior: 'smooth',
              msOverflowStyle: 'auto',
              touchAction: 'pan-y',
            }}
          >
            <VStack spacing={6} align="stretch">
              {/* Phone Numbers Section */}
              <Box>
                <HStack mb={3}>
                  <Icon as={FaPhone as React.ElementType} color={brandColor} />
                  <Text fontWeight="semibold">Phone Numbers</Text>
                  <Badge colorScheme="blue" variant="outline" fontSize="xs">
                    {contactData.phones.length}
                  </Badge>
                </HStack>
                <VStack spacing={2} align="stretch" pl={6}>
                  {contactData.phones.map((phone: any, index) => {
                    // Handle both old format (string) and new format (object with verification)
                    const phoneNumber = typeof phone === 'string' ? phone : phone.number || phone;
                    const verification = typeof phone === 'object' && phone.verification ? phone.verification : null;
                    
                    return (
                      <Box key={index} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                        <VStack spacing={3} align="stretch">
                          {/* Phone number and status */}
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Text 
                                fontFamily="mono"
                                filter={contactData.isSkipTraced ? 'none' : 'blur(4px)'}
                                color={contactData.isSkipTraced ? 'inherit' : mutedTextColor}
                                fontSize="sm"
                                fontWeight="semibold"
                              >
                                {contactData.isSkipTraced ? phoneVerificationService.formatPhoneNumber(phoneNumber) : blurText(phoneNumber)}
                              </Text>
                              
                              {/* Verification status */}
                              {contactData.isSkipTraced && verification && (
                                <HStack spacing={2}>
                                  <Badge 
                                    colorScheme={phoneVerificationService.getVerificationBadgeColor(verification.status)} 
                                    variant="solid"
                                    fontSize="xs"
                                  >
                                    {verification.status.toUpperCase()}
                                  </Badge>
                                  {(verification.verifiedCount > 0 || verification.invalidCount > 0) && (
                                    <Text fontSize="xs" color="gray.500">
                                      {verification.verifiedCount > 0 && `${verification.verifiedCount} verified`}
                                      {verification.verifiedCount > 0 && verification.invalidCount > 0 && ', '}
                                      {verification.invalidCount > 0 && `${verification.invalidCount} invalid`}
                                      {(verification.verifiedCount + verification.invalidCount) > 1 && ' by users'}
                                    </Text>
                                  )}
                                </HStack>
                              )}
                            </VStack>
                            
                            {contactData.isSkipTraced && (
                              <Link href={`tel:${phoneNumber}`} color={brandColor} fontSize="sm">
                                Call
                              </Link>
                            )}
                          </HStack>

                          {/* Verification buttons */}
                          {contactData.isSkipTraced && (
                            <HStack spacing={2} justify="flex-end">
                              <Button
                                size="xs"
                                colorScheme="green"
                                variant="outline"
                                onClick={() => handleVerifyPhone(phoneNumber, 'verified')}
                                leftIcon={<Icon as={FaCheckCircle as React.ElementType} />}
                                isLoading={verifyingPhone === phoneNumber}
                                loadingText="Verifying..."
                                disabled={verifyingPhone !== null}
                              >
                                Mark Verified
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => handleVerifyPhone(phoneNumber, 'invalid')}
                                leftIcon={<Icon as={FaTimesCircle as React.ElementType} />}
                                isLoading={verifyingPhone === phoneNumber}
                                loadingText="Marking..."
                                disabled={verifyingPhone !== null}
                              >
                                Mark Invalid
                              </Button>
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>

              <Divider />

              {/* Email Addresses Section */}
              <Box>
                <HStack mb={3}>
                  <Icon as={FaEnvelope as React.ElementType} color={brandColor} />
                  <Text fontWeight="semibold">Email Addresses</Text>
                  <Badge colorScheme="blue" variant="outline" fontSize="xs">
                    {contactData.emails.length}
                  </Badge>
                </HStack>
                <VStack spacing={2} align="stretch" pl={6}>
                  {contactData.emails.map((emailItem: any, index) => {
                    const emailAddress = typeof emailItem === 'string' ? emailItem : emailItem.email || emailItem;
                    const verification = typeof emailItem === 'object' && emailItem.verification ? emailItem.verification : null;
                    
                    return (
                      <Box key={index} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                        <VStack spacing={3} align="stretch">
                          {/* Email address and status */}
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Text 
                                fontFamily="mono"
                                filter={contactData.isSkipTraced ? 'none' : 'blur(4px)'}
                                color={contactData.isSkipTraced ? 'inherit' : mutedTextColor}
                                fontSize="sm"
                                fontWeight="semibold"
                                wordBreak="break-all"
                              >
                                {contactData.isSkipTraced ? emailAddress : blurText(emailAddress)}
                              </Text>
                              
                              {/* Verification status */}
                              {contactData.isSkipTraced && verification && (
                                <HStack spacing={2}>
                                  <Badge 
                                    colorScheme={emailVerificationService.getVerificationBadgeColor(verification.status)} 
                                    variant="solid"
                                    fontSize="xs"
                                  >
                                    {verification.status.toUpperCase()}
                                  </Badge>
                                  {(verification.verifiedCount > 0 || verification.invalidCount > 0) && (
                                    <Text fontSize="xs" color="gray.500">
                                      {verification.verifiedCount > 0 && `${verification.verifiedCount} verified`}
                                      {verification.verifiedCount > 0 && verification.invalidCount > 0 && ', '}
                                      {verification.invalidCount > 0 && `${verification.invalidCount} invalid`}
                                      {(verification.verifiedCount + verification.invalidCount) > 1 && ' by users'}
                                    </Text>
                                  )}
                                </HStack>
                              )}
                            </VStack>
                            
                            {contactData.isSkipTraced && (
                              <Link href={`mailto:${emailAddress}`} color={brandColor} fontSize="sm">
                                Email
                              </Link>
                            )}
                          </HStack>

                          {/* Verification buttons */}
                          {contactData.isSkipTraced && (
                            <HStack spacing={2} justify="flex-end">
                              <Button
                                size="xs"
                                colorScheme="green"
                                variant="outline"
                                onClick={() => handleVerifyEmail(emailAddress, 'verified')}
                                leftIcon={<Icon as={FaCheckCircle as React.ElementType} />}
                                isLoading={verifyingEmail === emailAddress}
                                loadingText="Verifying..."
                                disabled={verifyingEmail !== null}
                              >
                                Mark Verified
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => handleVerifyEmail(emailAddress, 'invalid')}
                                leftIcon={<Icon as={FaTimesCircle as React.ElementType} />}
                                isLoading={verifyingEmail === emailAddress}
                                loadingText="Marking..."
                                disabled={verifyingEmail !== null}
                              >
                                Mark Invalid
                              </Button>
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>

              <Divider />

              {/* Owner Names Section */}
              {contactData.ownerNames.length > 0 && (
                <Box>
                  <HStack mb={3}>
                    <Icon as={FaUser as React.ElementType} color={brandColor} />
                    <Text fontWeight="semibold">Owner Names</Text>
                    <Badge colorScheme="blue" variant="outline" fontSize="xs">
                      {contactData.ownerNames.length}
                    </Badge>
                  </HStack>
                  <VStack spacing={2} align="stretch" pl={6}>
                    {contactData.ownerNames.map((name, index) => (
                      <Box key={index} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                        <HStack justify="space-between">
                          <Text 
                            fontSize="sm"
                            color={contactData.isSkipTraced ? 'inherit' : mutedTextColor}
                            fontWeight="medium"
                          >
                            {contactData.isSkipTraced ? name : blurText(name)}
                          </Text>
                          {contactData.isSkipTraced && (
                            <Badge colorScheme="purple" variant="outline" fontSize="xs">
                              Owner
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              <Divider />

              {/* Physical Addresses Section */}
              <Box>
                <HStack mb={3}>
                  <Icon as={FaMapMarkerAlt as React.ElementType} color={brandColor} />
                  <Text fontWeight="semibold">Known Addresses</Text>
                  <Badge colorScheme="blue" variant="outline" fontSize="xs">
                    {contactData.addresses.length}
                  </Badge>
                </HStack>
                <VStack spacing={2} align="stretch" pl={6}>
                  {contactData.addresses.map((address, index) => (
                    <Box key={index} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                      <Text fontSize="sm">{address}</Text>
                      <Text fontSize="xs" color={mutedTextColor} mt={1}>
                        Buyer Address
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* Skip Trace Info Box */}
              {!contactData.isSkipTraced && !isLoadingHistory && (
                <>
                  <Divider />
                  <Box 
                    p={4} 
                    bg="blue.50" 
                    borderRadius="md" 
                    borderWidth="1px" 
                    borderColor="blue.200"
                  >
                    <HStack spacing={3}>
                      <Icon as={FaLock as React.ElementType} color="blue.500" />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold" color="blue.700" fontSize="sm">
                          Skip Trace Required
                        </Text>
                        <Text fontSize="xs" color="blue.600">
                          We’ll do the digging for you. Skip-trace buyer phone number and email.
                        </Text>
                        <Text fontSize="xs" color="blue.600">
                          Cost: 1 credit (${hasCredits ? '0.15' : 'No credits available'})
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </>
              )}
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" borderColor={borderColor} py={4}>
            <VStack spacing={3} w="100%">
              {!contactData.isSkipTraced && !isLoadingHistory && (
                <Button 
                  colorScheme="brand" 
                  onClick={handleSkipTrace}
                  w="100%"
                  leftIcon={<Icon as={FaEye as React.ElementType} />}
                  size="md"
                >
                  {hasCredits ? 'Skip Trace Contact (1 Credit)' : 'Buy Credits & Skip Trace'}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={onClose} 
                w="100%"
                size="md"
              >
                Close
              </Button>
            </VStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Skip Trace Flow Modal */}
      <SkipTraceFlowModal
        isOpen={isSkipTraceModalOpen}
        onClose={onCloseSkipTraceModal}
        buyer={buyer}
        skipTraceCredits={skipTraceCredits}
        onSkipTraceComplete={handleSkipTraceComplete}
      />

      {/* Remove Phone Verification Modal */}
      {/* {verificationModalData && (
        <PhoneVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={onCloseVerificationModal}
          phoneNumber={verificationModalData.phoneNumber}
          buyerName={verificationModalData.buyerName}
          verificationStatus={verificationModalData.verificationStatus}
          onVerificationComplete={handleVerificationComplete}
        />
      )} */}
    </>
  );
};

export default ContactInfoDrawer; 