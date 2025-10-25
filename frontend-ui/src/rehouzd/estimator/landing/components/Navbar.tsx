import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Spacer,
  Button,
  Image,
  HStack,
  Link,
  Container,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { useNavigate, useLocation } from 'react-router-dom';
//import AuthModal from '../../auth/AuthModal';
import { FiDollarSign, FiBarChart2 } from 'react-icons/fi';
import { setUserData, clearUserData } from '../../store/userSlice';
import { removeProperty, clearPropertyData } from '../../store/propertySlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAddressData } from "../../store/addressSlice";
import { clearUserSkipTraceResults } from '../../store/skipTraceSlice';
import { resetUnderwriteValues } from '../../store/underwriteSlice';
import { resetBuyerMatchingState } from '../../store/buyerMatchingSlice';
import { clearCreditData } from '../../store/creditSlice';
import { IconType } from 'react-icons';
import config from '../../../../config';

// Define icon types more explicitly
interface NavItem {
  name: string;
  icon: IconType;
  path: string;
}

interface NavbarProps {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  onAuthOpen: (plan?: string) => void;
}


const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, setIsLoggedIn, onAuthOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const logoPath = '/rehouzd-logo.png';
  const { isOpen, onOpen, onClose } = useDisclosure(); // For mobile drawer

  const user = useAppSelector(state => state.user);

  // Navbar styles using brand colors from the theme
  const navBg = 'background.primary'; // white
  const navShadow = 'sm';
  const navTextColor = 'text.primary'; // gray.700
  const activeNavItemBg = 'tag.light'; // light green for active items
  const activeNavItemColor = 'brand.500'; // brand color

  // Menu styling
  const menuBg = 'background.primary'; // white
  const menuColor = 'text.primary'; // gray.800
  const menuHoverBg = 'background.secondary'; // gray.100
  const menuBorderColor = 'border.primary'; // gray.200

  // Check for user authentication - now using Redux state
  useEffect(() => {
    if (user.isLoggedIn) {
      setIsLoggedIn(true);
    }
  }, [user.isLoggedIn, setIsLoggedIn]);
  
  // Check for plan selection in URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const plan = queryParams.get('plan');
    
    if (plan) {
      // If a plan is specified in the query params, open the auth modal with that plan
      if (plan === 'free') {
        onAuthOpen('Free Plan ($0/month)');
      } else if (plan === 'professional') {
        onAuthOpen('Professional Plan ($XX.xx/month)');
      }
      
      // Remove the query parameter to avoid reopening the modal on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, onAuthOpen]);

  const handleLogout = () => {
    // Clear all user-related data on logout
    dispatch(clearUserSkipTraceResults(undefined));
    dispatch(clearUserData());
    dispatch(clearAddressData());
    dispatch(clearPropertyData());
    dispatch(resetUnderwriteValues());
    
    // Clear buyer data
    dispatch({ type: 'buyers/clearBuyers' });
    
    // Clear buyer matching data
    dispatch(resetBuyerMatchingState());
    
    // Clear credit data
    dispatch(clearCreditData());
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('email'); // Keep this for backward compatibility
    
    // Navigate to home page
    navigate('/');
  };

  const handleFAQClick = () => {
    if (location.pathname === '/') {
      // If we're already on the homepage, scroll to the section
      const element = document.getElementById('faq');
      if (element) {
        const headerHeight = -7; // Approximate header height
        const elementPosition = element.offsetTop - headerHeight;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    } else {
      // If we're on a different page, navigate to homepage with hash
      navigate('/#faq');
    }
  };

  // Handle scrolling to section when coming from another page with hash
  useEffect(() => {
    if (location.hash === '#faq' && location.pathname === '/') {
      // Add a small delay to ensure the page has rendered
      setTimeout(() => {
        const element = document.getElementById('faq');
        if (element) {
          const headerHeight = -7; // Approximate header height
          const elementPosition = element.offsetTop - headerHeight;
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location.hash, location.pathname]);

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <Box 
      as="header" 
      position="sticky" 
      top="0" 
      zIndex="1300" 
      bg="white" 
      width="100%"
    >
      <Container maxW="container.xl">
        <Flex align="center" justify="space-between">
          {/* Logo */}
          <Box>
            <Image
              src={logoPath}
              alt="ReHouzd Logo"
              height="80px"
              width="200px"
              cursor="pointer"
              onClick={() => navigate('/')}
            />
          </Box>
          
          <Spacer />
          
          {/* Desktop Navigation Links */}
          <HStack spacing={8} fontFamily="heading" display={{ base: 'none', md: 'flex' }}>
          {isLoggedIn && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/estimate')}
                    fontWeight="bold"
                    fontSize="md"
                    color={isActiveRoute('/estimate') ? 'brand.500' : 'text.primary'}
                    _hover={{ color: 'brand.500' }}
                    fontFamily="heading"
                    px={4}
                  >
                    Get Estimate & Find Buyers
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/saved-estimates')}
                    fontWeight="bold"
                    fontSize="md"
                    color={isActiveRoute('/saved-estimates') ? 'brand.500' : 'text.primary'}
                    _hover={{ color: 'brand.500' }}
                    fontFamily="heading"
                    px={4}
                  >
                    Saved Estimates
                  </Button>
                </>
              )}
            <Button
              variant="ghost"
              onClick={handleFAQClick}
              fontWeight="bold"
              fontSize="md"
              color={location.pathname === '/' && location.hash === '#faq' ? 'brand.500' : 'text.primary'}
              _hover={{ color: 'brand.500' }}
              fontFamily="heading"
              px={4}
            >
              FAQ
            </Button>
            
            {isLoggedIn ? (
              <Menu>
                <MenuButton>
                  <Avatar size="sm" name={user.email} cursor="pointer" />
                </MenuButton>
                <MenuList bg={menuBg} color={menuColor} borderColor={menuBorderColor}>
                  <Text px={3} py={2} fontSize="sm" fontWeight="semibold" fontFamily="body">{user.email}</Text>
                  <MenuItem
                    _hover={{ bg: menuHoverBg }}
                    onClick={() => navigate('/account')}
                    fontFamily="body"
                  >
                    Account Settings
                  </MenuItem>
                  <MenuItem
                    _hover={{ bg: menuHoverBg }}
                    onClick={() => navigate('/skip-trace-history')}
                    fontFamily="body"
                  >
                    Skip Trace History
                  </MenuItem>
                  <MenuItem
                    _hover={{ bg: menuHoverBg }}
                    onClick={handleLogout}
                    fontFamily="body"
                  >
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                variant="ghost"
                onClick={() => onAuthOpen()}
                fontWeight="bold"
                fontSize="md"
                color="text.primary"
                colorScheme="brand"
                fontFamily="heading"
              >
                Try It Free
              </Button>
            )}
          </HStack>
          
          {/* Mobile menu button */}
          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            position="relative"
            zIndex="1400"
          />
        </Flex>
      </Container>
      
      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg={menuBg}>
          <DrawerCloseButton color={menuColor} />
          <DrawerHeader borderBottomWidth="1px" borderColor={menuBorderColor}>
            <Image
              src={logoPath}
              alt="ReHouzd Logo"
              height="40px"
              width="auto"
            />
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="start" mt={4}>
              {isLoggedIn && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/estimate');
                      onClose();
                    }}
                    fontWeight="bold"
                    fontSize="md"
                    color={isActiveRoute('/estimate') ? 'brand.500' : 'text.primary'}
                    justifyContent="flex-start"
                    width="100%"
                    fontFamily="heading"
                  >
                    Get Estimate & Find Buyers
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/saved-estimates');
                      onClose();
                    }}
                    fontWeight="bold"
                    fontSize="md"
                    color={isActiveRoute('/saved-estimates') ? 'brand.500' : 'text.primary'}
                    justifyContent="flex-start"
                    width="100%"
                    fontFamily="heading"
                  >
                    Saved Estimates
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/skip-trace-history');
                      onClose();
                    }}
                    fontWeight="bold"
                    fontSize="md"
                    color={isActiveRoute('/skip-trace-history') ? 'brand.500' : 'text.primary'}
                    justifyContent="flex-start"
                    width="100%"
                    fontFamily="heading"
                  >
                    Skip Trace History
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                onClick={() => {
                  handleFAQClick();
                  onClose();
                }}
                fontWeight="bold"
                fontSize="md"
                color={location.pathname === '/' && location.hash === '#faq' ? 'brand.500' : 'text.primary'}
                justifyContent="flex-start"
                width="100%"
                fontFamily="heading"
              >
                FAQ
              </Button>
              
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/account');
                    onClose();
                  }}
                  fontWeight="bold"
                  fontSize="md"
                  color={isActiveRoute('/account') ? 'brand.500' : 'text.primary'}
                  justifyContent="flex-start"
                  width="100%"
                  fontFamily="heading"
                >
                  Account Settings
                </Button>
              )}
              
              {!isLoggedIn ? (
                <Button
                  variant="ghost"
                  fontWeight="bold"
                  fontSize="md"
                  color="text.primary"
                  justifyContent="flex-start"
                  width="100%"
                  fontFamily="heading"
                  onClick={() => {
                    onClose();
                    onAuthOpen();
                  }}
                >
                  Try It Free
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  fontWeight="medium"
                  color="text.primary"
                  justifyContent="flex-start" 
                  width="100%"
                  onClick={() => {
                    onClose();
                    handleLogout();
                  }}
                >
                  Logout
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default Navbar;
