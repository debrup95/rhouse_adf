import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FaFileContract, FaCheck } from 'react-icons/fa';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const brandColor = useColorModeValue('brand.500', 'brand.300');

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent 
        maxH="90vh"
        onWheel={(e) => e.stopPropagation()} // Fix scrolling by preventing event interference
      >
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={FaFileContract as React.ElementType} color={brandColor} />
            <Text>Terms & Conditions</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody 
          overflowY="auto"
          sx={{
            scrollBehavior: 'smooth',
            msOverflowStyle: 'auto',
            touchAction: 'pan-y',
          }}
        >
            <Box
            overflowY="auto"
            maxH="500px"
            minH="400px"
            px={4}
            py={2}
            >
            <VStack spacing={6} align="stretch">
            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                1. Acceptance of These Terms
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                By creating an account, completing a purchase, or otherwise using Rehouzed inc's DBA Rehouzd skip‑tracing services (the "Service"), you ("User," "you") accept and agree to be bound by these Terms & Conditions ("Terms") and our Privacy Policy. If you do not agree, do not access or use the Service.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                2. Scope of the Service
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                Rehouzed, Inc. DBA Rehouzd ("Rehouzed inc" "Rehouzd," "we," "us") provides access to contact information associated with individuals and a broad range of entity types including limited‑liability companies (LLCs), general partnerships (GPs), trusts, corporations, and other organizations that own or control real‑estate assets. The Service:
              </Text>
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm" lineHeight="1.6">
                  • Delivers phone numbers, email addresses, mailing addresses, and other data ("Skip‑Trace Data") as‑is and as‑available.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • May supply records previously obtained and stored in Rehouzed inc's database, rather than querying the original third‑party data provider each time.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • Rehouzed inc reserves the right, at any time and in its sole discretion, to delete or archive Skip‑Trace Data (including but not limited to information it deems stale); if data are removed, Users may need to re‑purchase updated records to regain access.
                </Text>
              </VStack>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                3. No Consumer‑Reporting Agency; Restricted Uses
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Rehouzed inc is not a "consumer‑reporting agency" under the U.S. Fair Credit Reporting Act ("FCRA") and does not furnish "consumer reports." You agree not to use Skip‑Trace Data for any FCRA‑regulated purpose, including credit, employment, tenant, insurance, or similar eligibility determinations.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                4. User Compliance Warranty
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                You represent and warrant that you will:
              </Text>
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Telephone Consumer Protection Act ("TCPA") & Do‑Not‑Call</strong> - obtain prior express consent where required, honor all state and federal DNC registries, and observe time‑of‑day restrictions.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>CAN‑SPAM / state email laws</strong> — include accurate headers, truthful subject lines, and functional opt‑out links in all commercial email.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>State privacy laws</strong> (e.g., CCPA/CPRA, VCDPA, CPA, GDPR where applicable) - establish a lawful basis for processing personal data and honor requests for access, deletion, and opt‑out.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Licensing</strong> — secure any investigative, brokerage, or telemarketing licenses required in your jurisdiction.
                </Text>
              </VStack>
              <Text fontSize="sm" lineHeight="1.6" mt={3}>
                You will defend, indemnify, and hold harmless Rehouzed inc from any third‑party claim, fine, or penalty arising out of your breach of this Section or applicable law.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                5. Pricing, Credits, and Payment Processing
              </Text>
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Price:</strong> US $0.15 per Skip‑Trace Data record.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Minimum Purchase:</strong> US $3.75 (25 credits) per transaction; credits are deducted at $0.15 each as you consume records.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Credit Expiration:</strong> Unused credits expire 6 months after the purchase date and are non‑refundable.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Processor:</strong> All payments are handled by Stripe, Inc. Rehouzed inc never stores complete payment‑card details.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Taxes:</strong> Prices may include or exclude taxes; you are responsible for paying all applicable taxes, duties, and other governmental levies associated with your purchase.
                </Text>
              </VStack>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                6. Intellectual Property & Data License
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.1 License to User</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                Upon purchase, Rehouzed inc grants you a limited, non‑exclusive, non‑transferable, revocable license to download and use Skip‑Trace Data solely for lawful business outreach.
              </Text>
              
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.2 Rehouzed inc Ownership and Resale Rights</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                All Skip‑Trace Data, enhancements, and Rehouzed inc's database are and remain Rehouzed inc's intellectual property. Rehouzed inc may re‑license or resell any Skip‑Trace Data, including records previously delivered to you.
              </Text>
              
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.3 User‑Supplied Inputs</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                You grant Rehouzed inc a worldwide, perpetual, royalty‑free license to use, copy, modify, and create derivative works from any property addresses or other inputs you supply to the Service for the purpose of operating and improving the platform.
              </Text>
              
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.4 Account Security & Unauthorized Use</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                You are responsible for maintaining the confidentiality of all login credentials associated with your account and for all activities that occur under those credentials. You must immediately notify Rehouzed inc of any suspected unauthorized use. Rehouzed inc may investigate and pursue any remedy including suspension or termination if unauthorized access is suspected. You remain liable for all fees incurred through your account, even if caused by unauthorized use.
              </Text>
              
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.5 Prohibited Uses & Restrictions</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                You agree that you will not (a) resell, sublicense, distribute, or otherwise make Skip‑Trace Data available to any third party (except as expressly permitted in these Terms); (b) create derivative products or datasets intended for commercial resale; (c) use Skip‑Trace Data to train machine‑learning models or other automated decision systems; (d) reverse‑engineer, decompile, or otherwise attempt to derive the source of any Rehouzed inc software or database; or (e) use the Service in any manner that violates applicable law or infringes any third‑party right.
              </Text>
              
              <Text fontSize="sm" lineHeight="1.6" mb={3}>
                <strong>6.6 Record Retention; No Obligation</strong>
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Rehouzed inc may maintain logs of your queries and deliveries for compliance purposes, but has no obligation to retain such records beyond its internal retention schedule and may delete them at any time.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                7. Refunds
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Except as expressly required by applicable law, all fees and credits are non‑refundable once purchased, including any unused or expired credits.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                8. Force Majeure
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Rehouzed inc will not be liable for any delay or failure to perform resulting from events beyond its reasonable control, including natural disasters, war, terrorism, civil unrest, government action, labor disputes, internet or telecommunications failures, or other force‑majeure events.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                9. Disclaimer of Results
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Rehouzed inc makes no representation or warranty that your use of the Service will result in any particular level of business opportunities, revenue, or other outcomes.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                10. General Disclaimers. Limitation of Liability
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, REHOUZED INC TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) US $100 OR (B) THE AMOUNT YOU PAID TO REHOUZED INC IN THE SIX (6) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. IN NO EVENT WILL REHOUZED INC BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                11. Suspension & Termination
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                Rehouzed inc may suspend or terminate your account, along with any unused credits, if you breach these Terms, violate applicable law, initiate charge‑backs, or otherwise create regulatory or security risk for the platform.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                12. Modifications to the Service or Terms
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                We may update the Service or these Terms at any time. All changes take effect immediately upon posting or other notice (including email or in‑app notification). Your continued use constitutes acceptance of the revised Terms.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                13. Dispute Resolution; Class‑Action Waiver
              </Text>
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Binding Arbitration.</strong> All disputes will be resolved by final, binding arbitration before the American Arbitration Association (AAA) under its Commercial Arbitration Rules.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Venue & Governing Law.</strong> The arbitration will occur in Austin, Texas and be governed by Delaware and applicable U.S. federal law without regard to conflict‑of‑law rules.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Class‑Action Waiver.</strong> Disputes must be arbitrated individually; you and Rehouzed inc waive any right to litigate or arbitrate claims as a class or representative action.
                </Text>
              </VStack>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" fontSize="lg" mb={3}>
                14. General Provisions
              </Text>
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Entire Agreement.</strong> These Terms and the Privacy Policy constitute the entire agreement between the parties.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Severability.</strong> If any provision is held unenforceable, the remainder will remain in effect.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Force Majeure.</strong> Rehouzed inc is not liable for delays or failures caused by events beyond its reasonable control.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Assignment.</strong> Rehouzed inc may assign these Terms; you may not assign them without prior written consent.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>No Waiver.</strong> Failure to enforce any right is not a waiver of future enforcement.
                </Text>
                <Text fontSize="sm" lineHeight="1.6">
                  • <strong>Survival.</strong> Sections 3–13 survive termination.
                </Text>
              </VStack>
            </Box>

            <Divider />

            <Box textAlign="center" p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Questions?
              </Text>
              <Text fontSize="sm" color="blue.600">
                Contact us at Deal@rehouzd.com
              </Text>
            </Box>
          </VStack>
          </Box>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="brand" 
              leftIcon={<Icon as={FaCheck as React.ElementType} />}
              onClick={handleAccept}
            >
              I Accept Terms & Conditions
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TermsAndConditionsModal; 