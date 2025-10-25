import React, { ReactNode } from 'react';
import {
  Box,
  Flex,
  FlexProps,
  Text,
  Heading,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface CardProps extends FlexProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  isInteractive?: boolean;
  withHover?: boolean;
  withShadow?: boolean;
  height?: string | object;
}

export const Card = ({
  children,
  title,
  subtitle,
  isInteractive = true,
  withHover = true,
  withShadow = true,
  height,
  ...rest
}: CardProps) => {
  // Define constant theme colors
  const bgColor = 'background.primary';
  const borderColor = 'border.primary';
  const headingColor = 'text.primary';
  const subtitleColor = 'text.secondary';

  return (
    <MotionBox
      whileHover={
        withHover && isInteractive
          ? { y: -5, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }
          : {}
      }
      transition={{ duration: 0.3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Flex
        direction="column"
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        overflow="hidden"
        boxShadow={withShadow ? 'md' : 'none'}
        height={height}
        {...rest}
      >
        {(title || subtitle) && (
          <Box p={6} pb={subtitle ? 2 : 6}>
            {title && (
              <Heading as="h3" size="md" color={headingColor} mb={subtitle ? 1 : 0}>
                {title}
              </Heading>
            )}
            {subtitle && (
              <Text fontSize="sm" color={subtitleColor}>
                {subtitle}
              </Text>
            )}
          </Box>
        )}
        {children}
      </Flex>
    </MotionBox>
  );
};

export default Card; 