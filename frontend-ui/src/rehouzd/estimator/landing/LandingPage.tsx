import { Box } from '@chakra-ui/react';
import Hero from './components/Hero';
import ClearPathSection from './components/ClearPathSection';
import FAQ from './components/FAQ';
import PriceAndSellSection from './components/PriceAndSellSection';

interface LandingPageProps {
  isLoggedIn: boolean;
  onAuthOpen: (plan?: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ isLoggedIn, onAuthOpen }) => {
  
  const heroStyle = {
    background: 'linear-gradient(to right,rgb(4, 32, 3),rgb(18, 80, 19))',
    minHeight: '100vh',
    width: '100%',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    paddingTop: '2rem',
    paddingBottom: '4rem',
  };

  return (
    <Box sx={heroStyle} minH="100vh" w="100%">
      <Hero isLoggedIn={isLoggedIn} onAuthOpen={onAuthOpen}/>
      <br />
      <br />
      <ClearPathSection />
      <FAQ />
      <PriceAndSellSection isLoggedIn={isLoggedIn} onAuthOpen={onAuthOpen} />
    </Box>
  );
};

export default LandingPage; 
