import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure
} from '@chakra-ui/react';
import SellerReport from './SellerReport';

interface SellerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportStrategy?: 'rent' | 'flip';
  presetValues?: Record<string, number>;
  selectedComps?: string[];
  onResetComps?: () => void; // New prop to reset comp selections
  // For sharing functionality
  estimateData?: {
    selectedAddress?: any;
    addressState?: any;
    property?: any;
    rentUnderwriteValues?: any;
    flipUnderwriteValues?: any;
    offerRangeLow?: number;
    offerRangeHigh?: number;
  };
}

const SellerReportModal: React.FC<SellerReportModalProps> = ({ isOpen, onClose, reportStrategy, presetValues, selectedComps, onResetComps, estimateData }) => {
  return (
    <>
      {/* Print-specific CSS to hide modal elements */}
      <style>
        {`
          @media print {
            /* Hide modal header and close button */
            .modal-header-print-hide {
              display: none !important;
            }
            .modal-close-button-print-hide {
              display: none !important;
            }
            
            /* Hide modal overlay and other modal elements */
            .chakra-modal__overlay {
              display: none !important;
            }
            
            /* Ensure modal content prints cleanly */
            .chakra-modal__content {
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              max-width: none !important;
              border-radius: 0 !important;
              position: static !important;
              transform: none !important;
            }
            
            .chakra-modal__body {
              padding: 0 !important;
              overflow: visible !important;
            }
            
            /* Prevent content duplication */
            .chakra-modal__content {
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            
            /* Ensure single page layout */
            .chakra-modal__body > * {
              page-break-inside: avoid !important;
            }
            /* Prevent content duplication */
            .chakra-modal__content {
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            /* Ensure no duplicate modal content */
            .chakra-modal__content {
              position: relative !important;
              z-index: 1 !important;
            }
            /* Hide any potential duplicate modal content */
            .chakra-modal__content + .chakra-modal__content,
            .chakra-modal__content ~ .chakra-modal__content {
              display: none !important;
            }
            /* Force single page printing */
            @page {
              size: auto;
              margin: 0.5in;
            }
            
            /* General print optimizations */
            body { 
              background: white !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}
      </style>
      
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onResetComps?.(); // Reset comp selections when modal closes
          onClose();
        }}
        size="full"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent
          maxW="100vw"
          maxH="100vh"
          margin={0}
          borderRadius={0}
        >
          <ModalHeader
            borderBottom="1px solid"
            borderColor="gray.200"
            padding={4}
            className="modal-header-print-hide"
          >
            Seller Report
          </ModalHeader>
          <ModalCloseButton className="modal-close-button-print-hide" marginRight={2}/>
          <ModalBody padding={0}>
            <SellerReport reportStrategy={reportStrategy} presetValues={presetValues} selectedComps={selectedComps} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SellerReportModal;
