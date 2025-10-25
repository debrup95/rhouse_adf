/**
 * List of verified in-network buyers
 * These buyers have direct communication channels and verified contact information
 */
export const IN_NETWORK_BUYERS = [
  '901 2 0 Llc',
  '901 20 Llc',
  '901-2 0 Llc',
  '901-20 Llc',
  '510 Sfr Tn Operations I Llc',
  'Amazing Real Estate Llc',
  'Amber Sunrise Llc',
  'Armm Asset Company 2 Llc',
  'Armm Asset Company Llc',
  'Armm Assets 2 Llc',
  'Armm Assets Company 2 Llc',
  'Armm Assett Company 2 Llc',
  'Baf 4 Llc',
  'Bellheir Properties Llc',
  'Blu Artic Properties & Investments Llc',
  'Borrums Investment Group Llc',
  'Breding Capital Group Llc',
  'Bynum Realtor Llc',
  'CDJ REAL ESTATE LLC',
  'Chhoda Real Estate Llc',
  'Chickasaw Ventures Llc',
  'Claus Llc',
  'Comfort Home Solutions Llc',
  'Crawfish Capital Llc',
  'Edmondson Rentals Ii Llc',
  'Estate Ventures Llc',
  'Fairmont Enterprises Llc',
  'Fam Capital Llc',
  'Flipin Crazy Llc',
  'Flippros Llc',
  'Fof Tn Llc',
  'Forefront One Llc',
  'Freedom Operation Properties Llc',
  'Freo Progress Llc',
  'Gbi Contractors Inc',
  'Gold Star Homes Llc',
  'Goldstar Homes Llc',
  'Good Samaritan Investment Llc',
  'Hannah Thomas Llc',
  'Hillside Palms Llc',
  'Hometown Investment Group Llc',
  'Inkan Investors Gp',
  'INTERNATIONAL IMMOBILLIARE LLC',
  'Ithaka Holdings Llc',
  'Ithaka Holdings aka Vb & Associates Llc',
  'Investor Nation Residential Capital Llc',
  'Jc Restoration Co Llc',
  'Jrc Investment Corporation',
  'Jrc Investments Llc',
  'Kcl Property Solutions Llc',
  'Keys For Equity Llc',
  'Knight Growth Investments Llc',
  'Lamco Tn Asset Company 1 Llc',
  'Llacg Community Investment Fund',
  'Lrg Investment Properties Llc',
  'Marvin Garden Llc',
  'Marvins Garden Llc',
  'Mclemore Home Builders Llc',
  'Mclp Asset Company Inc',
  'Mdm Investments Of Memphis Llc',
  'Memphis Acquisitions Llc',
  'Memphis Inv Properties Iv Llc',
  'Memphis Investment Houses Llc',
  'Memphis Investment Properties Iv',
  'Memphis Investment Properties Iv Llc',
  'Memphis Investments Properties Iv Llc',
  'Memphis Passive 1 Llc',
  'Memphis Passive 15 Llc',
  'Memphis Passive 26 Llc',
  'Memphis Passive X Llc',
  'Memphis Peony Investments Llc',
  'Memphis Re 3 Llc',
  'Memphis Turnkey Properties Gp',
  'Mid South Home Buyers Llc',
  'Mid South Homebuyers Llc',
  'Mid South Homebuyers Gp',
  'Mid-South Homebuyers Inc',
  'Mid-South Homebuyers Llc',
  'Midsouth Home Buyers Gp',
  'Midsouth Realty Group Llc',
  'Muddy River Properties Llc',
  'Mw Prime Holdings Llc',
  'Nation Home Offer Llc',
  'Octopus Group Inc',
  'Osd Sec 8 Llc',
  'PASSIVE SUNSHINE 1 LLC',
  'Payne Premier Properties Llc',
  'Pcv 1 Llc',
  'Pegasus Real Estate Services Llc',
  'Pena And Son Llc',
  'Pmw Properties Llc',
  'Quick Offer For Homes Llc',
  'RBS HOLDINGS LLC',
  'Rcon Consulting Llc',
  'Real Asset Development Llc',
  'Real Asset Invest Llc',
  'Rebuilt Offers Llc',
  'Relentless Holdings Llc',
  'Rev Investments Llc',
  'Rhsg Ventures Llc',
  'Rmp Investments Llc',
  'Rs Rental Iii-B Llc',
  'Sciential Holdings Llc',
  'Sfr Mem Llc',
  'SHAUNYS PROPERTY LLC',
  'Skelton Properties Llc',
  'Smittys Investments Llc',
  'Spyder Investments Llc',
  'Sundial Investment Company Llc',
  'Tennessee Housing Development Agency',
  'Tnmem 2 Llc',
  'Torres Investments Llc',
  'Triton Rei Group Llc',
  'Ufif Llc',
  'Vogg Properties Llc',
  'Volunteer Homes Llc',
  'Waystar Holdings Llc',
  'Yai Real Estate Llc',
  'Yamasa Co Ltd',
  'Zzs Memphis Llc'
];

/**
 * Utility function to check if a buyer is in the in-network list
 * Uses case-insensitive comparison and handles variations in company name formatting
 * @param buyerName - The name of the buyer to check
 * @returns boolean - True if the buyer is in-network
 */
export const isInNetworkBuyer = (buyerName: string): boolean => {
  if (!buyerName) return false;
  
  const normalizedBuyerName = buyerName.toLowerCase().trim();
  
  return IN_NETWORK_BUYERS.some(networkBuyer => 
    networkBuyer.toLowerCase().trim() === normalizedBuyerName
  );
};

/**
 * Get the count of in-network buyers from a list of buyers
 * @param buyers - Array of buyers with name property
 * @returns number - Count of in-network buyers
 */
export const getInNetworkBuyersCount = (buyers: { name: string }[]): number => {
  return buyers.filter(buyer => isInNetworkBuyer(buyer.name)).length;
};