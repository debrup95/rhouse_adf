import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

interface TennesseeBannerProps {
  onNotifyClick: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

const TennesseeBanner: React.FC<TennesseeBannerProps> = ({
  onNotifyClick,
  onDismiss,
  isVisible,
}) => {
  const bgColor = useColorModeValue('brand.500', 'brand.600');
  const textColor = 'white';
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md' });
  const fontSize = useBreakpointValue({ base: 'sm', md: 'md' });
  const padding = useBreakpointValue({ base: 2, md: 3 });

  if (!isVisible) return null;

  return (
    <Box
      width="100%"
      bg={bgColor}
      color={textColor}
      borderRadius="lg"
      transition="all 0.3s ease"
    >
      <Flex
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        py={padding}
        maxW="100%"
        mx="auto"
      >
        <Text
          fontSize={fontSize}
          fontWeight="medium"
          textAlign={{ base: 'center', md: 'left' }}
          flex={1}
        >
          Now live in Tennessee • Expanding to more states soon.
        </Text>

        <Flex align="center" gap={3}>
          <Button
            size={buttonSize}
            variant="outline"
            colorScheme="whiteAlpha"
            border="1px solid"
            borderColor="white"
            color="white"
            bg="transparent"
            _hover={{
              bg: 'whiteAlpha.200',
              borderColor: 'white',
            }}
            _active={{
              bg: 'whiteAlpha.300',
            }}
            onClick={onNotifyClick}
            fontWeight="medium"
            px={{ base: 4, md: 6 }}
          >
            Get notified
          </Button>

          <IconButton
            aria-label="Dismiss banner"
            icon={<CloseIcon />}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{
              bg: 'whiteAlpha.200',
            }}
            onClick={onDismiss}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default TennesseeBanner;
