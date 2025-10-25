import React from 'react';
import {
  Button as ChakraButton,
  ButtonProps,
  Icon,
} from '@chakra-ui/react';

interface EnhancedButtonProps extends ButtonProps {
  hasArrow?: boolean;
}

// Create a simplified enhanced button that extends Chakra UI's button
const Button = ({ 
  hasArrow = false, 
  children, 
  colorScheme = 'brand',
  variant,
  ...rest 
}: EnhancedButtonProps) => {
  // Only set default colorScheme for non-ghost/outline variants
  const finalColorScheme = 
    (variant === 'ghost' || variant === 'outline') 
      ? colorScheme 
      : (colorScheme || 'brand');
  
  // Arrow icon component
  const ArrowIcon = () => (
    <Icon viewBox="0 0 24 24" ml={2} w={4} h={4}>
      <path
        fill="currentColor"
        d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"
        transform="rotate(-90 12 12)"
      />
    </Icon>
  );

  return (
    <ChakraButton
      colorScheme={finalColorScheme}
      variant={variant}
      rightIcon={hasArrow ? <ArrowIcon /> : undefined}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
      }}
      _active={{
        transform: 'translateY(0)',
        boxShadow: 'sm',
      }}
      {...rest}
    >
      {children}
    </ChakraButton>
  );
};

export default Button; 