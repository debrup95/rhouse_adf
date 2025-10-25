import React, { ReactNode } from 'react';
import CommonModal from './CommonModal';

interface BlurredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
    isCentered?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
}

const BlurredModal: React.FC<BlurredModalProps> = ({
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
    return (
        <CommonModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            footer={footer}
            size={size}
            isCentered={isCentered}
            closeOnOverlayClick={closeOnOverlayClick}
            closeOnEsc={closeOnEsc}
        >
            {children}
        </CommonModal>
    );
};

export default BlurredModal;