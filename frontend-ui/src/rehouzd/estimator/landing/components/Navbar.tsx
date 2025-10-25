import React, { useState, useEffect } from 'react';
import {
  Flex,
  Box,
  Spacer,
  IconButton,
  useColorMode,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Image,
  useColorModeValue,
  HStack,
  Tabs,
  TabList,
  Tab,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { FiLogIn } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import AuthModal from '../../auth/AuthModal';
import { setUserData, clearUserData } from '../../store/userSlice';
import { removeProperty } from '../../store/propertySlice';
import { useAppDispatch } from '../../store/hooks';
import {clearAddressData} from "../../store/addressSlice";

const Navbar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const logoPath = '/rehouzd-logo.png';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Navbar background and text color
  const navBg = useColorModeValue('gray.500', 'gray.600');
  const navTextColor = useColorModeValue('white', 'gray.100');

  // Menu styling for color mode
  const menuBg = useColorModeValue('white', 'gray.700');
  const menuColor = useColorModeValue('gray.800', 'white');
  const menuHoverBg = useColorModeValue('gray.100', 'gray.600');
  const menuBorderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('email');
    if (storedToken && storedEmail) {
      setIsLoggedIn(true);
      setUserEmail(storedEmail);
    }
  }, []);

  const handleOpenLoginModal = () => {
    setShowForgotPassword(false);
    setIsAuthModalOpen(true);
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
    setShowForgotPassword(false);
  };

  // Handler for login
  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }
    const data = await res.json();
    dispatch(
        setUserData({
          user_id: data.user.user_id,
          email: data.user.email,
          fname: data.user.fname,
          lname: data.user.lname,
          mobile: data.user.mobile,
          token: data.token,
        })
    );
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.user.email);
    localStorage.setItem(
        'user',
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          fname: data.user.fname,
          lname: data.user.lname,
          mobile: data.user.mobile,
          token: data.token,
        })
    );
    setIsLoggedIn(true);
    setUserEmail(data.user.email);
    handleCloseAuthModal();
    navigate('/estimate');
  };

  // Handler for sign-up
  const handleSignUp = async (email: string, password: string, confirm: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Sign-up failed');
    }
    alert('Sign up successful! Please log in.');
  };

  // Google login
  const handleGoogleLogin = () => {
    window.open('http://localhost:5004/api/auth/google', '_blank');
  };

  const handleLogout = () => {
    // localStorage.removeItem('token');
    // localStorage.removeItem('email');
    // localStorage.removeItem('user');
    localStorage.clear();
    dispatch(clearUserData());
    dispatch(removeProperty(0));
    dispatch(clearAddressData());
    setIsLoggedIn(false);
    setUserEmail('');
    navigate('/');
  };

  return (
      <>
        <Flex
            as="nav"
            align="center"
            justify="space-between"
            wrap="wrap"
            padding="1rem"
            bg={navBg}
            color={navTextColor}
        >
          {/* Logo */}
          <Box>
            <Image
                src={logoPath}
                alt="ReHouzd Logo"
                height="60px"
                width="100px"
                cursor="pointer"
                onClick={() => navigate('/')}
            />
          </Box>

          {/* Tabs instead of buttons */}
          <Tabs variant="soft-rounded" colorScheme="gray">
            <TabList>
              <Tab onClick={() => console.log('Features clicked')}>Features</Tab>
              <Tab onClick={() => navigate('/estimate')}>Get a Quote</Tab>
              <Tab onClick={() => console.log('Underwriting Tool clicked')}>Underwriting Tool</Tab>
            </TabList>
          </Tabs>

          <Spacer />

          <HStack spacing={4}>
            {/* Dark mode toggle */}
            <IconButton
                aria-label="Toggle dark mode"
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                color={navTextColor}
            />

            {/* User avatar / Login icon */}
            {isLoggedIn ? (
                <Menu>
                  <MenuButton>
                    <Avatar name={userEmail} size="sm" />
                  </MenuButton>
                  <MenuList bg={menuBg} color={menuColor} borderColor={menuBorderColor}>
                    <MenuItem _hover={{ bg: menuHoverBg }} onClick={() => navigate('/account')}>
                      Account Settings
                    </MenuItem>
                    <MenuItem _hover={{ bg: menuHoverBg }} onClick={handleLogout}>
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>
            ) : (
                <IconButton
                    aria-label="Open login modal"
                    onClick={handleOpenLoginModal}
                    variant="ghost"
                    color={navTextColor}
                    icon={<Icon as={FiLogIn as React.ElementType} />}
                />
            )}
          </HStack>
        </Flex>

        {/* Auth Modal */}
        <AuthModal
            isOpen={isAuthModalOpen}
            onClose={handleCloseAuthModal}
            onLogin={handleLogin}
            onSignUp={handleSignUp}
            onGoogleLogin={handleGoogleLogin}
            isForgotPassword={showForgotPassword}
            onForgotPassword={handleForgotPasswordClick}
            onBackToLogin={() => setShowForgotPassword(false)}
        />
      </>
  );
};

export default Navbar;
