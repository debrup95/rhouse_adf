// import React from 'react';
// import { Box, Heading, Text, HStack, Button, useColorModeValue } from '@chakra-ui/react';
// import { FaArrowLeft } from 'react-icons/fa';
//
// interface OffersStepProps {
//     onBack: () => void;
// }
//
// const OffersStep: React.FC<OffersStepProps> = ({ onBack }) => {
//     return (
//         <Box w="100%" mt={8}>
//             <Heading size="lg" mb={4} color={useColorModeValue('gray.800', 'white')}>
//                 Offers
//             </Heading>
//             <Text>Offers will be displayed here.</Text>
//             <HStack mt={6} w="100%">
//                 <Button variant="outline" onClick={onBack} flex="1" leftIcon={<FaArrowLeft />}>
//                     Back
//                 </Button>
//                 <Button colorScheme="teal" flex="2" onClick={() => alert('Proceed to next step')}>
//                     Next
//                 </Button>
//             </HStack>
//         </Box>
//     );
// };
//
// export default OffersStep;
import React from 'react';
import { Box, Heading, Text, HStack, Button, useColorModeValue } from '@chakra-ui/react';
import { ArrowLeftIcon } from '@chakra-ui/icons';

interface OffersStepProps {
    onBack: () => void;
}

const OffersStep: React.FC<OffersStepProps> = ({ onBack }) => {
    return (
        <Box w="100%" mt={8}>
            <Heading size="lg" mb={4} color={useColorModeValue('gray.800', 'white')}>
                Offers
            </Heading>
            <Text>Offers will be displayed here.</Text>
            <HStack mt={6} w="100%">
                <Button variant="outline" onClick={onBack} flex="1" leftIcon={<ArrowLeftIcon />}>
                    Back
                </Button>
                <Button colorScheme="teal" flex="2" onClick={() => alert('Proceed to next step')}>
                    Next
                </Button>
            </HStack>
        </Box>
    );
};

export default OffersStep;
