import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Color palette based on screenshot
const colors = {
  // Main colors
  brand: {
    500: '#104911', // Brand color from screenshot
  },
  text: {
    primary: '#222222',    // Text primary from screenshot
    secondary: '#777777',  // Text secondary from screenshot
    onColor: '#FFFFFF',    // Text on color from screenshot
  },
  tag: {
    light: '#DCFCE9',      // Light Tags from screenshot
  },
  background: {
    primary: '#FFFFFF',    // Background primary from screenshot
    secondary: '#F6F6F6',  // Background secondary from screenshot
  },
  border: {
    primary: '#E6EAEF',    // Border primary from screenshot
    secondary: '#E6EAEF',  // Border secondary from screenshot
  },
  status: {
    sold: {
      text: '#DE4F62',     // SOLD Text from screenshot
      bg: '#FFEAED',       // SOLD Box Fill from screenshot
    },
    rental: {
      text: '#44658F',     // RENTAL Text from screenshot
      bg: '#C1DCFF',       // RENTAL Box Fill from screenshot
    },
  },
  // Gradients from screenshot
  gradients: {
    green: {
      start: '#b6e78d',
      end: '#0a3c34',
    },
    yellow: {
      start: '#ffe459',
      end: '#f7941e',
    },
  },
  // Stepper colors
  stepper: {
    completed: '#104911',
    active: '#104911',
    pending: '#718096',
    checkmark: '#FFFFFF',
    activeBg: '#DCFCE9',
    completedBg: '#104911',
  },
};

// Typography from screenshot
const fonts = {
  heading: "'Canva Sans', sans-serif",
  body: "'Canva Sans', sans-serif",
};

// Font sizes and styles based on screenshot
const textStyles = {
  'heading-large': {
    fontSize: '38px',
    fontWeight: 'bold',
  },
  'sub-heading-medium': {
    fontSize: '26px',
    fontWeight: 'normal',
  },
  'body-small': {
    fontSize: '22px',
    fontWeight: 'normal',
  },
};

// Component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'lg',
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'text.onColor',
        _hover: {
          bg: 'brand.500',
          opacity: 0.9,
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        },
        transition: 'all 0.2s ease-in-out',
      },
      outline: {
        borderColor: 'brand.500',
        color: 'brand.500',
        _hover: {
          bg: 'rgba(16, 73, 17, 0.1)',
          transform: 'translateY(-2px)',
          boxShadow: 'md',
        },
        transition: 'all 0.2s ease-in-out',
      },
    },
  },
  Tag: {
    variants: {
      subtle: {
        container: {
          bg: 'tag.light',
          color: 'brand.500',
        },
      },
      sold: {
        container: {
          bg: 'status.sold.bg',
          color: 'status.sold.text',
        },
      },
      rental: {
        container: {
          bg: 'status.rental.bg',
          color: 'status.rental.text',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'background.primary',
        borderRadius: 'lg',
        boxShadow: 'lg',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        _hover: {
          transform: 'translateY(-4px)',
          boxShadow: 'xl',
        },
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'md',
        borderColor: 'border.primary',
      },
    },
  },
  Stepper: {
    baseStyle: {
      step: {
        color: 'text.secondary',
      },
      indicator: {
        borderColor: 'stepper.pending',
        bgColor: 'transparent',
        _active: {
          bgColor: 'stepper.activeBg',
          borderColor: 'stepper.active',
          color: 'stepper.active',
        },
        _completed: {
          bgColor: 'stepper.completedBg',
          borderColor: 'stepper.completed',
          color: 'stepper.checkmark',
        },
      },
      separator: {
        bgColor: 'stepper.pending',
        _active: {
          bgColor: 'stepper.active',
        },
        _completed: {
          bgColor: 'stepper.completed',
        },
      },
    },
  },
  Slider: {
    baseStyle: {
      thumb: {
        bg: 'brand.500',
      },
      track: {
        bg: 'gray.200',
      },
      filledTrack: {
        bg: 'brand.500',
      },
    },
  },
  Table: {
    baseStyle: {
      th: {
        borderBottom: '1px',
        borderColor: 'border.primary',
      },
      td: {
        borderBottom: '1px',
        borderColor: 'border.primary',
      },
      tbody: {
        tr: {
          _hover: {
            bg: 'gray.50',
          },
        },
      },
    },
  },
};

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({ 
  config,
  colors,
  fonts,
  textStyles,
  components,
  styles: {
    global: {
      body: {
        bg: 'background.secondary',
        color: 'text.primary',
      },
      // Custom css for gradients
      '.green-gradient': {
        background: 'linear-gradient(to bottom, #b6e78d, #0a3c34)',
      },
      '.yellow-gradient': {
        background: 'linear-gradient(to top, #ffe459, #f7941e)',
      },
      // Stepper styles
      '.stepper-completed': {
        bgColor: 'stepper.completed',
        borderColor: 'stepper.completed',
        color: 'stepper.checkmark',
      },
      '.stepper-active': {
        bgColor: 'stepper.activeBg',
        borderColor: 'stepper.active',
        color: 'stepper.active',
      },
      '.stepper-pending': {
        bgColor: 'transparent',
        borderColor: 'stepper.pending',
        color: 'text.secondary',
      },
    },
  },
});

export default theme; 