import React, { ReactNode } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
} from '@chakra-ui/react';

export interface CommonModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
    isCentered?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
}

const CommonModal: React.FC<CommonModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    isCentered = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
}) => {
    // Using theme colors directly
    const bgColor = 'background.primary'; // white from our theme
    const textColor = 'text.primary'; // gray.800 from our theme
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            isCentered={isCentered}
            size={size}
            closeOnOverlayClick={closeOnOverlayClick}
            closeOnEsc={closeOnEsc}
            motionPreset="slideInBottom"
        >
            <ModalOverlay 
                bg="blackAlpha.300"
                backdropFilter="blur(8px)"
            />
            <ModalContent 
                bg={bgColor}
                color={textColor}
                borderRadius="xl"
                boxShadow="xl"
                p={4}
                mx={4}
                maxW={size === 'xl' ? '80vw' : undefined}
            >
                {title && (
                    <ModalHeader
                        fontWeight="semibold"
                        textAlign="center"
                        pb={2}
                    >
                        {title}
                    </ModalHeader>
                )}
                <ModalCloseButton size="lg" />
                <ModalBody px={5} py={4}>
                    {children}
                </ModalBody>
                {footer && (
                    <ModalFooter>
                        {footer}
                    </ModalFooter>
                )}
            </ModalContent>
        </Modal>
    );
};

export default CommonModal;