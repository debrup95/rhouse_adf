// import React from 'react';
// import { Box, Heading, InputGroup, Button, useColorModeValue } from '@chakra-ui/react';
// import PlaceAutocompleteInput, { AddressComponents } from '../../../address/componenents/PlaceAutocompleteInput';
//
// interface AddressInputStepProps {
//     addressInput: string;
//     setAddressInput: React.Dispatch<React.SetStateAction<string>>;
//     selectedAddress: AddressComponents | null;
//     setSelectedAddress: React.Dispatch<React.SetStateAction<AddressComponents | null>>;
//     onNext: () => void;
// }
//
// const AddressInputStep: React.FC<AddressInputStepProps> = ({
//                                                                addressInput,
//                                                                setAddressInput,
//                                                                selectedAddress,
//                                                                setSelectedAddress,
//                                                                onNext,
//                                                            }) => {
//     return (
//         <Box w="100%">
//             <Heading size="lg" mb={4} color={useColorModeValue('gray.800', 'white')}>
//                 Instant Offer Estimate
//             </Heading>
//             <InputGroup size="md">
//                 <PlaceAutocompleteInput
//                     value={addressInput}
//                     onChange={setAddressInput}
//                     onSelectAddress={(addr) => {
//                         setSelectedAddress(addr);
//                         setAddressInput(addr.formattedAddress);
//                     }}
//                 />
//             </InputGroup>
//             <Button colorScheme="teal" mt={4} onClick={onNext} isDisabled={!selectedAddress}>
//                 Get Your Offer
//             </Button>
//         </Box>
//     );
// };
//
// export default AddressInputStep;
import React from 'react';
import {Box, Heading, InputGroup, InputRightElement, Button, useColorModeValue, HStack, VStack} from '@chakra-ui/react';
import PlaceAutocompleteInput, { AddressComponents } from '../../../address/componenents/PlaceAutocompleteInput';

interface AddressInputStepProps {
    addressInput: string;
    onAddressChange: (val: string) => void;
    onAddressSelect: (addr: AddressComponents) => void;
    onNext: () => void;
}

const AddressInputStep: React.FC<AddressInputStepProps> = ({ addressInput, onAddressChange, onAddressSelect, onNext }) => {
    return (
        <Box w="100%">
            <Heading size="lg" mb={4} color={useColorModeValue('gray.800', 'white')}>
                Instant Offer Estimate
            </Heading>
                <VStack mt={6}>
                    <PlaceAutocompleteInput value={addressInput} onChange={onAddressChange} onSelectAddress={onAddressSelect} />
                    <Button
                        colorScheme="teal"
                        w="full"
                        onClick={onNext}
                        isDisabled={!addressInput}
                    >
                        Select Condition of Property
                    </Button>
                </VStack>
        </Box>
    );
};

export default AddressInputStep;
