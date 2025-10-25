import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Icon,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FaHome } from "react-icons/fa";

const MESSAGES = [
  "Pulling fresh comp data…",
  "Crunching rehab costs…",
  "Underwriting home value…",
  "Matching new investors…",
  "Running final QC checks…",
  "Almost there…"
];

// Define the spinning animation
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export function LoadingModal({ visible = false }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <Box
              bg="white"
              borderRadius="2xl"
              boxShadow="2xl"
              p={8}
              w="320px"
              textAlign="center"
            >
              <Flex direction="column" align="center" gap={6}>
                {/* Spinner with House Icon */}
                <Box position="relative" h="100px" w="100px">
                  {/* Outer spinning rays */}
                  <Box
                    position="absolute"
                    top="-16px"
                    left="-16px"
                    right="-16px"
                    bottom="-16px"
                    animation={`${spin} 2s linear infinite`}
                  >
                    <svg
                      width="132"
                      height="132"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: '#94A3B8' }}
                    >
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="M4.93 4.93l2.83 2.83" />
                      <path d="M16.24 16.24l2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                      <path d="M4.93 19.07l2.83-2.83" />
                      <path d="M16.24 7.76l2.83-2.83" />
                    </svg>
                  </Box>
                  
                  {/* Center house icon */}
                  <Box
                    position="absolute"
                    top="20px"
                    left="16px"
                    right="16px"
                    bottom="12px"
                  >
                    <Icon
                      as={FaHome as React.ElementType}
                      w="48px"
                      h="48px"
                      color="brand.500"
                    />
                  </Box>
                </Box>

                {/* Message */}
                <Text
                  fontSize="sm"
                  color="gray.600"
                  minH="24px"
                  fontWeight="medium"
                >
                  {MESSAGES[msgIndex]}
                </Text>
              </Flex>
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Demo wrapper for Canvas preview ---------- */
export default function Demo() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // auto-hide after 18s so preview doesn't get stuck
    const id = setTimeout(() => setVisible(false), 18000);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <Box
        position="fixed"
        top="16px"
        right="16px"
        zIndex={1500}
      >
        <Box
          as="button"
          bg="brand.500"
          color="white"
          px={4}
          py={2}
          borderRadius="xl"
          boxShadow="md"
          onClick={() => setVisible(true)}
          _hover={{ bg: "brand.600" }}
        >
          Show LoadingModal
        </Box>
      </Box>
      <LoadingModal visible={visible} />
    </>
  );
}
