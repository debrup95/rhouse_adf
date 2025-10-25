import React from 'react';
import { Box } from '@chakra-ui/react';
import Navbar from './components/Navbar';
import MarketplaceSection from './components/MarketplaceSection';
import StatsSection from './components/StatsSection';
import AboutFounder from './components/AboutFounder';
import Footer from './components/Footer';

const LandingPage = () => {
  return (
    <Box>
      <MarketplaceSection />
      <StatsSection />
      <AboutFounder /> 
    </Box>
  );
};

export default LandingPage; 